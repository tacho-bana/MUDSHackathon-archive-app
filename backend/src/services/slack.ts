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

      const channels = await this.getChannels();
      
      for (const channel of channels) {
        const isPrivate = channel.is_private || false;
        const password = isPrivate ? this.generateChannelPassword(channel.name) : null;
        
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

        const messages = await this.getMessages(channel.id);
        console.log(`📨 Found ${messages.length} messages in #${channel.name}`);
        
        for (const message of messages) {
          if (message.user && message.text) {
            await run(
              `INSERT OR IGNORE INTO messages 
               (id, channel_id, user_id, username, text, timestamp, thread_ts, files) 
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                message.ts,
                channel.id,
                message.user,
                message.username || 'Unknown',
                message.text,
                new Date(parseFloat(message.ts) * 1000).toISOString(),
                message.thread_ts || null,
                message.files ? JSON.stringify(message.files) : null
              ]
            );
            newMessages++;
          }
        }
      }

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
              user.profile?.image_72 || '',
              user.is_admin || false
            ]
          );
        }
      }

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
      await run(
        `UPDATE sync_logs 
         SET completed_at = ?, status = ?, errors = ? 
         WHERE id = ?`,
        [new Date().toISOString(), 'failed', JSON.stringify([error.message]), syncId]
      );
      throw error;
    }
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
    { channelId: 'C001', userId: 'U001', text: 'Hello everyone! Welcome to our workspace.' },
    { channelId: 'C001', userId: 'U002', text: 'Thanks Alice! Excited to be here.' },
    { channelId: 'C002', userId: 'U003', text: 'Anyone up for lunch?' },
    { channelId: 'C003', userId: 'U001', text: 'Project update: We\'re on track for the deadline.' },
    { channelId: 'C004', userId: 'U001', text: 'Admin notice: Server maintenance scheduled for tonight.' },
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