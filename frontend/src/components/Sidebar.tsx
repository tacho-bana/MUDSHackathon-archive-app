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
      className={`w-full text-left px-2 py-1 rounded text-sm transition-colors flex items-center ${
        selectedChannel?.id === channel.id 
          ? 'bg-slack-blue text-white' 
          : 'text-gray-300 hover:bg-gray-700'
      }`}
      onClick={() => onChannelSelect(channel)}
    >
      <span className="text-gray-400 mr-1 text-sm">{prefix}</span>
      <span className="truncate">{channel.name}</span>
      {channel.is_private && !channel.is_admin_only && (
        <svg className="w-3 h-3 ml-auto text-gray-400" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
        </svg>
      )}
      {channel.is_admin_only && (
        <svg className="w-3 h-3 ml-auto text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M9.504 1.132a1 1 0 01.992 0l1.75 1a1 1 0 11-.992 1.736L10 3.152l-1.254.716a1 1 0 11-.992-1.736l1.75-1zM5.618 4.504a1 1 0 01-.372 1.364L5.016 6l.23.132a1 1 0 11-.992 1.736L3 7.723V8a1 1 0 01-2 0V6a.996.996 0 01.52-.878l1.734-.99a1 1 0 011.364.372zm8.764 0a1 1 0 011.364-.372l1.734.99A.996.996 0 0118 6v2a1 1 0 11-2 0v-.277l-1.254.145a1 1 0 11-.992-1.736L14.984 6l-.23-.132a1 1 0 01-.372-1.364zm-7 4a1 1 0 011.364-.372L10 8.848l1.254-.716a1 1 0 11.992 1.736L11 10.723V12a1 1 0 11-2 0v-1.277l-1.246-.855a1 1 0 01-.372-1.364zM3 11a1 1 0 011 1v1.277l1.246.855a1 1 0 01-.992 1.736L3 15.152l-1.254.716a1 1 0 01-.992-1.736L2 13.277V12a1 1 0 011-1zm14 0a1 1 0 011 1v1.277l1.254.855a1 1 0 01-.992 1.736L17 15.152l-1.246.855a1 1 0 01-.992-1.736L16 13.277V12a1 1 0 011-1zm-9.618 5.504a1 1 0 011.364-.372l.254.145V16a1 1 0 112 0v.277l.254-.145a1 1 0 11.992 1.736l-1.735.992a.995.995 0 01-1.022 0l-1.735-.992a1 1 0 01-.372-1.364z" clipRule="evenodd" />
        </svg>
      )}
    </button>
  );

  return (
    <div className="w-64 bg-slack-sidebar text-white flex flex-col border-r border-gray-700">
      <div className="p-3 border-b border-gray-600">
        <div className="flex items-center mb-2">
          <div className="w-9 h-9 bg-white rounded text-slack-sidebar flex items-center justify-center font-bold text-lg mr-3">
            {workspace.name[0].toUpperCase()}
          </div>
          <div>
            <h1 className="text-lg font-bold text-white truncate">{workspace.name}</h1>
            <div className="flex items-center">
              <div className="w-2 h-2 bg-green-400 rounded-full mr-1"></div>
              <span className="text-xs text-gray-300">Archived workspace</span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        {publicChannels.length > 0 && (
          <div className="px-3 py-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-300 flex items-center">
                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
                </svg>
                Channels
              </h3>
            </div>
            <div className="space-y-0.5">
              {publicChannels.map(channel => (
                <ChannelItem key={channel.id} channel={channel} prefix="#" />
              ))}
            </div>
          </div>
        )}

        {privateChannels.length > 0 && (
          <div className="px-3 py-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-300 flex items-center">
                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
                Private channels
              </h3>
            </div>
            <div className="space-y-0.5">
              {privateChannels.map(channel => (
                <ChannelItem key={channel.id} channel={channel} prefix="🔒" />
              ))}
            </div>
          </div>
        )}

        {adminChannels.length > 0 && (
          <div className="px-3 py-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-300 flex items-center">
                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Admin only
              </h3>
            </div>
            <div className="space-y-0.5">
              {adminChannels.map(channel => (
                <ChannelItem key={channel.id} channel={channel} prefix="👑" />
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="p-3 border-t border-gray-600">
        <div className="text-xs text-gray-400 bg-gray-800 rounded px-2 py-1">
          📊 Last sync: {workspace.last_sync_at ? 
            new Date(workspace.last_sync_at).toLocaleDateString() : 
            'Never'
          }
        </div>
      </div>
    </div>
  );
};

export default Sidebar;