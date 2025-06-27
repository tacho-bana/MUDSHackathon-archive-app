import React from 'react';
import { Channel, Workspace } from '../types/api';

interface SidebarProps {
  workspace: Workspace;
  channels: Channel[];
  selectedChannel: Channel | null;
  onChannelSelect: (channel: Channel) => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  workspace,
  channels,
  selectedChannel,
  onChannelSelect,
}) => {
  const publicChannels = channels.filter(c => !c.is_private);
  const privateChannels = channels.filter(c => c.is_private && !c.is_admin_only);
  const adminChannels = channels.filter(c => c.is_admin_only);

  const ChannelItem: React.FC<{ channel: Channel; prefix: string }> = ({ channel, prefix }) => (
    <button
      className={`w-full text-left px-3 py-1 rounded hover:bg-slack-purple hover:bg-opacity-20 transition-colors ${
        selectedChannel?.id === channel.id ? 'bg-slack-purple bg-opacity-30 text-white' : 'text-gray-300'
      }`}
      onClick={() => onChannelSelect(channel)}
    >
      <span className="text-gray-400">{prefix}</span>
      {channel.name}
      {channel.is_private && (
        <span className="ml-2 text-xs bg-yellow-500 text-black px-1 rounded">🔒</span>
      )}
      {channel.is_admin_only && (
        <span className="ml-2 text-xs bg-red-500 text-white px-1 rounded">👑</span>
      )}
    </button>
  );

  return (
    <div className="w-64 bg-slack-purple text-white flex flex-col">
      <div className="p-4 border-b border-purple-400">
        <h1 className="text-xl font-bold">{workspace.name}</h1>
        <p className="text-sm text-purple-200">{workspace.domain}</p>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4">
        {publicChannels.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-purple-200 mb-2">Channels</h3>
            <div className="space-y-1">
              {publicChannels.map(channel => (
                <ChannelItem key={channel.id} channel={channel} prefix="#" />
              ))}
            </div>
          </div>
        )}

        {privateChannels.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-purple-200 mb-2">Private Channels</h3>
            <div className="space-y-1">
              {privateChannels.map(channel => (
                <ChannelItem key={channel.id} channel={channel} prefix="🔒" />
              ))}
            </div>
          </div>
        )}

        {adminChannels.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-purple-200 mb-2">Admin Only</h3>
            <div className="space-y-1">
              {adminChannels.map(channel => (
                <ChannelItem key={channel.id} channel={channel} prefix="👑" />
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-purple-400">
        <div className="text-xs text-purple-200">
          Last sync: {workspace.last_sync_at ? 
            new Date(workspace.last_sync_at).toLocaleDateString() : 
            'Never'
          }
        </div>
      </div>
    </div>
  );
};

export default Sidebar;