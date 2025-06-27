import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import MessageArea from './MessageArea';
import { Channel, Workspace } from '../types/api';
import { useApi } from '../hooks/useApi';

const Layout: React.FC = () => {
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
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
        await loadChannels(ws.id);
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

  const handleChannelSelect = (channel: Channel) => {
    setSelectedChannel(channel);
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
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-gray-700 mb-4">
            No workspace found
          </h2>
          <p className="text-gray-600">
            Please connect to a Slack workspace first.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-white">
      <Sidebar
        workspace={workspace}
        channels={channels}
        selectedChannel={selectedChannel}
        onChannelSelect={handleChannelSelect}
      />
      <MessageArea
        channel={selectedChannel}
        workspace={workspace}
      />
    </div>
  );
};

export default Layout;