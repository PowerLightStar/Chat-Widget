import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';

import type { ChatWidgetProps, Message } from './types/types';
import FileAttachment from './_components/FileAttachment';
import FileUpload from './_components/FileUpload';
import MessageBubble from './_components/MessageBubble';
import { renderChatAvatar } from './_components/renderChatAvatar';
import QuickButtons from './_components/QuickButtons';
import ConversationHistoryList, {
  type ConversationListItem,
} from './_components/ConversationHistoryList';
import { ChatWidgetContext } from './useContext';

import { IoMdSend } from 'react-icons/io';
import { IoChatbubbleEllipsesOutline } from 'react-icons/io5';
import { HiOutlineQueueList } from 'react-icons/hi2';
import { VscChromeMinimize } from 'react-icons/vsc';
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
  height = '640px',
  width = '400px',
  showTimestamp = true,
  acceptFileTypes = 'image/*,.pdf,.doc,.docx,.txt,.xls,.xlsx',
  maxFileSize = 10 * 1024 * 1024,
  maxFiles = 5,
  allowFileUpload = false,
  isConnected = false,
  embedded = false,
  onHeaderListClick,
  conversationHubFooter,
  onStartNewConversation,
}) => {
  const contextController = useContext(ChatWidgetContext);
  const chat = controller ?? contextController;
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [isHistoryViewOpen, setIsHistoryViewOpen] = useState(false);
  const [focusMessageId, setFocusMessageId] = useState<string | null>(null);
  const [archivedConversations, setArchivedConversations] = useState<
    Array<{ id: string; messages: Message[] }>
  >([]);

  if (!chat) {
    throw new Error(
      'ChatWidget requires either a controller prop or a ChatWidgetProvider.',
    );
  }

  useEffect(() => {
    if (isHistoryViewOpen) {
      return;
    }
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chat.isTyping, chat.messages, isHistoryViewOpen]);

  useEffect(() => {
    if (!chat.isOpen) {
      setIsHistoryViewOpen(false);
      setFocusMessageId(null);
    }
  }, [chat.isOpen]);

  const conversationItems = useMemo<ConversationListItem[]>(() => {
    const signatureFor = (messages: Message[]) => {
      if (messages.length === 0) {
        return 'empty';
      }
      const first = messages[0]?.id ?? '';
      const last = messages[messages.length - 1]?.id ?? '';
      return `${messages.length}:${first}:${last}`;
    };

    const current: ConversationListItem = {
      id: 'current',
      title,
      messages: chat.messages,
      isCurrent: true,
    };
    const currentSignature = signatureFor(chat.messages);

    const dedupedArchived = archivedConversations
      .filter((conversation) => signatureFor(conversation.messages) !== currentSignature)
      .map((conversation) => conversation);

    const archived = dedupedArchived.map((conversation, index) => ({
        id: conversation.id,
        title: `Conversation ${dedupedArchived.length - index}`,
        messages: conversation.messages,
        isCurrent: false,
      }));

    return [current, ...archived];
  }, [archivedConversations, chat.messages, title]);

  useEffect(() => {
    if (!focusMessageId || isHistoryViewOpen) {
      return;
    }

    const rafId = window.requestAnimationFrame(() => {
      const target = document.querySelector<HTMLElement>(
        `[data-chat-message-id="${focusMessageId}"]`,
      );
      target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setFocusMessageId(null);
    });

    return () => {
      window.cancelAnimationFrame(rafId);
    };
  }, [focusMessageId, isHistoryViewOpen, chat.messages]);

  useEffect(() => {
    const textarea = inputRef.current;
    if (!textarea) {
      return;
    }

    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 96)}px`;
  }, [chat.inputMessage]);

  useEffect(() => {
    if (typeof window === 'undefined' || window.parent === window) {
      return;
    }

    window.parent.postMessage(
      {
        source: 'murphy-chat-widget',
        type: 'widget_state',
        isOpen: chat.isOpen,
      },
      '*',
    );
  }, [chat.isOpen]);

  const handleInputChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    chat.setInputMessage(event.target.value);
  };

  const handleKeyDown = async (
    event: React.KeyboardEvent<HTMLTextAreaElement>,
  ) => {
    if (chat.isTyping) {
      return;
    }

    if (event.key !== 'Enter' || event.shiftKey) {
      return;
    }

    event.preventDefault();
    await chat.sendMessage();
  };

  const positionClasses = {
    /*
     * Standalone: tight corner over host FABs. Embedded: inset ≥ ~24px ripple spread
     * so box-shadow is not clipped by the iframe viewport.
     */
    'bottom-right': embedded ? 'bottom-7 right-7' : 'bottom-2 right-2',
    'bottom-left': embedded ? 'bottom-7 left-7' : 'bottom-5 left-5',
  };

  return (
    <div
      className={`murphy-chat-widget-hit-target fixed z-1000 ${positionClasses[position]} flex flex-col items-end gap-3 pointer-events-auto`}
    >
      {chat.isOpen && (
        <div
          className="bg-white rounded-xl shadow-2xl flex flex-col min-h-0 overflow-hidden animate-slide-up"
          style={{ width, height }}
        >
          {!isHistoryViewOpen && (
            <div
              className="text-white p-4 flex justify-between items-center"
              style={{ backgroundColor: primaryColor }}
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsHistoryViewOpen(true);
                    onHeaderListClick?.();
                  }}
                  disabled={chat.isTyping}
                  className="shrink-0 flex h-10 w-10 items-center justify-center rounded-lg border border-white/25 bg-white/10 text-white hover:bg-white/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  aria-label="Chat history"
                  title="Chat history"
                >
                  <HiOutlineQueueList className="text-xl" aria-hidden />
                </button>
                <div className="relative shrink-0">
                  <span className="text-2xl flex items-center justify-center">
                    {renderChatAvatar(botAvatar)}
                  </span>
                  <span
                    className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
                      isConnected ? 'bg-green-500' : 'bg-gray-400'
                    }`}
                    title={isConnected ? 'Connected' : 'Disconnected'}
                  />
                </div>
                <div className="min-w-0">
                  <h3 className="m-0 text-base font-semibold truncate">{title}</h3>
                  <p className="m-0 text-xs opacity-90 truncate">{subtitle}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={chat.closeChat}
                disabled={chat.isTyping}
                className="shrink-0 flex h-10 w-10 items-center justify-center rounded-lg border border-white/25 bg-white/10 text-white hover:bg-white/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                aria-label="Minimize chat"
                title="Minimize"
              >
                <VscChromeMinimize className="text-lg" aria-hidden />
              </button>
            </div>
          )}

          {isHistoryViewOpen ? (
            <ConversationHistoryList
              conversations={conversationItems}
              title={title}
              subtitle={subtitle}
              primaryColor={primaryColor}
              botAvatar={botAvatar}
              userAvatar={userAvatar}
              onBack={() => {
                setIsHistoryViewOpen(false);
              }}
              onSelectConversation={(conversationId) => {
                if (conversationId === 'current') {
                  setIsHistoryViewOpen(false);
                  return;
                }

                const conversation = archivedConversations.find(
                  (item) => item.id === conversationId,
                );
                if (!conversation) {
                  setIsHistoryViewOpen(false);
                  return;
                }

                const currentSnapshot = chat.messages.map((message) => ({
                  ...message,
                  timestamp: new Date(message.timestamp),
                }));
                const hasCurrentConversation = currentSnapshot.length > 0;

                setArchivedConversations((prev) => {
                  const remaining = prev.filter((item) => item.id !== conversationId);
                  if (!hasCurrentConversation) {
                    return remaining;
                  }
                  return [
                    { id: `conversation-${Date.now()}`, messages: currentSnapshot },
                    ...remaining,
                  ];
                });

                chat.setMessages(
                  conversation.messages.map((message) => ({
                    ...message,
                    timestamp: new Date(message.timestamp),
                  })),
                );
                setIsHistoryViewOpen(false);
                setFocusMessageId(conversation.messages[0]?.id ?? null);
              }}
              onStartNewConversation={async () => {
                const trimmedInput = chat.inputMessage.trim();
                const hasCurrentConversation =
                  chat.messages.length > 0 || trimmedInput.length > 0;

                if (hasCurrentConversation) {
                  const draftAsMessage: Message | null =
                    trimmedInput.length > 0
                      ? {
                          id: `draft-${Date.now()}`,
                          text: chat.inputMessage,
                          sender: 'user',
                          timestamp: new Date(),
                          status: 'sent',
                        }
                      : null;

                  const snapshot = [
                    ...chat.messages.map((message) => ({
                      ...message,
                      timestamp: new Date(message.timestamp),
                    })),
                    ...(draftAsMessage ? [draftAsMessage] : []),
                  ];

                  setArchivedConversations((prev) => [
                    { id: `conversation-${Date.now()}`, messages: snapshot },
                    ...prev,
                  ]);
                }

                chat.setMessages([]);
                chat.setInputMessage('');
                chat.setTyping(false);
                chat.setTypingStatus(undefined);
                chat.resetQuickButtons();
                chat.setInteractiveMode(false);
                setFocusMessageId(null);
                setIsHistoryViewOpen(false);
                await onStartNewConversation?.();
              }}
              onMinimize={chat.closeChat}
              disabled={chat.isTyping}
              footerBrand={conversationHubFooter}
            />
          ) : (
            <>
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
                  {chat.messages.map((message) => (
                    <div key={message.id} data-chat-message-id={message.id}>
                      <MessageBubble
                        message={message}
                        avatar={message.sender === 'bot' ? botAvatar : userAvatar}
                        showTimestamp={showTimestamp}
                      />
                    </div>
                  ))}
                  {chat.isTyping && (
                    <div className="p-2 rounded-2xl w-fit animate-pulse-slow">
                      <div className="flex gap-1">
                        <ThreeDot color={[primaryColor]} size="small" text="" textColor="" />
                      </div>
                      {chat.typingStatus && (
                        <p className="mt-1 text-xs text-gray-500">{chat.typingStatus}</p>
                      )}
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
                    disabled={chat.isTyping}
                    onButtonClick={chat.sendQuickButton}
                    onSubmitSelection={chat.submitQuickButtonSelection}
                    onClearSelection={chat.clearQuickButtonSelection}
                  />
                )}

                {(!chat.isInteractiveMode || chat.quickButtons.length === 0) && (
                  <div className="px-4 py-2 m-2 border-t border-gray-200 flex gap-3 items-center bg-gray-50 rounded-full">
                    {allowFileUpload && (
                      <FileUpload
                        onFileSelect={chat.handleFileSelect}
                        accept={acceptFileTypes}
                        multiple={true}
                        maxSize={maxFileSize}
                        disabled={chat.isTyping || chat.pendingAttachments.length >= maxFiles}
                      />
                    )}
                    <textarea
                      ref={inputRef}
                      value={chat.inputMessage}
                      onChange={handleInputChange}
                      onKeyDown={handleKeyDown}
                      disabled={chat.isTyping}
                      placeholder={placeholder}
                      rows={1}
                      className="flex-1 bg-transparent text-sm outline-none placeholder-gray-400 resize-none max-h-24 overflow-y-auto"
                      style={{ lineHeight: '1.5rem', minHeight: '1.5rem' }}
                    />
                    <button
                      type="button"
                      onClick={chat.sendMessage}
                      disabled={
                        chat.isTyping ||
                        (!chat.inputMessage.trim() && chat.pendingAttachments.length === 0)
                      }
                      className="p-2 rounded-full transition-opacity hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
                      style={{ color: primaryColor }}
                      title="Send message"
                    >
                      <IoMdSend />
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {!chat.isOpen && (
        <button
          type="button"
          onClick={chat.toggleChat}
          disabled={chat.isTyping}
          className="relative z-1000 flex h-14 w-14 shrink-0 items-center justify-center overflow-visible rounded-full murphy-chat-trigger--idle"
          style={{
            backgroundColor: primaryColor,
            ...({
              ['--murphy-chat-primary' as string]: primaryColor,
            } as React.CSSProperties),
          }}
          aria-label="Open chat"
        >
          <span className="relative z-10 text-2xl text-white">
            <IoChatbubbleEllipsesOutline aria-hidden />
          </span>
          {chat.unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 z-20 bg-red-500 text-white rounded-full px-1.5 py-0.5 text-xs font-bold min-w-5">
              {chat.unreadCount}
            </span>
          )}
        </button>
      )}
    </div>
  );
};

export default ChatWidget;
