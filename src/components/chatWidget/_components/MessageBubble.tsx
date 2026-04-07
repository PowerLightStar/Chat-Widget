import React from 'react';
import type {
  ChatWidgetProductCard,
  ChatWidgetWsMetadata,
  Message,
  ChatWidgetAvatar,
} from '../types/types';
import FileAttachment from './FileAttachment';
import type { IconType } from 'react-icons';

type ProductUrlReplacement = { url: string; label: string; href: string };

const collectProductUrlReplacements = (
  cards: ChatWidgetProductCard[] | undefined,
): ProductUrlReplacement[] => {
  if (!Array.isArray(cards)) {
    return [];
  }

  const out: ProductUrlReplacement[] = [];
  for (const card of cards) {
    const label =
      typeof card.product_name === 'string' ? card.product_name.trim() : '';
    if (!label) {
      continue;
    }
    const page = typeof card.page_url === 'string' ? card.page_url.trim() : '';
    const img = typeof card.image_url === 'string' ? card.image_url.trim() : '';
    const href = page || img;
    if (!href) {
      continue;
    }
    if (page) {
      out.push({ url: page, label, href: page });
    }
    if (img && img !== page) {
      out.push({ url: img, label, href: page || img });
    }
  }

  out.sort((a, b) => b.url.length - a.url.length);
  return out;
};

const renderBotTextWithProductHighlights = (
  text: string,
  metadata: ChatWidgetWsMetadata | undefined,
): React.ReactNode => {
  const replacements = collectProductUrlReplacements(metadata?.product_cards);
  if (replacements.length === 0) {
    return text;
  }

  const nodes: React.ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < text.length) {
    let bestStart = -1;
    let best: ProductUrlReplacement | null = null;

    for (const r of replacements) {
      const pos = text.indexOf(r.url, i);
      if (pos < 0) {
        continue;
      }
      if (
        bestStart < 0 ||
        pos < bestStart ||
        (pos === bestStart && r.url.length > (best?.url.length ?? 0))
      ) {
        bestStart = pos;
        best = r;
      }
    }

    if (bestStart < 0 || !best) {
      nodes.push(text.slice(i));
      break;
    }

    if (bestStart > i) {
      nodes.push(text.slice(i, bestStart));
    }

    nodes.push(
      <a
        key={`product-highlight-${key++}`}
        href={best.href}
        target="_blank"
        rel="noopener noreferrer"
        className="inline font-semibold text-[#41372c] bg-amber-100 px-1.5 py-0.5 rounded-md shadow-sm ring-1 ring-amber-200/90 hover:ring-amber-300"
      >
        {best.label}
      </a>,
    );
    i = bestStart + best.url.length;
  }

  return nodes.length === 1 && typeof nodes[0] === 'string' ? nodes[0] : <>{nodes}</>;
};

export const renderChatAvatar = (avatar: ChatWidgetAvatar): React.ReactNode => {
  if (typeof avatar === 'string') {
    return avatar;
  }
  if (React.isValidElement(avatar)) {
    return avatar;
  }
  return React.createElement(avatar as IconType);
};

interface MessageBubbleProps {
  message: Message;
  avatar: ChatWidgetAvatar;
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
        {renderChatAvatar(avatar)}
      </div>
      <div className={`max-w-[70%] ${message.sender === 'user' ? 'items-end' : ''}`}>
        {message.text && (
          <div className={`px-3 py-2 rounded-2xl wrap-break-word text-base whitespace-pre-wrap ${
            message.sender === 'user'
              ? 'bg-[#786550] text-white'
              : 'bg-gray-100 text-gray-800'
          }`}>
            {message.sender === 'bot'
              ? renderBotTextWithProductHighlights(message.text, message.metadata)
              : message.text}
          </div>
        )}
        
        {message.attachments && message.attachments.length > 0 && (
          <div className="mt-2 space-y-2">
            {message.attachments.map((attachment) => (
              <div key={attachment.id}>
                {attachment.type.startsWith('image/') && attachment.url ? (
                  <div className="inline-block">
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
                    {attachment.type === 'image/product-card' && attachment.name ? (
                      <div
                        className={`mt-1 text-xs ${
                          message.sender === 'user' ? 'text-white/90' : 'text-gray-600'
                        }`}
                      >
                        {attachment.name}
                      </div>
                    ) : null}
                  </div>
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