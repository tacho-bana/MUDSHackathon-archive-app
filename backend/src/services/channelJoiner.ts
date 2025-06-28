import { WebClient } from '@slack/web-api';
import { getDatabase } from '../models/database';
import { promisify } from 'util';

export class ChannelJoiner {
  private client: WebClient;

  constructor(accessToken: string) {
    this.client = new WebClient(accessToken);
  }

  async joinAllChannels(): Promise<void> {
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

    for (const channel of channels) {
      try {
        console.log(`🔄 Attempting to join #${channel.name} (${channel.id})...`);
        
        await this.client.conversations.join({
          channel: channel.id
        });
        
        console.log(`✅ Successfully joined #${channel.name}`);
        
        // Small delay to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error: any) {
        if (error.data?.error === 'already_in_channel') {
          console.log(`ℹ️  Already in #${channel.name}`);
        } else if (error.data?.error === 'channel_not_found') {
          console.log(`⚠️  Channel #${channel.name} not found`);
        } else if (error.data?.error === 'not_authed') {
          console.log(`❌ Not authorized to join #${channel.name}`);
        } else {
          console.log(`❌ Failed to join #${channel.name}: ${error.data?.error || error.message}`);
        }
      }
    }
    
    console.log('🎉 Finished joining channels!');
  }

  async checkChannelMembership(): Promise<void> {
    console.log('🔍 Checking bot membership in channels...');
    
    const db = getDatabase();
    const all = promisify(db.all.bind(db));
    
    const channels = await all(`
      SELECT id, name, is_private 
      FROM channels 
      ORDER BY name
    `);

    for (const channel of channels) {
      try {
        const response = await this.client.conversations.info({
          channel: channel.id
        });
        
        const isMember = response.channel?.is_member;
        const memberStatus = isMember ? '✅ Member' : '❌ Not a member';
        const privateStatus = channel.is_private ? '🔒 Private' : '🌐 Public';
        
        console.log(`${memberStatus} | ${privateStatus} | #${channel.name}`);
        
      } catch (error: any) {
        console.log(`❌ Error checking #${channel.name}: ${error.data?.error || error.message}`);
      }
    }
  }
}

// Utility function to join channels
export async function joinAllChannels(): Promise<void> {
  const accessToken = process.env.SLACK_ACCESS_TOKEN;
  
  if (!accessToken) {
    console.log('❌ SLACK_ACCESS_TOKEN not found');
    return;
  }
  
  const joiner = new ChannelJoiner(accessToken);
  await joiner.joinAllChannels();
}

// Utility function to check membership
export async function checkChannelMembership(): Promise<void> {
  const accessToken = process.env.SLACK_ACCESS_TOKEN;
  
  if (!accessToken) {
    console.log('❌ SLACK_ACCESS_TOKEN not found');
    return;
  }
  
  const joiner = new ChannelJoiner(accessToken);
  await joiner.checkChannelMembership();
}