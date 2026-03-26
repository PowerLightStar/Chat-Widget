import React, { useContext, useEffect, useRef } from 'react';

import type { ChatWidgetProps } from './types/types';
import FileAttachment from './_components/FileAttachment';
import FileUpload from './_components/FileUpload';
import MessageBubble from './_components/MessageBubble';
import QuickButtons from './_components/QuickButtons';
import { ChatWidgetContext } from './useContext';

import { IoMdSend } from 'react-icons/io';
import { MdOutlineClose } from 'react-icons/md';
import { IoChatbubbleEllipsesOutline } from 'react-icons/io5';
import { ImUser } from 'react-icons/im';
import { ThreeDot } from 'react-loading-indicators';
import { RiRobot2Fill } from 'react-icons/ri';

const ChatWidget: React.FC<ChatWidgetProps> = ({
  title = 'Chat Support',
  subtitle = 'We usually reply in a few minutes',
  botAvatar = RiRobot2Fill,
  userAvatar = ImUser,
  placeholder = 'Type a message...',
  controller,
  primaryColor = '#41372c',
  position = 'bottom-right',
  height = '80vh',
  width = '25vw',
  showTimestamp = true,
  acceptFileTypes = 'image/*,.pdf,.doc,.docx,.txt,.xls,.xlsx',
  maxFileSize = 10 * 1024 * 1024,
  maxFiles = 5,
  allowFileUpload = false,
}) => {
  const contextController = useContext(ChatWidgetContext);
  const chat = controller ?? contextController;
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  if (!chat) {
    throw new Error(
      'ChatWidget requires either a controller prop or a ChatWidgetProvider.',
    );
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chat.isTyping, chat.messages]);

  useEffect(() => {
    const textarea = inputRef.current;
    if (!textarea) {
      return;
    }

    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 96)}px`;
  }, [chat.inputMessage]);

  const handleInputChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    chat.setInputMessage(event.target.value);
  };

  const handleKeyDown = async (
    event: React.KeyboardEvent<HTMLTextAreaElement>,
  ) => {
    if (event.key !== 'Enter' || event.shiftKey) {
      return;
    }

    event.preventDefault();
    await chat.sendMessage();
  };

  const positionClasses = {
    'bottom-right': 'bottom-5 right-5',
    'bottom-left': 'bottom-5 left-5',
  };

  return (
    <div
      className={`fixed z-1000 ${positionClasses[position]} flex flex-col items-end gap-3`}
    >
      {chat.isOpen && (
        <div
          className="bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden animate-slide-up"
          style={{ width, height }}
        >
          <div
            className="text-white p-4 flex justify-between items-center"
            style={{ backgroundColor: primaryColor }}
          >
            <div className="flex items-center gap-2">
              <div className="relative">
                <span className="text-2xl">
                  {typeof botAvatar === 'string'
                    ? botAvatar
                    : React.createElement(botAvatar)}
                </span>
                <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-green-500 border-2 border-white" />
              </div>
              <div>
                <h3 className="m-0 text-base font-semibold">{title}</h3>
                <p className="m-0 text-xs opacity-90">{subtitle}</p>
              </div>
            </div>
            <button
              onClick={chat.toggleChat}
              className="bg-transparent border-none text-white text-xl cursor-pointer hover:opacity-80 px-1"
            >
              ✕
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
            {chat.messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                avatar={message.sender === 'bot' ? botAvatar : userAvatar}
                showTimestamp={showTimestamp}
              />
            ))}
            {chat.isTyping && (
              <div className="flex gap-1 p-2 rounded-2xl w-fit animate-pulse-slow">
                <ThreeDot color={[primaryColor]} size="small" text="" textColor="" />
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {chat.pendingAttachments.length > 0 && (
            <div className="p-3 border-t border-gray-200 bg-gray-50 max-h-150 overflow-y-auto space-y-2">
              {chat.pendingAttachments.map((attachment) => (
                <FileAttachment
                  key={attachment.id}
                  attachment={attachment}
                  onRemove={chat.removePendingAttachment}
                  onRetry={chat.retryUpload}
                />
              ))}
            </div>
          )}

          {chat.quickButtons.length > 0 && (
            <QuickButtons
              buttons={chat.quickButtons}
              selectedValues={chat.selectedQuickButtonValues}
              isMultiSelect={chat.isQuickButtonMultiSelect}
              onButtonClick={chat.sendQuickButton}
              onSubmitSelection={chat.submitQuickButtonSelection}
              onClearSelection={chat.clearQuickButtonSelection}
            />
          )}

          <div className="px-4 py-2 m-2 border-t border-gray-200 flex gap-3 items-center bg-gray-50 rounded-full">
            {allowFileUpload && (
              <FileUpload
                onFileSelect={chat.handleFileSelect}
                accept={acceptFileTypes}
                multiple={true}
                maxSize={maxFileSize}
                disabled={chat.pendingAttachments.length >= maxFiles}
              />
            )}
            <textarea
              ref={inputRef}
              value={chat.inputMessage}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              rows={1}
              className="flex-1 bg-transparent text-sm outline-none placeholder-gray-400 resize-none max-h-24 overflow-y-auto"
              style={{ lineHeight: '1.5rem', minHeight: '1.5rem' }}
            />
            <button
              onClick={chat.sendMessage}
              disabled={
                !chat.inputMessage.trim() && chat.pendingAttachments.length === 0
              }
              className="p-2 rounded-full transition-opacity hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
              style={{ color: primaryColor }}
              title="Send message"
            >
              <IoMdSend />
            </button>
          </div>
        </div>
      )}

      <button
        onClick={chat.toggleChat}
        className="w-14 h-14 rounded-full shadow-lg hover:scale-105 transition-transform flex justify-center items-center shrink-0"
        style={{ backgroundColor: primaryColor }}
        aria-label={chat.isOpen ? 'Close chat' : 'Open chat'}
      >
        <span className="text-2xl text-white">
          {chat.isOpen ? <MdOutlineClose /> : <IoChatbubbleEllipsesOutline />}
        </span>
        {!chat.isOpen && chat.unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full px-1.5 py-0.5 text-xs font-bold min-w-5">
            {chat.unreadCount}
          </span>
        )}
      </button>
    </div>
  );
};

export default ChatWidget;
