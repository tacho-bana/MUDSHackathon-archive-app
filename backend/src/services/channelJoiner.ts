import { WebClient } from '@slack/web-api';
import { getDatabase } from '../models/database';
import { promisify } from 'util';

export class ChannelJoiner {
  private client: WebClient;

  constructor(accessToken: string) {
    this.client = new WebClient(accessToken);
  }

  async joinAllChannels(): Promise<{joined: number, alreadyIn: number, failed: number}> {
    console.log('🤖 Starting to join all available channels...');
    
    const db = getDatabase();
    const all = promisify(db.all.bind(db));
    
    // Get all public channels from database
    const channels = await all(`
      SELECT id, name, is_private 
      FROM channels 
      WHERE is_private = 0
      ORDER BY name
    `);

    console.log(`📋 Found ${channels.length} public channels to join`);

    let stats = { joined: 0, alreadyIn: 0, failed: 0 };

    for (const channel of channels) {
      try {
        console.log(`🔄 Attempting to join #${channel.name} (${channel.id})...`);
        
        await this.client.conversations.join({
          channel: channel.id
        });
        
        console.log(`✅ Successfully joined #${channel.name}`);
        stats.joined++;
        
        // Small delay to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 300));
        
      } catch (error: any) {
        if (error.data?.error === 'already_in_channel') {
          console.log(`ℹ️  Already in #${channel.name}`);
          stats.alreadyIn++;
        } else if (error.data?.error === 'channel_not_found') {
          console.log(`⚠️  Channel #${channel.name} not found`);
          stats.failed++;
        } else if (error.data?.error === 'not_authed') {
          console.log(`❌ Not authorized to join #${channel.name}`);
          stats.failed++;
        } else if (error.data?.error === 'access_denied') {
          console.log(`❌ Access denied to #${channel.name}`);
          stats.failed++;
        } else {
          console.log(`❌ Failed to join #${channel.name}: ${error.data?.error || error.message}`);
          stats.failed++;
        }
      }
    }
    
    console.log(`🎉 Finished joining channels! Joined: ${stats.joined}, Already in: ${stats.alreadyIn}, Failed: ${stats.failed}`);
    return stats;
  }

  async checkChannelMembership(): Promise<{member: number, notMember: number, error: number}> {
    console.log('🔍 Checking bot membership in channels...');
    
    const db = getDatabase();
    const all = promisify(db.all.bind(db));
    
    const channels = await all(`
      SELECT id, name, is_private 
      FROM channels 
      ORDER BY name
    `);

    let stats = { member: 0, notMember: 0, error: 0 };
    const notMemberChannels = [];

    for (const channel of channels) {
      try {
        const response = await this.client.conversations.info({
          channel: channel.id
        });
        
        const isMember = response.channel?.is_member;
        const memberStatus = isMember ? '✅ Member' : '❌ Not a member';
        const privateStatus = channel.is_private ? '🔒 Private' : '🌐 Public';
        
        console.log(`${memberStatus} | ${privateStatus} | #${channel.name}`);
        
        if (isMember) {
          stats.member++;
        } else {
          stats.notMember++;
          if (!channel.is_private) {
            notMemberChannels.push(channel);
          }
        }
        
      } catch (error: any) {
        console.log(`❌ Error checking #${channel.name}: ${error.data?.error || error.message}`);
        stats.error++;
      }
    }
    
    console.log(`\n📊 Summary: Member of ${stats.member} channels, Not member of ${stats.notMember} channels, ${stats.error} errors`);
    
    if (notMemberChannels.length > 0) {
      console.log(`\n📝 Channels bot is not a member of (public only):`);
      notMemberChannels.forEach(ch => console.log(`  - #${ch.name} (${ch.id})`));
    }
    
    return stats;
  }
}

// Utility function to join channels
export async function joinAllChannels(): Promise<{joined: number, alreadyIn: number, failed: number}> {
  const accessToken = process.env.SLACK_ACCESS_TOKEN;
  
  if (!accessToken) {
    console.log('❌ SLACK_ACCESS_TOKEN not found');
    return { joined: 0, alreadyIn: 0, failed: 0 };
  }
  
  const joiner = new ChannelJoiner(accessToken);
  return await joiner.joinAllChannels();
}

// Utility function to check membership
export async function checkChannelMembership(): Promise<{member: number, notMember: number, error: number}> {
  const accessToken = process.env.SLACK_ACCESS_TOKEN;
  
  if (!accessToken) {
    console.log('❌ SLACK_ACCESS_TOKEN not found');
    return { member: 0, notMember: 0, error: 0 };
  }
  
  const joiner = new ChannelJoiner(accessToken);
  return await joiner.checkChannelMembership();
}