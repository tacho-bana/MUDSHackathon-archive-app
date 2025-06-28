import { WebClient } from '@slack/web-api';
import { getDatabase } from '../models/database';
import { promisify } from 'util';
import crypto from 'crypto';

export class SlackService {
  private client: WebClient | null = null;
  private workspaceId: string | null = null;

  constructor(accessToken?: string) {
    if (accessToken) {
      this.client = new WebClient(accessToken);
    }
  }

  async authenticate(code: string): Promise<{ workspaceId: string; accessToken: string }> {
    const tempClient = new WebClient();
    
    const response = await tempClient.oauth.v2.access({
      client_id: process.env.SLACK_CLIENT_ID!,
      client_secret: process.env.SLACK_CLIENT_SECRET!,
      code: code,
      redirect_uri: process.env.SLACK_REDIRECT_URI!,
    });

    if (!response.ok || !response.access_token) {
      throw new Error('Slack authentication failed');
    }

    const accessToken = response.access_token as string;
    const teamInfo = response.team as any;
    
    this.client = new WebClient(accessToken);
    this.workspaceId = teamInfo.id;

    const db = getDatabase();
    const run = promisify(db.run.bind(db));

    await run(
      `INSERT OR REPLACE INTO workspaces 
       (id, name, domain, access_token, auto_sync_enabled, sync_frequency) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [teamInfo.id, teamInfo.name, teamInfo.domain, accessToken, 1, 'daily']
    );

    return { workspaceId: teamInfo.id, accessToken };
  }

  async getChannels(): Promise<any[]> {
    if (!this.client) throw new Error('Slack client not initialized');

    const channels = [];
    let cursor = '';

    do {
      const response = await this.client.conversations.list({
        types: 'public_channel,private_channel',
        limit: 100,
        cursor: cursor || undefined,
      });

      if (response.channels) {
        channels.push(...response.channels);
      }

      cursor = response.response_metadata?.next_cursor || '';
    } while (cursor);

    return channels;
  }

  async getMessages(channelId: string, oldest?: string): Promise<any[]> {
    if (!this.client) throw new Error('Slack client not initialized');

    const messages = [];
    let cursor = '';

    try {
      do {
        const response = await this.client.conversations.history({
          channel: channelId,
          limit: 100,
          cursor: cursor || undefined,
          oldest: oldest,
        });

        if (response.messages) {
          messages.push(...response.messages);
        }

        cursor = response.response_metadata?.next_cursor || '';
      } while (cursor);
    } catch (error: any) {
      if (error.data?.error === 'not_in_channel') {
        console.log(`⚠️  Bot not in channel ${channelId}, skipping...`);
        return [];
      }
      throw error;
    }

    return messages.reverse();
  }

  async getUsers(): Promise<any[]> {
    if (!this.client) throw new Error('Slack client not initialized');

    const users = [];
    let cursor = '';

    do {
      const response = await this.client.users.list({
        limit: 100,
        cursor: cursor || undefined,
      });

      if (response.members) {
        users.push(...response.members);
      }

      cursor = response.response_metadata?.next_cursor || '';
    } while (cursor);

    return users;
  }

  async getWorkspaceInfo(): Promise<any> {
    if (!this.client) throw new Error('Slack client not initialized');

    const response = await this.client.team.info();
    return response.team;
  }

  async importWorkspaceData(workspaceId: string): Promise<string> {
    const db = getDatabase();
    const run = promisify(db.run.bind(db));
    const get = promisify(db.get.bind(db));

    const syncId = crypto.randomUUID();
    
    await run(
      `INSERT INTO sync_logs (id, workspace_id, started_at, status) 
       VALUES (?, ?, ?, ?)`,
      [syncId, workspaceId, new Date().toISOString(), 'running']
    );

    try {
      let newChannels = 0;
      let newMessages = 0;
      let totalUsers = 0;

      console.log('🚀 Starting comprehensive workspace data import...');

      // Import users first
      console.log('👥 Importing users...');
      const users = await this.getUsers();
      
      for (const user of users) {
        if (!user.deleted && !user.is_bot) {
          await run(
            `INSERT OR REPLACE INTO users 
             (id, workspace_id, username, display_name, avatar, is_admin) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
              user.id,
              workspaceId,
              user.name,
              user.real_name || user.name,
              user.profile?.image_72 || user.profile?.image_48 || user.profile?.image_24 || '',
              user.is_admin || false
            ]
          );
          totalUsers++;
        }
      }
      console.log(`✅ Imported ${totalUsers} users`);

      // Import channels and all their messages
      console.log('📂 Importing channels and messages...');
      const channels = await this.getChannels();
      
      // First, join all public channels
      console.log('🤖 Joining all public channels first...');
      for (const channel of channels) {
        if (!channel.is_private) {
          try {
            await this.client.conversations.join({ channel: channel.id });
            console.log(`✅ Joined public channel #${channel.name}`);
            await new Promise(resolve => setTimeout(resolve, 100)); // Rate limit
          } catch (error: any) {
            if (error.data?.error === 'already_in_channel') {
              console.log(`ℹ️  Already in #${channel.name}`);
            } else {
              console.log(`⚠️  Could not join #${channel.name}: ${error.data?.error || error.message}`);
            }
          }
        }
      }
      
      // Now import channel data and messages
      for (const channel of channels) {
        const isPrivate = channel.is_private || false;
        const password = isPrivate ? this.generateChannelPassword(channel.name) : null;
        
        console.log(`📂 Processing channel #${channel.name} (${isPrivate ? 'private' : 'public'})...`);
        
        await run(
          `INSERT OR REPLACE INTO channels 
           (id, workspace_id, name, is_private, is_admin_only, password, member_count) 
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            channel.id,
            workspaceId,
            channel.name,
            isPrivate,
            channel.name === 'admin-only',
            password,
            channel.num_members || 0
          ]
        );
        
        newChannels++;

        // Get ALL messages from the beginning of time
        console.log(`📨 Importing messages from #${channel.name}...`);
        const messages = await this.getAllChannelMessages(channel.id);
        console.log(`📨 Found ${messages.length} messages in #${channel.name}`);
        
        let channelMessages = 0;
        for (const message of messages) {
          if (message.user && (message.text || message.files)) {
            try {
              await run(
                `INSERT OR IGNORE INTO messages 
                 (id, channel_id, user_id, username, text, timestamp, thread_ts, files) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                  message.ts,
                  channel.id,
                  message.user,
                  message.username || 'Unknown',
                  message.text || '',
                  new Date(parseFloat(message.ts) * 1000).toISOString(),
                  message.thread_ts || null,
                  message.files ? JSON.stringify(message.files) : null
                ]
              );
              newMessages++;
              channelMessages++;
            } catch (dbError) {
              console.error(`❌ Failed to insert message ${message.ts}:`, dbError);
            }
          }
        }

        // Update channel last message timestamp
        if (messages.length > 0) {
          const lastMessage = messages[messages.length - 1];
          await run(
            `UPDATE channels SET last_message_at = ? WHERE id = ?`,
            [new Date(parseFloat(lastMessage.ts) * 1000).toISOString(), channel.id]
          );
        }
        
        console.log(`✅ Completed #${channel.name}: ${channelMessages} messages imported`);
      }

      console.log(`✅ Complete! Imported ${newChannels} channels with ${newMessages} total messages`);

      await run(
        `UPDATE sync_logs 
         SET completed_at = ?, status = ?, new_channels = ?, new_messages = ? 
         WHERE id = ?`,
        [new Date().toISOString(), 'completed', newChannels, newMessages, syncId]
      );

      await run(
        `UPDATE workspaces SET last_sync_at = ? WHERE id = ?`,
        [new Date().toISOString(), workspaceId]
      );

      return syncId;
    } catch (error) {
      console.error('❌ Import failed:', error);
      await run(
        `UPDATE sync_logs 
         SET completed_at = ?, status = ?, errors = ? 
         WHERE id = ?`,
        [new Date().toISOString(), 'failed', JSON.stringify([error.message]), syncId]
      );
      throw error;
    }
  }

  async getAllChannelMessages(channelId: string): Promise<any[]> {
    if (!this.client) throw new Error('Slack client not initialized');

    const allMessages = [];
    let cursor = '';
    let requestCount = 0;
    const maxRequests = 100; // Safety limit to prevent infinite loops

    try {
      do {
        requestCount++;
        if (requestCount > maxRequests) {
          console.log(`⚠️  Reached maximum requests limit for channel ${channelId}`);
          break;
        }

        const requestParams: any = {
          channel: channelId,
          limit: 1000,
          inclusive: true,
        };

        // Only add cursor if we have one (not for the first request)
        if (cursor) {
          requestParams.cursor = cursor;
        } else {
          // For the first request, start from the beginning of time
          requestParams.oldest = '0';
        }

        console.log(`📥 Fetching messages from channel ${channelId}, page ${requestCount}...`);
        const response = await this.client.conversations.history(requestParams);

        if (response.messages && response.messages.length > 0) {
          allMessages.push(...response.messages);
          console.log(`📥 Got ${response.messages.length} messages (total: ${allMessages.length})`);
        } else {
          console.log(`📥 No more messages in channel ${channelId}`);
          break;
        }

        cursor = response.response_metadata?.next_cursor || '';
        
        // Add delay to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 200));
      } while (cursor);
    } catch (error: any) {
      if (error.data?.error === 'not_in_channel') {
        console.log(`⚠️  Bot not in channel ${channelId}, attempting to join...`);
        try {
          await this.client.conversations.join({ channel: channelId });
          console.log(`✅ Successfully joined channel ${channelId}, retrying message fetch...`);
          // Retry once after joining
          return await this.getAllChannelMessages(channelId);
        } catch (joinError: any) {
          console.log(`❌ Failed to join channel ${channelId}: ${joinError.data?.error || joinError.message}`);
          return [];
        }
      }
      console.error(`❌ Error fetching messages from channel ${channelId}:`, error.data?.error || error.message);
      throw error;
    }

    console.log(`✅ Completed fetching ${allMessages.length} messages from channel ${channelId}`);
    // Sort by timestamp to maintain chronological order
    return allMessages.sort((a, b) => parseFloat(a.ts) - parseFloat(b.ts));
  }

  private generateChannelPassword(channelName: string): string {
    if (channelName === 'private-project') return 'project123';
    if (channelName === 'admin-only') return 'admin123';
    return crypto.randomBytes(8).toString('hex');
  }
}

export async function createSampleData(): Promise<void> {
  const db = getDatabase();
  const run = promisify(db.run.bind(db));

  const workspaceId = 'sample-workspace';
  const channels = [
    { id: 'C001', name: 'general', isPrivate: false, isAdminOnly: false, password: null },
    { id: 'C002', name: 'random', isPrivate: false, isAdminOnly: false, password: null },
    { id: 'C003', name: 'private-project', isPrivate: true, isAdminOnly: false, password: 'project123' },
    { id: 'C004', name: 'admin-only', isPrivate: true, isAdminOnly: true, password: 'admin123' },
  ];

  await run(
    `INSERT OR REPLACE INTO workspaces 
     (id, name, domain, access_token, auto_sync_enabled, sync_frequency) 
     VALUES (?, ?, ?, ?, ?, ?)`,
    [workspaceId, 'Sample Workspace', 'sample.slack.com', 'sample-token', 1, 'daily']
  );

  for (const channel of channels) {
    await run(
      `INSERT OR REPLACE INTO channels 
       (id, workspace_id, name, is_private, is_admin_only, password, member_count) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [channel.id, workspaceId, channel.name, channel.isPrivate, channel.isAdminOnly, channel.password, 5]
    );
  }

  const users = [
    { id: 'U001', username: 'alice', displayName: 'Alice Smith', isAdmin: true },
    { id: 'U002', username: 'bob', displayName: 'Bob Johnson', isAdmin: false },
    { id: 'U003', username: 'charlie', displayName: 'Charlie Brown', isAdmin: false },
  ];

  for (const user of users) {
    await run(
      `INSERT OR REPLACE INTO users 
       (id, workspace_id, username, display_name, avatar, is_admin) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [user.id, workspaceId, user.username, user.displayName, '', user.isAdmin]
    );
  }

  const sampleMessages = [
    // General channel messages
    { channelId: 'C001', userId: 'U001', text: 'Hello everyone! Welcome to our workspace.' },
    { channelId: 'C001', userId: 'U002', text: 'Thanks Alice! Excited to be here.' },
    { channelId: 'C001', userId: 'U003', text: 'This Slack archive viewer is amazing! 🚀' },
    { channelId: 'C001', userId: 'U001', text: 'Let me know if you have any questions about the project.' },
    { channelId: 'C001', userId: 'U002', text: 'The search functionality works perfectly!' },
    
    // Random channel messages
    { channelId: 'C002', userId: 'U003', text: 'Anyone up for lunch?' },
    { channelId: 'C002', userId: 'U002', text: 'I know a great sushi place nearby! 🍣' },
    { channelId: 'C002', userId: 'U001', text: 'Count me in! What time works for everyone?' },
    { channelId: 'C002', userId: 'U003', text: 'How about 12:30? That gives us time to finish the morning meetings.' },
    { channelId: 'C002', userId: 'U002', text: 'Perfect! See you all at 12:30 📅' },
    
    // Private project channel
    { channelId: 'C003', userId: 'U001', text: 'Project update: We\'re on track for the deadline.' },
    { channelId: 'C003', userId: 'U002', text: 'Great news! How are the API integrations coming along?' },
    { channelId: 'C003', userId: 'U001', text: 'The Slack API integration is complete. Now working on the search features.' },
    { channelId: 'C003', userId: 'U003', text: 'I can help with the frontend styling if needed.' },
    { channelId: 'C003', userId: 'U001', text: 'That would be fantastic! Let\'s sync up after lunch.' },
    
    // Admin only channel
    { channelId: 'C004', userId: 'U001', text: 'Admin notice: Server maintenance scheduled for tonight.' },
    { channelId: 'C004', userId: 'U001', text: 'Backup completed successfully. Maintenance window: 11 PM - 1 AM.' },
    { channelId: 'C004', userId: 'U001', text: 'All team members have been notified via email.' },
  ];

  for (let i = 0; i < sampleMessages.length; i++) {
    const msg = sampleMessages[i];
    const timestamp = new Date(Date.now() - (sampleMessages.length - i) * 3600000);
    
    await run(
      `INSERT OR REPLACE INTO messages 
       (id, channel_id, user_id, username, text, timestamp) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [`${msg.channelId}-${i}`, msg.channelId, msg.userId, users.find(u => u.id === msg.userId)?.username, msg.text, timestamp.toISOString()]
    );
  }

  console.log('Sample data created successfully');
}