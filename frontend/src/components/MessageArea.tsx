import React, { useState, useEffect } from 'react';
import { Channel, Workspace, Message, MessagesResponse } from '../types/api';
import { useApi } from '../hooks/useApi';
import AuthModal from './AuthModal';

interface MessageAreaProps {
  channel: Channel | null;
  workspace: Workspace;
}

const MessageArea: React.FC<MessageAreaProps> = ({ channel, workspace }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authError, setAuthError] = useState('');
  const api = useApi();

  useEffect(() => {
    if (channel) {
      checkChannelAccess();
    }
  }, [channel]);

  const checkChannelAccess = async () => {
    if (!channel) return;

    if (!channel.is_private) {
      setAuthenticated(true);
      await loadMessages();
      return;
    }

    const token = localStorage.getItem(`channel_${channel.id}_token`);
    const adminToken = localStorage.getItem('admin_token');

    if (token || (channel.is_admin_only && adminToken)) {
      setAuthenticated(true);
      await loadMessages();
    } else {
      setAuthenticated(false);
      setShowAuthModal(true);
    }
  };

  const loadMessages = async () => {
    if (!channel) return;

    setLoading(true);
    try {
      const response: MessagesResponse = await api.fetchMessages(channel.id);
      setMessages(response.messages);
    } catch (error) {
      console.error('Failed to load messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAuthenticate = async (password: string, isAdmin = false) => {
    if (!channel) return;

    try {
      let response;
      if (isAdmin) {
        response = await api.authenticateAdmin(password);
        localStorage.setItem('admin_token', response.token);
      } else {
        response = await api.authenticateChannel(channel.id, password);
        localStorage.setItem(`channel_${channel.id}_token`, response.token);
      }

      setAuthenticated(true);
      setShowAuthModal(false);
      setAuthError('');
      await loadMessages();
    } catch (error: any) {
      setAuthError(error.response?.data?.error || 'Authentication failed');
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  if (!channel) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center text-gray-500">
          <h3 className="text-lg font-medium">Select a channel</h3>
          <p className="mt-1">Choose a channel from the sidebar to view messages</p>
        </div>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <>
        <div className="flex-1 flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="text-6xl mb-4">🔒</div>
            <h3 className="text-lg font-medium text-gray-900">
              {channel.is_admin_only ? 'Admin Authentication Required' : 'Private Channel'}
            </h3>
            <p className="mt-1 text-gray-600">
              {channel.is_admin_only 
                ? 'You need admin privileges to access this channel'
                : 'This channel requires a password to access'
              }
            </p>
            <button
              className="mt-4 bg-slack-purple text-white px-4 py-2 rounded hover:bg-purple-700"
              onClick={() => setShowAuthModal(true)}
            >
              Authenticate
            </button>
          </div>
        </div>
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          onAuthenticate={handleAuthenticate}
          isAdminOnly={channel.is_admin_only}
          channelName={channel.name}
          error={authError}
        />
      </>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      <div className="border-b bg-white px-6 py-4">
        <div className="flex items-center">
          <h2 className="text-xl font-semibold text-gray-900">
            {channel.is_private ? '🔒' : '#'} {channel.name}
          </h2>
          <span className="ml-2 text-sm text-gray-500">
            {channel.member_count} members
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slack-purple"></div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <div className="text-4xl mb-2">💬</div>
              <p>No messages in this channel yet</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div key={message.id} className="flex space-x-3">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-slack-purple rounded-full flex items-center justify-center text-white font-medium">
                    {message.display_name ? message.display_name[0].toUpperCase() : message.username[0].toUpperCase()}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium text-gray-900">
                      {message.display_name || message.username}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatTimestamp(message.timestamp)}
                    </span>
                    {message.is_new && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                        NEW
                      </span>
                    )}
                  </div>
                  <div className="mt-1 text-gray-700 whitespace-pre-wrap">
                    {message.text}
                  </div>
                  {message.files && (
                    <div className="mt-2 text-sm text-blue-600">
                      📎 File attached
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageArea;