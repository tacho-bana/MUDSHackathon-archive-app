import React from 'react';
import { Message } from '../types/api';

interface SearchResultsProps {
  messages: Message[];
  onClose: () => void;
}

const SearchResults: React.FC<SearchResultsProps> = ({ messages, onClose }) => {
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderFiles = (filesJson: string | null) => {
    if (!filesJson) return null;
    
    try {
      const files = JSON.parse(filesJson);
      return (
        <div className="mt-2 space-y-1">
          {files.map((file: any, index: number) => (
            <div key={index} className="flex items-center text-xs text-blue-600">
              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
              </svg>
              {file.name}
            </div>
          ))}
        </div>
      );
    } catch (error) {
      return (
        <div className="mt-2 text-xs text-blue-600 flex items-center">
          <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
          </svg>
          File attachment
        </div>
      );
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-white">
      <div className="border-b bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Search Results</h2>
            <p className="text-sm text-gray-500 mt-1">
              {messages.length} {messages.length === 1 ? 'message' : 'messages'} found
            </p>
          </div>
          <button
            onClick={onClose}
            className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm bg-white text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-slack-blue"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Close
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <svg className="w-12 h-12 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <p className="text-lg font-medium">No messages found</p>
              <p className="mt-1">Try adjusting your search terms or filters</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => (
              <div key={message.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    {message.avatar ? (
                      <img
                        className="w-8 h-8 rounded-full"
                        src={message.avatar}
                        alt={message.display_name || message.username}
                      />
                    ) : (
                      <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-semibold text-xs">
                        {(message.display_name || message.username)[0].toUpperCase()}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="font-semibold text-gray-900 text-sm">
                        {message.display_name || message.username}
                      </span>
                      <span className="text-xs text-gray-500">
                        in #{(message as any).channel_name || 'unknown-channel'}
                      </span>
                      <span className="text-xs text-gray-500">
                        {formatTimestamp(message.timestamp)}
                      </span>
                    </div>
                    
                    {message.text && (
                      <div className="text-gray-900 text-sm leading-relaxed whitespace-pre-wrap break-words">
                        {message.text}
                      </div>
                    )}
                    
                    {message.files && renderFiles(message.files)}
                    
                    {message.thread_ts && (
                      <div className="mt-2 text-xs text-slack-blue flex items-center">
                        <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M7.707 3.293a1 1 0 010 1.414L5.414 7H11a7 7 0 017 7v2a1 1 0 11-2 0v-2a5 5 0 00-5-5H5.414l2.293 2.293a1 1 0 11-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        Thread reply
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchResults;