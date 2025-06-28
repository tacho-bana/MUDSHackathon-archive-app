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
    
    console.log(`Fetching messages for channel ${channelId}, page ${page}, limit ${limit}, offset ${offset}`);
    
    // Get all messages without any filtering
    const allMessages = await all(`
      SELECT m.*, u.display_name, u.avatar 
      FROM messages m
      LEFT JOIN users u ON m.user_id = u.id
      WHERE m.channel_id = ?
      ORDER BY m.timestamp ASC
    `, [channelId]);
    
    console.log(`Total messages in DB for channel ${channelId}: ${allMessages.length}`);
    
    // Apply pagination manually
    const startIndex = offset;
    const endIndex = offset + parseInt(limit as string);
    const messages = allMessages.slice(startIndex, endIndex);

    const totalCount = allMessages.length;

    console.log(`Returning messages ${startIndex}-${endIndex-1} (${messages.length} messages), total count: ${totalCount}`);

    res.json({
      messages: messages,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total: totalCount,
        hasMore: endIndex < totalCount
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

router.get('/search', async (req, res) => {
  try {
    const { workspaceId, q: query, channelId, fromDate, toDate, userId, page = '1', limit = '50' } = req.query;
    
    if (!workspaceId) {
      return res.status(400).json({ error: 'Workspace ID is required' });
    }

    if (!query || (query as string).trim().length < 2) {
      return res.status(400).json({ error: 'Search query must be at least 2 characters' });
    }

    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
    const db = getDatabase();
    const all = promisify(db.all.bind(db));
    const get = promisify(db.get.bind(db));

    let whereConditions = ['m.text LIKE ?'];
    let params = [`%${query}%`];

    if (channelId) {
      whereConditions.push('m.channel_id = ?');
      params.push(channelId as string);
    }

    if (userId) {
      whereConditions.push('m.user_id = ?');
      params.push(userId as string);
    }

    if (fromDate) {
      whereConditions.push('m.timestamp >= ?');
      params.push(fromDate as string);
    }

    if (toDate) {
      whereConditions.push('m.timestamp <= ?');
      params.push(toDate as string);
    }

    // Add workspace filter through channel
    whereConditions.push('c.workspace_id = ?');
    params.push(workspaceId as string);

    const searchQuery = `
      SELECT m.*, u.display_name, u.avatar, c.name as channel_name
      FROM messages m
      LEFT JOIN users u ON m.user_id = u.id
      LEFT JOIN channels c ON m.channel_id = c.id
      WHERE ${whereConditions.join(' AND ')}
      ORDER BY m.timestamp DESC
      LIMIT ? OFFSET ?
    `;

    params.push(parseInt(limit as string).toString(), offset.toString());
    const messages = await all(searchQuery, params);

    const countQuery = `
      SELECT COUNT(*) as count
      FROM messages m
      LEFT JOIN channels c ON m.channel_id = c.id
      WHERE ${whereConditions.join(' AND ')}
    `;

    const totalCount = await get(countQuery, params.slice(0, -2));

    res.json({
      messages,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total: totalCount.count,
        hasMore: offset + messages.length < totalCount.count
      }
    });
  } catch (error) {
    console.error('Error searching messages:', error);
    res.status(500).json({ error: 'Failed to search messages' });
  }
});

router.get('/users', async (req, res) => {
  try {
    const { workspaceId } = req.query;
    
    if (!workspaceId) {
      return res.status(400).json({ error: 'Workspace ID is required' });
    }

    const db = getDatabase();
    const all = promisify(db.all.bind(db));
    
    const users = await all(`
      SELECT id, username, display_name, avatar, is_admin
      FROM users 
      WHERE workspace_id = ? 
      ORDER BY display_name
    `, [workspaceId]);

    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

router.get('/archive-data', async (req, res) => {
  try {
    const { workspaceId } = req.query;
    
    if (!workspaceId) {
      return res.status(400).json({ error: 'Workspace ID is required' });
    }

    const db = getDatabase();
    const all = promisify(db.all.bind(db));
    const get = promisify(db.get.bind(db));

    const workspace = await get(`
      SELECT id, name, domain, last_sync_at
      FROM workspaces 
      WHERE id = ?
    `, [workspaceId]);

    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    const channels = await all(`
      SELECT id, name, is_private, is_admin_only, member_count, last_message_at
      FROM channels 
      WHERE workspace_id = ? 
      ORDER BY name
    `, [workspaceId]);

    const users = await all(`
      SELECT id, username, display_name, avatar, is_admin
      FROM users 
      WHERE workspace_id = ? 
      ORDER BY display_name
    `, [workspaceId]);

    const messageStats = await get(`
      SELECT 
        COUNT(*) as total_messages,
        COUNT(DISTINCT channel_id) as channels_with_messages,
        MIN(timestamp) as earliest_message,
        MAX(timestamp) as latest_message
      FROM messages m
      JOIN channels c ON m.channel_id = c.id
      WHERE c.workspace_id = ?
    `, [workspaceId]);

    res.json({
      workspace,
      channels,
      users,
      stats: messageStats,
      generated_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching archive data:', error);
    res.status(500).json({ error: 'Failed to fetch archive data' });
  }
});

router.post('/join-channels', async (req, res) => {
  try {
    const { joinAllChannels } = await import('../services/channelJoiner');
    const stats = await joinAllChannels();
    res.json({ 
      success: true, 
      message: `Joined ${stats.joined} channels, already in ${stats.alreadyIn}, failed ${stats.failed}`,
      stats 
    });
  } catch (error) {
    console.error('Error joining channels:', error);
    res.status(500).json({ error: 'Failed to join channels' });
  }
});

router.get('/channel-membership', async (req, res) => {
  try {
    const { checkChannelMembership } = await import('../services/channelJoiner');
    const stats = await checkChannelMembership();
    res.json({ 
      success: true, 
      message: `Member of ${stats.member} channels, not member of ${stats.notMember}, ${stats.error} errors`,
      stats 
    });
  } catch (error) {
    console.error('Error checking channel membership:', error);
    res.status(500).json({ error: 'Failed to check channel membership' });
  }
});

export default router;