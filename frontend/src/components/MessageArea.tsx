import React, { useState, useEffect } from 'react';
import { Channel, Workspace, Message, MessagesResponse } from '../types/api';
import { useApi } from '../hooks/useApi';
import AuthModal from './AuthModal';

interface MessageAreaProps {
  channel: Channel | null;
  workspace: Workspace;
}

const MessageArea: React.FC<MessageAreaProps> = ({ channel }) => {
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
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 24 * 7) {
      return date.toLocaleDateString([], { weekday: 'short' }) + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
  };

  const renderFiles = (filesJson: string | null) => {
    if (!filesJson) return null;
    
    try {
      const files = JSON.parse(filesJson);
      return (
        <div className="mt-2 space-y-2">
          {files.map((file: any, index: number) => (
            <div key={index} className="flex items-center p-2 bg-gray-50 rounded border">
              <div className="flex-shrink-0 mr-3">
                {file.mimetype?.startsWith('image/') ? (
                  <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                {file.size && (
                  <p className="text-xs text-gray-500">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                )}
              </div>
              {file.url_private && (
                <div className="flex-shrink-0 ml-2">
                  <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800">
                    Archived
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      );
    } catch (error) {
      return (
        <div className="mt-2 text-sm text-blue-600 flex items-center">
          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
          </svg>
          File attachment
        </div>
      );
    }
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
          <div className="space-y-3">
            {messages.map((message, index) => {
              const showAvatar = index === 0 || 
                messages[index - 1].user_id !== message.user_id ||
                (new Date(message.timestamp).getTime() - new Date(messages[index - 1].timestamp).getTime()) > 5 * 60 * 1000;

              return (
                <div key={message.id} className={`flex ${showAvatar ? 'mt-3' : 'mt-0.5'}`}>
                  <div className="flex-shrink-0 w-10 mr-2">
                    {showAvatar ? (
                      message.avatar ? (
                        <img
                          className="w-9 h-9 rounded-full"
                          src={message.avatar}
                          alt={message.display_name || message.username}
                        />
                      ) : (
                        <div className="w-9 h-9 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                          {(message.display_name || message.username)[0].toUpperCase()}
                        </div>
                      )
                    ) : (
                      <div className="w-9 h-9 flex items-center justify-center">
                        <span className="text-xs text-gray-400 opacity-0 hover:opacity-100 transition-opacity">
                          {formatTimestamp(message.timestamp)}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    {showAvatar && (
                      <div className="flex items-baseline space-x-2 mb-1">
                        <span className="font-semibold text-gray-900 text-sm">
                          {message.display_name || message.username}
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatTimestamp(message.timestamp)}
                        </span>
                        {message.is_new && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                            NEW
                          </span>
                        )}
                      </div>
                    )}
                    
                    {message.text && (
                      <div className="text-gray-900 text-sm leading-relaxed whitespace-pre-wrap break-words">
                        {message.text}
                      </div>
                    )}
                    
                    {message.files && renderFiles(message.files)}
                    
                    {message.thread_ts && (
                      <div className="mt-1 text-xs text-slack-blue flex items-center">
                        <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M7.707 3.293a1 1 0 010 1.414L5.414 7H11a7 7 0 017 7v2a1 1 0 11-2 0v-2a5 5 0 00-5-5H5.414l2.293 2.293a1 1 0 11-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        Thread reply
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageArea;