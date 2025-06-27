import express from 'express';
import { getDatabase } from '../models/database';
import { promisify } from 'util';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const router = express.Router();

router.get('/workspaces', async (req, res) => {
  try {
    const db = getDatabase();
    const all = promisify(db.all.bind(db));
    
    const workspaces = await all(`
      SELECT id, name, domain, last_sync_at, auto_sync_enabled, sync_frequency, created_at 
      FROM workspaces 
      ORDER BY created_at DESC
    `);

    res.json(workspaces);
  } catch (error) {
    console.error('Error fetching workspaces:', error);
    res.status(500).json({ error: 'Failed to fetch workspaces' });
  }
});

router.get('/channels', async (req, res) => {
  try {
    const { workspaceId } = req.query;
    
    if (!workspaceId) {
      return res.status(400).json({ error: 'Workspace ID is required' });
    }

    const db = getDatabase();
    const all = promisify(db.all.bind(db));
    
    const channels = await all(`
      SELECT id, name, is_private, is_admin_only, member_count, last_message_at, created_at
      FROM channels 
      WHERE workspace_id = ? 
      ORDER BY name
    `, [workspaceId]);

    res.json(channels);
  } catch (error) {
    console.error('Error fetching channels:', error);
    res.status(500).json({ error: 'Failed to fetch channels' });
  }
});

router.get('/channels/:channelId/messages', async (req, res) => {
  try {
    const { channelId } = req.params;
    const { page = '1', limit = '50' } = req.query;
    
    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

    const db = getDatabase();
    const all = promisify(db.all.bind(db));
    const get = promisify(db.get.bind(db));
    
    const messages = await all(`
      SELECT m.*, u.display_name, u.avatar 
      FROM messages m
      LEFT JOIN users u ON m.user_id = u.id
      WHERE m.channel_id = ? 
      ORDER BY m.timestamp DESC 
      LIMIT ? OFFSET ?
    `, [channelId, parseInt(limit as string), offset]);

    const totalCount = await get(`
      SELECT COUNT(*) as count FROM messages WHERE channel_id = ?
    `, [channelId]);

    res.json({
      messages: messages.reverse(),
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total: totalCount.count,
        hasMore: offset + messages.length < totalCount.count
      }
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

router.post('/auth/channel', async (req, res) => {
  try {
    const { channelId, password } = req.body;
    
    if (!channelId) {
      return res.status(400).json({ error: 'Channel ID is required' });
    }

    const db = getDatabase();
    const get = promisify(db.get.bind(db));
    
    const channel = await get(`
      SELECT * FROM channels WHERE id = ?
    `, [channelId]);

    if (!channel) {
      return res.status(404).json({ error: 'Channel not found' });
    }

    if (!channel.is_private) {
      return res.json({ success: true, message: 'Public channel access granted' });
    }

    if (channel.is_admin_only) {
      return res.status(403).json({ error: 'Admin authentication required' });
    }

    if (!password || password !== channel.password) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    const token = jwt.sign(
      { channelId, type: 'channel' },
      process.env.JWT_SECRET!,
      { expiresIn: '24h' }
    );

    res.json({ 
      success: true, 
      token, 
      message: 'Channel access granted' 
    });
  } catch (error) {
    console.error('Error authenticating channel:', error);
    res.status(500).json({ error: 'Failed to authenticate channel' });
  }
});

router.post('/auth/admin', async (req, res) => {
  try {
    const { password } = req.body;
    
    if (!password || password !== process.env.ADMIN_PASSWORD) {
      return res.status(401).json({ error: 'Invalid admin password' });
    }

    const token = jwt.sign(
      { type: 'admin' },
      process.env.JWT_SECRET!,
      { expiresIn: '24h' }
    );

    res.json({ 
      success: true, 
      token, 
      message: 'Admin access granted' 
    });
  } catch (error) {
    console.error('Error authenticating admin:', error);
    res.status(500).json({ error: 'Failed to authenticate admin' });
  }
});

router.get('/sync/status', async (req, res) => {
  try {
    const { workspaceId } = req.query;
    
    if (!workspaceId) {
      return res.status(400).json({ error: 'Workspace ID is required' });
    }

    const db = getDatabase();
    const get = promisify(db.get.bind(db));
    
    const latestSync = await get(`
      SELECT * FROM sync_logs 
      WHERE workspace_id = ? 
      ORDER BY started_at DESC 
      LIMIT 1
    `, [workspaceId]);

    res.json(latestSync || { status: 'none' });
  } catch (error) {
    console.error('Error fetching sync status:', error);
    res.status(500).json({ error: 'Failed to fetch sync status' });
  }
});

router.get('/sync/logs', async (req, res) => {
  try {
    const { workspaceId } = req.query;
    
    if (!workspaceId) {
      return res.status(400).json({ error: 'Workspace ID is required' });
    }

    const db = getDatabase();
    const all = promisify(db.all.bind(db));
    
    const logs = await all(`
      SELECT * FROM sync_logs 
      WHERE workspace_id = ? 
      ORDER BY started_at DESC 
      LIMIT 20
    `, [workspaceId]);

    res.json(logs);
  } catch (error) {
    console.error('Error fetching sync logs:', error);
    res.status(500).json({ error: 'Failed to fetch sync logs' });
  }
});

export default router;