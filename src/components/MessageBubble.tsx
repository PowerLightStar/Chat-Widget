import React from 'react';
import type { Message } from '../types';
import FileAttachment from './FileAttachment';
import type { IconType } from 'react-icons';

interface MessageBubbleProps {
  message: Message;
  avatar: string | IconType;
  showTimestamp: boolean;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  avatar,
  showTimestamp,
}) => {
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={`flex gap-2 animate-fade-in ${
      message.sender === 'user' ? 'flex-row-reverse' : ''
    }`}>
      <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-lg shrink-0 text-[2rem] text-[#41372c]">
        {typeof avatar === 'string' ? avatar : React.createElement(avatar)}
      </div>
      <div className={`max-w-[70%] ${message.sender === 'user' ? 'items-end' : ''}`}>
        {message.text && (
          <div className={`px-3 py-2 rounded-2xl wrap-break-word text-base whitespace-pre-wrap ${
            message.sender === 'user'
              ? 'bg-[#786550] text-white'
              : 'bg-gray-100 text-gray-800'
          }`}>
            {message.text}
          </div>
        )}
        
        {message.attachments && message.attachments.length > 0 && (
          <div className="mt-2 space-y-2">
            {message.attachments.map((attachment) => (
              <div key={attachment.id}>
                {attachment.type.startsWith('image/') && attachment.url ? (
                  <a
                    href={attachment.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block"
                  >
                    <img
                      src={attachment.preview || attachment.url}
                      alt={attachment.name}
                      className="max-w-50 max-h-50 rounded-lg cursor-pointer transition-transform hover:scale-105"
                    />
                  </a>
                ) : (
                  <a
                    href={attachment.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block no-underline"
                  >
                    <FileAttachment attachment={attachment} />
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
        
        {showTimestamp && (
          <div className={`text-[10px] text-gray-400 mt-1 ${
            message.sender === 'user' ? 'text-right' : 'text-left'
          }`}>
            {formatTime(message.timestamp)}
            {message.sender === 'bot' && message.status === 'read' && ' ✓✓'}
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageBubble;