import { SlackService } from './slack';
import { getDatabase } from '../models/database';
import { promisify } from 'util';

export async function initializeWorkspaceData(): Promise<void> {
  const accessToken = process.env.SLACK_ACCESS_TOKEN;
  const workspaceId = process.env.SLACK_WORKSPACE_ID;

  console.log('Checking Slack configuration...');
  console.log('Access Token:', accessToken ? `${accessToken.substring(0, 10)}...` : 'Not set');
  console.log('Workspace ID:', workspaceId || 'Not set');

  if (!accessToken || !workspaceId || accessToken === 'xoxb-your-bot-token-here' || workspaceId === 'T123456789') {
    console.log('❌ Slack workspace not properly configured');
    console.log('Please set SLACK_ACCESS_TOKEN and SLACK_WORKSPACE_ID in .env file');
    return;
  }

  try {
    console.log('✅ Slack configuration found, initializing workspace data...');
    
    const db = getDatabase();
    const run = promisify(db.run.bind(db));
    const get = promisify(db.get.bind(db));
    
    // Check if workspace already exists and has data
    const existingWorkspace = await get(
      'SELECT id, last_sync_at FROM workspaces WHERE id = ?',
      [workspaceId]
    );

    const slackService = new SlackService(accessToken);

    if (existingWorkspace && existingWorkspace.last_sync_at) {
      console.log('Workspace data already exists, checking for updates...');
      // Just ensure workspace is properly configured
      await run(
        `UPDATE workspaces SET access_token = ? WHERE id = ?`,
        [accessToken, workspaceId]
      );
      return;
    }

    // Skip workspace info API call (requires team:read scope)
    const workspaceInfo = { name: 'Workspace', domain: 'workspace.slack.com' };
    
    // Create or update workspace entry
    await run(
      `INSERT OR REPLACE INTO workspaces (id, name, domain, access_token, auto_sync_enabled, sync_frequency) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [workspaceId, workspaceInfo.name || 'Workspace', workspaceInfo.domain || 'workspace.slack.com', accessToken, 1, 'daily']
    );

    // Import all data
    console.log('🔄 Starting data import...');
    await slackService.importWorkspaceData(workspaceId);
    console.log('✅ Workspace data initialized successfully');
    
  } catch (error) {
    console.error('❌ Failed to initialize workspace data:', error);
    if (error.message.includes('invalid_auth')) {
      console.log('Check if your SLACK_ACCESS_TOKEN is correct and the bot is installed in the workspace');
    }
  }
}