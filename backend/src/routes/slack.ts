import express from 'express';
import { SlackService } from '../services/slack';

const router = express.Router();

router.get('/auth', (req, res) => {
  const clientId = process.env.SLACK_CLIENT_ID;
  const redirectUri = process.env.SLACK_REDIRECT_URI;
  const scopes = 'channels:read,channels:history,groups:read,groups:history,users:read,files:read';
  
  const authUrl = `https://slack.com/oauth/v2/authorize?client_id=${clientId}&scope=${scopes}&redirect_uri=${encodeURIComponent(redirectUri!)}`;
  
  res.json({ authUrl });
});

router.post('/callback', async (req, res) => {
  try {
    const { code } = req.body;
    
    if (!code) {
      return res.status(400).json({ error: 'Authorization code is required' });
    }

    const slackService = new SlackService();
    const { workspaceId, accessToken } = await slackService.authenticate(code);

    res.json({ 
      success: true, 
      workspaceId, 
      message: 'Successfully connected to Slack workspace' 
    });
  } catch (error) {
    console.error('Slack callback error:', error);
    res.status(500).json({ error: 'Failed to authenticate with Slack' });
  }
});

router.post('/import', async (req, res) => {
  try {
    const { workspaceId, accessToken } = req.body;
    
    if (!workspaceId || !accessToken) {
      return res.status(400).json({ error: 'Workspace ID and access token are required' });
    }

    const slackService = new SlackService(accessToken);
    const syncId = await slackService.importWorkspaceData(workspaceId);

    res.json({ 
      success: true, 
      syncId, 
      message: 'Data import started successfully' 
    });
  } catch (error) {
    console.error('Slack import error:', error);
    res.status(500).json({ error: 'Failed to import Slack data' });
  }
});

router.post('/sync', async (req, res) => {
  try {
    const { workspaceId, accessToken } = req.body;
    
    if (!workspaceId || !accessToken) {
      return res.status(400).json({ error: 'Workspace ID and access token are required' });
    }

    const slackService = new SlackService(accessToken);
    const syncId = await slackService.importWorkspaceData(workspaceId);

    res.json({ 
      success: true, 
      syncId, 
      message: 'Data sync started successfully' 
    });
  } catch (error) {
    console.error('Slack sync error:', error);
    res.status(500).json({ error: 'Failed to sync Slack data' });
  }
});

export default router;