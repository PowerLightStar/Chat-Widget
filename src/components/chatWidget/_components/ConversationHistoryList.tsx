import React, { useState } from 'react';
import {
  HiChatBubbleLeftRight,
  HiHome,
  HiOutlineArrowLeft,
} from 'react-icons/hi2';
import { MdBusiness } from 'react-icons/md';
import { VscChromeMinimize } from 'react-icons/vsc';

import type { ChatWidgetAvatar, Message } from '../types/types';
import { renderChatAvatar } from './renderChatAvatar';

type HubTab = 'home' | 'conversations';
export interface ConversationListItem {
  id: string;
  title: string;
  messages: Message[];
  isCurrent?: boolean;
}

const previewForMessage = (message: Message): string => {
  const t = message.text?.trim();
  if (t) {
    return t;
  }
  const n = message.attachments?.length ?? 0;
  if (n > 0) {
    return n === 1 ? '1 attachment' : `${n} attachments`;
  }
  return '';
};

const formatRelative = (date: Date): string => {
  const sec = Math.floor((Date.now() - date.getTime()) / 1000);
  if (sec < 45) {
    return 'Just now';
  }
  if (sec < 3600) {
    return `${Math.max(1, Math.floor(sec / 60))} mins ago`;
  }
  if (sec < 86400) {
    return `${Math.floor(sec / 3600)} hours ago`;
  }
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

interface ConversationHistoryListProps {
  conversations: ConversationListItem[];
  title: string;
  subtitle: string;
  primaryColor: string;
  botAvatar: ChatWidgetAvatar;
  userAvatar: ChatWidgetAvatar;
  onBack: () => void;
  onSelectConversation: (conversationId: string) => void;
  onStartNewConversation: () => void | Promise<void>;
  onMinimize: () => void;
  disabled?: boolean;
  footerBrand?: string;
}

const ConversationHistoryList: React.FC<ConversationHistoryListProps> = ({
  conversations,
  title,
  subtitle,
  primaryColor,
  botAvatar,
  userAvatar,
  onBack,
  onSelectConversation,
  onStartNewConversation,
  onMinimize,
  disabled = false,
  footerBrand = 'Powered by Murphy AI',
}) => {
  const [tab, setTab] = useState<HubTab>('home');

  const orderedConversations = [...conversations];
  const topConversation = orderedConversations[0];
  const topMessage = topConversation?.messages[topConversation.messages.length - 1] ?? null;
  const topPreview = topMessage
    ? previewForMessage(topMessage)
    : 'No messages yet — start a new conversation.';
  const topTime = topMessage ? formatRelative(topMessage.timestamp) : '';

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-white">
      {/* Brand strip: controls + Home hero or Conversation title */}
      <div
        className="shrink-0 text-white"
        style={{ backgroundColor: primaryColor }}
      >
        <div className="flex items-center justify-between gap-2 px-2 pt-2">
          <button
            type="button"
            onClick={onBack}
            disabled={disabled}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/20 bg-white/10 hover:bg-white/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            aria-label="Back to chat"
            title="Back to chat"
          >
            <HiOutlineArrowLeft className="text-xl" aria-hidden />
          </button>
          <button
            type="button"
            onClick={onMinimize}
            disabled={disabled}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/20 bg-white/10 hover:bg-white/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            aria-label="Minimize chat"
            title="Minimize"
          >
            <VscChromeMinimize className="text-lg" aria-hidden />
          </button>
        </div>

        {tab === 'home' ? (
          <div className="px-4 pb-20 pt-3">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/20 text-xl">
                <MdBusiness className="text-2xl opacity-95" aria-hidden />
              </span>
            </div>
            <h2 className="mt-3 text-xl font-bold leading-tight m-0">{title}</h2>
            <p className="mt-1 text-sm opacity-90 m-0">{subtitle}</p>
          </div>
        ) : (
          <div className="px-4 pb-5 pt-2">
            <h2 className="text-lg font-semibold m-0">Conversation</h2>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="relative flex min-h-0 flex-1 flex-col bg-gray-50/90">
        {tab === 'home' ? (
          <div className="-mt-14 flex flex-1 flex-col px-3 pb-2 pt-0">
            <button
              type="button"
              onClick={() => {
                if (topConversation) {
                  onSelectConversation(topConversation.id);
                  return;
                }
                setTab('conversations');
              }}
              className="z-10 flex w-full gap-3 rounded-xl border border-gray-200/80 bg-white p-3 text-left shadow-lg shadow-gray-900/10 transition hover:border-gray-300 hover:shadow-md"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border border-gray-200 bg-white text-2xl text-[#41372c]">
                {renderChatAvatar(botAvatar)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <span className="font-semibold text-gray-900">{title}</span>
                  {topTime ? (
                    <span className="shrink-0 text-xs text-gray-400 tabular-nums">
                      {topTime}
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 line-clamp-1 text-sm leading-snug text-gray-500 m-0">
                  {topPreview}
                </p>
              </div>
              <span
                className="self-end pb-0.5 text-lg"
                style={{ color: primaryColor }}
                aria-hidden
              >
                <HiChatBubbleLeftRight />
              </span>
            </button>
            <div className="flex flex-1 flex-col items-center justify-center px-6 py-8 text-center text-sm text-gray-400">
              <p className="m-0 max-w-xs">
                Tap the card to open your conversation history, or use the
                Conversation tab below.
              </p>
              <button
                type="button"
                onClick={() => {
                  void onStartNewConversation();
                }}
                disabled={disabled}
                className="mt-4 rounded-full px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ backgroundColor: primaryColor }}
              >
                Start new conversation
              </button>
            </div>
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col bg-white">
            {orderedConversations.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 text-center text-sm text-gray-500">
                <p className="m-0">No messages in this chat yet.</p>
              </div>
            ) : (
              <ul className="m-0 min-h-0 flex-1 list-none divide-y divide-gray-100 overflow-y-auto p-0">
                {orderedConversations.map((conversation, index) => {
                  const mostRecentMessage =
                    conversation.messages[conversation.messages.length - 1];
                  const preview = mostRecentMessage
                    ? previewForMessage(mostRecentMessage)
                    : '';
                  const isSessionEnded =
                    preview.toLowerCase().includes('session has ended') ||
                    preview.toLowerCase().includes('chat session has ended');
                  return (
                    <li key={conversation.id}>
                      <button
                        type="button"
                        onClick={() => onSelectConversation(conversation.id)}
                        className="w-full flex gap-3 px-3 py-3.5 text-left hover:bg-gray-50/80"
                      >
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-gray-200 bg-white text-lg text-[#41372c]">
                          {renderChatAvatar(
                            conversation.isCurrent ? botAvatar : userAvatar,
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-semibold text-gray-900">
                              {conversation.title}
                            </span>
                            <span className="shrink-0 text-xs text-gray-400 tabular-nums">
                              {mostRecentMessage
                                ? formatRelative(mostRecentMessage.timestamp)
                                : ''}
                            </span>
                          </div>
                          {isSessionEnded ? (
                            <p className="mt-1 line-clamp-1 text-sm italic text-gray-500 m-0">
                              {preview}
                            </p>
                          ) : (
                            <p className="mt-1 line-clamp-1 text-sm text-gray-500 m-0">
                              {preview || '—'}
                            </p>
                          )}
                        </div>
                        {index === 0 ? (
                          <span
                            className="shrink-0 self-center text-lg"
                            style={{ color: primaryColor }}
                            title="Latest"
                            aria-hidden
                          >
                            <HiChatBubbleLeftRight />
                          </span>
                        ) : (
                          <span className="w-6 shrink-0" aria-hidden />
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
            <div className="border-t border-gray-100 px-3 py-3">
              <button
                type="button"
                onClick={() => {
                  void onStartNewConversation();
                }}
                disabled={disabled}
                className="w-full rounded-full px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ backgroundColor: primaryColor }}
              >
                Start new conversation
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom navigation */}
      <nav
        className="shrink-0 border-t border-gray-200 bg-white px-2"
        aria-label="Hub navigation"
      >
        <div className="flex">
          <button
            type="button"
            onClick={() => setTab('home')}
            className={`relative flex flex-1 flex-col items-center gap-1 py-2.5 text-xs font-medium transition-colors ${
              tab === 'home' ? '' : 'text-gray-400 hover:text-gray-600'
            }`}
            style={tab === 'home' ? { color: primaryColor } : undefined}
          >
            <HiHome className="text-xl" aria-hidden />
            Home
            {tab === 'home' ? (
              <span
                className="absolute bottom-0 left-4 right-4 h-0.5 rounded-full"
                style={{ backgroundColor: primaryColor }}
              />
            ) : null}
          </button>
          <button
            type="button"
            onClick={() => setTab('conversations')}
            className={`relative flex flex-1 flex-col items-center gap-1 py-2.5 text-xs font-medium transition-colors ${
              tab === 'conversations' ? '' : 'text-gray-400 hover:text-gray-600'
            }`}
            style={tab === 'conversations' ? { color: primaryColor } : undefined}
          >
            <HiChatBubbleLeftRight className="text-xl" aria-hidden />
            Conversation
            {tab === 'conversations' ? (
              <span
                className="absolute bottom-0 left-4 right-4 h-0.5 rounded-full"
                style={{ backgroundColor: primaryColor }}
              />
            ) : null}
          </button>
        </div>
      </nav>

      <footer className="shrink-0 border-t border-gray-100 bg-white px-3 py-2 text-center">
        <p className="m-0 text-[10px] leading-tight text-gray-400">{footerBrand}</p>
      </footer>
    </div>
  );
};

export default ConversationHistoryList;
