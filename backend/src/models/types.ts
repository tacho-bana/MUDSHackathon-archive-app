export interface Workspace {
  id: string;
  name: string;
  domain: string;
  accessToken: string;
  lastSyncAt?: Date;
  autoSyncEnabled: boolean;
  syncFrequency: 'daily' | 'weekly' | 'manual';
  createdAt: Date;
}

export interface SyncLog {
  id: string;
  workspaceId: string;
  startedAt: Date;
  completedAt?: Date;
  status: 'running' | 'completed' | 'failed';
  newMessages: number;
  newChannels: number;
  errors?: string[];
}

export interface Channel {
  id: string;
  workspaceId: string;
  name: string;
  isPrivate: boolean;
  isAdminOnly: boolean;
  password?: string;
  memberCount: number;
  lastMessageAt?: Date;
  createdAt: Date;
}

export interface Message {
  id: string;
  channelId: string;
  userId: string;
  username: string;
  text: string;
  timestamp: Date;
  threadTs?: string;
  files?: File[];
  isNew?: boolean;
  createdAt: Date;
}

export interface User {
  id: string;
  workspaceId: string;
  username: string;
  displayName: string;
  avatar: string;
  isAdmin: boolean;
  createdAt: Date;
}

export interface File {
  id: string;
  name: string;
  mimetype: string;
  url: string;
  size: number;
}