export interface Workspace {
  id: string;
  name: string;
  domain: string;
  last_sync_at?: string;
  auto_sync_enabled: boolean;
  sync_frequency: 'daily' | 'weekly' | 'manual';
  created_at: string;
}

export interface Channel {
  id: string;
  name: string;
  is_private: boolean;
  is_admin_only: boolean;
  member_count: number;
  last_message_at?: string;
  created_at: string;
}

export interface Message {
  id: string;
  channel_id: string;
  user_id: string;
  username: string;
  text: string;
  timestamp: string;
  thread_ts?: string;
  files?: string;
  is_new?: boolean;
  display_name?: string;
  avatar?: string;
}

export interface User {
  id: string;
  username: string;
  display_name: string;
  avatar: string;
  is_admin: boolean;
}

export interface SyncLog {
  id: string;
  workspace_id: string;
  started_at: string;
  completed_at?: string;
  status: 'running' | 'completed' | 'failed';
  new_messages: number;
  new_channels: number;
  errors?: string;
}

export interface AuthResponse {
  success: boolean;
  token?: string;
  message: string;
}

export interface MessagesResponse {
  messages: Message[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

export interface SearchParams {
  q: string;
  channelId?: string;
  userId?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
}

export interface ArchiveData {
  workspace: Workspace;
  channels: Channel[];
  users: User[];
  stats: {
    total_messages: number;
    channels_with_messages: number;
    earliest_message: string;
    latest_message: string;
  };
  generated_at: string;
}