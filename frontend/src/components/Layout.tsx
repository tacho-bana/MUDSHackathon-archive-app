import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import MessageArea from './MessageArea';
import SearchBar from './SearchBar';
import SearchResults from './SearchResults';
import { Channel, Workspace, User, Message } from '../types/api';
import { useApi } from '../hooks/useApi';

const Layout: React.FC = () => {
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchResults, setSearchResults] = useState<Message[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const api = useApi();

  useEffect(() => {
    loadWorkspace();
  }, []);

  const loadWorkspace = async () => {
    try {
      const workspaces = await api.fetchWorkspaces();
      if (workspaces.length > 0) {
        const ws = workspaces[0];
        setWorkspace(ws);
        await Promise.all([
          loadChannels(ws.id),
          loadUsers(ws.id)
        ]);
      }
    } catch (error) {
      console.error('Failed to load workspace:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadChannels = async (workspaceId: string) => {
    try {
      const channelData = await api.fetchChannels(workspaceId);
      setChannels(channelData);
      if (channelData.length > 0) {
        setSelectedChannel(channelData[0]);
      }
    } catch (error) {
      console.error('Failed to load channels:', error);
    }
  };

  const loadUsers = async (workspaceId: string) => {
    try {
      const userData = await api.fetchUsers(workspaceId);
      setUsers(userData);
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  };

  const handleChannelSelect = (channel: Channel) => {
    setSelectedChannel(channel);
    setShowSearchResults(false);
  };

  const handleSearchResults = (results: Message[]) => {
    setSearchResults(results);
    setShowSearchResults(true);
  };

  const handleClearSearch = () => {
    setSearchResults([]);
    setShowSearchResults(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-slack-purple"></div>
          <p className="mt-4 text-gray-600">Loading workspace...</p>
        </div>
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-6">📱</div>
          <h2 className="text-2xl font-semibold text-gray-700 mb-4">
            No Slack workspace data found
          </h2>
          <p className="text-gray-600 mb-4">
            This app displays archived data from your Slack workspace. To get started, you need to:
          </p>
          <div className="text-left bg-white p-4 rounded-lg shadow text-sm">
            <ol className="list-decimal list-inside space-y-2">
              <li>Set up your <code>SLACK_ACCESS_TOKEN</code> and <code>SLACK_WORKSPACE_ID</code> in the backend .env file</li>
              <li>Restart the backend server to import your workspace data</li>
              <li>Your messages, channels, and users will then be available offline</li>
            </ol>
          </div>
          <p className="text-xs text-gray-500 mt-4">
            Perfect for preserving Slack data before trial periods end!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-white">
      <SearchBar
        workspaceId={workspace.id}
        channels={channels}
        users={users}
        onSearchResults={handleSearchResults}
        onClearSearch={handleClearSearch}
      />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          workspace={workspace}
          channels={channels}
          selectedChannel={selectedChannel}
          onChannelSelect={handleChannelSelect}
        />
        {showSearchResults ? (
          <SearchResults
            messages={searchResults}
            onClose={handleClearSearch}
          />
        ) : (
          <MessageArea
            channel={selectedChannel}
            workspace={workspace}
          />
        )}
      </div>
    </div>
  );
};

export default Layout;