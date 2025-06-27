import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';

let db: sqlite3.Database;

export async function createDatabase(): Promise<void> {
  const dbPath = process.env.DATABASE_URL || './data/archive.db';
  const dbDir = path.dirname(dbPath);
  
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  db = new sqlite3.Database(dbPath);
  const run = promisify(db.run.bind(db));

  await run(`
    CREATE TABLE IF NOT EXISTS workspaces (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      domain TEXT NOT NULL,
      access_token TEXT NOT NULL,
      last_sync_at DATETIME,
      auto_sync_enabled BOOLEAN DEFAULT 1,
      sync_frequency TEXT DEFAULT 'daily',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS sync_logs (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL,
      started_at DATETIME NOT NULL,
      completed_at DATETIME,
      status TEXT CHECK(status IN ('running', 'completed', 'failed')) NOT NULL,
      new_messages INTEGER DEFAULT 0,
      new_channels INTEGER DEFAULT 0,
      errors TEXT,
      FOREIGN KEY (workspace_id) REFERENCES workspaces (id)
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS channels (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL,
      name TEXT NOT NULL,
      is_private BOOLEAN DEFAULT 0,
      is_admin_only BOOLEAN DEFAULT 0,
      password TEXT,
      member_count INTEGER DEFAULT 0,
      last_message_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (workspace_id) REFERENCES workspaces (id)
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL,
      username TEXT NOT NULL,
      display_name TEXT NOT NULL,
      avatar TEXT,
      is_admin BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (workspace_id) REFERENCES workspaces (id)
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      channel_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      username TEXT NOT NULL,
      text TEXT NOT NULL,
      timestamp DATETIME NOT NULL,
      thread_ts TEXT,
      files TEXT,
      is_new BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (channel_id) REFERENCES channels (id),
      FOREIGN KEY (user_id) REFERENCES users (id)
    )
  `);

  await run(`
    CREATE INDEX IF NOT EXISTS idx_messages_channel_timestamp 
    ON messages (channel_id, timestamp DESC)
  `);

  await run(`
    CREATE INDEX IF NOT EXISTS idx_messages_thread 
    ON messages (thread_ts) 
    WHERE thread_ts IS NOT NULL
  `);

  await run(`
    CREATE INDEX IF NOT EXISTS idx_sync_logs_workspace 
    ON sync_logs (workspace_id, started_at DESC)
  `);

  console.log('Database tables created successfully');
}

export function getDatabase(): sqlite3.Database {
  if (!db) {
    throw new Error('Database not initialized. Call createDatabase() first.');
  }
  return db;
}

export async function closeDatabase(): Promise<void> {
  if (db) {
    const close = promisify(db.close.bind(db));
    await close();
  }
}