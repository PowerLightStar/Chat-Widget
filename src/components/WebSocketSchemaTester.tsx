import { useCallback, useState } from 'react';
import { ImUser } from 'react-icons/im';
import { RiRobot2Fill } from 'react-icons/ri';
import { ThreeDot } from 'react-loading-indicators';

import MessageBubble from './chatWidget/_components/MessageBubble';
import QuickButtons from './chatWidget/_components/QuickButtons';
import type {
  ChatWidgetWsAgentMessage,
  ChatWidgetWsInteractiveRequestMessage,
  ChatWidgetWsMetadata,
  ChatWidgetWsSessionInitMessage,
  Message,
  QuickButton,
  WsHistoryMessage,
} from './chatWidget/types/types';

type ClientEventType = 'user_message' | 'interactive_response' | 'typing_indicator';

interface WsLogEntry {
  id: string;
  direction: 'sent' | 'received' | 'system';
  payload: unknown;
  timestamp: string;
}

const PRIMARY_COLOR = '#41372c';

const formatNowIso = () => new Date().toISOString();

const stringifyPayload = (payload: unknown): string => {
  try {
    return JSON.stringify(payload, null, 2);
  } catch {
    return String(payload);
  }
};

const createId = () =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const parseWsTimestamp = (value?: string): Date => {
  if (!value) {
    return new Date();
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
};

const getHistoryText = (entry: WsHistoryMessage): string => {
  if (typeof entry.content === 'string') {
    return entry.content;
  }
  if (typeof entry.text === 'string') {
    return entry.text;
  }
  return '';
};

const isUserHistoryMessage = (entry: WsHistoryMessage): boolean => {
  return entry.sender === 'user' || entry.role === 'user' || entry.type === 'user_message';
};

const getProductCardAttachments = (metadata?: ChatWidgetWsMetadata): Message['attachments'] => {
  const cards = metadata?.product_cards;
  if (!Array.isArray(cards)) {
    return undefined;
  }

  const mapped = cards
    .filter((card) => typeof card?.image_url === 'string' && card.image_url.trim())
    .map((card, index) => {
      const imageUrl = card.image_url!.trim();
      const pageUrl =
        typeof card.page_url === 'string' && card.page_url.trim()
          ? card.page_url.trim()
          : imageUrl;
      const displayName =
        typeof card.product_name === 'string' && card.product_name.trim()
          ? card.product_name.trim()
          : `Product card ${index + 1}`;
      return {
        id: `${Date.now()}-preview-product-card-${index}`,
        name: displayName,
        type: 'image/product-card',
        size: 0,
        url: pageUrl,
        preview: imageUrl,
        status: 'uploaded' as const,
      };
    });

  return mapped.length > 0 ? mapped : undefined;
};

const mergeAttachments = (
  base?: Message['attachments'],
  metadata?: ChatWidgetWsMetadata,
): Message['attachments'] => {
  const cards = getProductCardAttachments(metadata);
  const merged = [...(base ?? []), ...(cards ?? [])];
  return merged.length > 0 ? merged : undefined;
};

type InteractiveOption = ChatWidgetWsInteractiveRequestMessage['options'];

const toQuickButtons = (
  options: InteractiveOption,
  interactiveType?: ChatWidgetWsInteractiveRequestMessage['interactive_type'],
): QuickButton[] => {
  if (!Array.isArray(options)) {
    return [];
  }

  return options.map((option) => {
    if (typeof option === 'string') {
      return {
        label: option,
        value: option,
        selectionMode: interactiveType === 'multi_select' ? 'multiple' : 'single',
      };
    }

    const label = option.label ?? option.value ?? option.id ?? 'Select';
    const value = option.value ?? option.id ?? label;
    const selectionMode =
      interactiveType === 'multi_select' ||
      option.selectionMode === 'multiple' ||
      option.multi_select ||
      option.allow_multiple
        ? 'multiple'
        : 'single';

    return { label, value, selectionMode };
  });
};

const SAMPLE_SESSION_INIT: ChatWidgetWsSessionInitMessage = {
  type: 'session_init',
  session_id: 'f2fddeeb-8f12-4da5-bc80-b4fa6d0d65e5',
  timestamp: '2026-03-27T10:30:45.123456',
  history: [
    {
      type: 'user_message',
      content: 'Hello from history',
      message_id: 'hist-user-1',
      timestamp: '2026-03-27T10:29:00.000000',
    },
    {
      type: 'agent_message',
      content: 'Welcome back. How can I help?',
      id: 'hist-bot-1',
      timestamp: '2026-03-27T10:29:05.000000',
    },
  ],
};

const SAMPLE_AGENT_MESSAGE: ChatWidgetWsAgentMessage = {
  type: 'agent_message',
  content:
    'Here is a link: https://www.herndonupholstery.com/product/alexis-platinum/',
  metadata: {
    product_cards: [
      {
        page_url: 'https://www.herndonupholstery.com/product/alexis-platinum/',
        image_url:
          'https://www.herndonupholstery.com/wp-content/uploads/2023/10/ALEXIS-PLATINUM.jpg',
        product_name: 'Sample Product Name',
      },
    ],
    model: 'gpt-4o',
    tokens: 100,
  },
  id: '1f8f9ef2-924e-4ed1-bf95-43f6738ec2a7',
  timestamp: '2026-03-27T10:31:05.222222',
};

const SAMPLE_AGENT_TIMEOUT: ChatWidgetWsAgentMessage = {
  type: 'agent_message',
  content: "I noticed you didn't respond. Would you like to continue?",
  metadata: { timeout: true },
  id: 'timeout-msg-1',
  timestamp: '2026-03-27T10:32:00.000000',
};

const SAMPLE_INTERACTIVE_SINGLE: ChatWidgetWsInteractiveRequestMessage = {
  type: 'interactive_request',
  interactive_type: 'single_select',
  request: 'Please choose one',
  options: [
    { id: '1', label: 'Yes', value: 'yes' },
    { id: '2', label: 'No', value: 'no' },
  ],
  required: true,
  timeout: 30,
  id: '35d3f4c3-dae1-49b8-b9d7-5c2028f530ca',
  timestamp: '2026-03-27T10:31:10.333333',
};

const SAMPLE_INTERACTIVE_MULTI: ChatWidgetWsInteractiveRequestMessage = {
  type: 'interactive_request',
  interactive_type: 'multi_select',
  request: 'Select all that apply',
  options: [
    { id: '1', label: 'Option A', value: 'a' },
    { id: '2', label: 'Option B', value: 'b' },
    { id: '3', label: 'Option C', value: 'c' },
  ],
  required: true,
  timeout: 30,
  id: '84f58d23-3d34-4475-bbb8-4f98f6ef1424',
  timestamp: '2026-03-27T10:31:11.333333',
};

const SAMPLE_INTERACTIVE_MULTI_WITH_IMAGES: ChatWidgetWsInteractiveRequestMessage = {
  type: 'interactive_request',
  interactive_type: 'multi_select',
  request:
    'Choose one or more products from these links: https://shop.example.com/product/alexis-platinum/ and https://shop.example.com/product/modern-linen/',
  options: [
    { id: '1', label: 'Alexis Platinum', value: 'alexis_platinum' },
    { id: '2', label: 'Modern Linen', value: 'modern_linen' },
    { id: '3', label: 'Need more details', value: 'need_more_details' },
  ],
  metadata: {
    product_cards: [
      {
        page_url: 'https://shop.example.com/product/alexis-platinum/',
        image_url:
          'https://www.herndonupholstery.com/wp-content/uploads/2023/10/ALEXIS-PLATINUM.jpg',
        product_name: 'Alexis Platinum',
      },
      {
        page_url: 'https://shop.example.com/product/modern-linen/',
        image_url:
          'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=900&q=80',
        product_name: 'Modern Linen',
      },
    ],
  },
  required: true,
  timeout: 30,
  id: 'd4f3db1c-9a4c-4d75-a90f-14f9c0c38f66',
  timestamp: '2026-03-27T10:31:12.333333',
};

const SAMPLE_ERROR = {
  type: 'error' as const,
  error: 'Invalid session',
  timestamp: '2026-03-27T10:30:45.000000',
};

const SAMPLE_TYPING_TRUE = {
  type: 'typing_indicator' as const,
  is_typing: true,
  timestamp: '2026-03-27T10:31:01.000000',
};

const SAMPLE_TYPING_FALSE = {
  type: 'typing_indicator' as const,
  is_typing: false,
  timestamp: '2026-03-27T10:31:06.000000',
};

export default function WebSocketSchemaTester() {
  const [eventType, setEventType] = useState<ClientEventType>('user_message');
  const [content, setContent] = useState('How can I connect my database?');
  const [messageId, setMessageId] = useState(createId());
  const [requestId, setRequestId] = useState('');
  const [selectionsText, setSelectionsText] = useState('continue');
  const [isTyping, setIsTyping] = useState(true);
  const [logs, setLogs] = useState<WsLogEntry[]>([]);

  const [previewMessages, setPreviewMessages] = useState<Message[]>([]);
  const [previewTyping, setPreviewTyping] = useState(false);
  const [previewQuickButtons, setPreviewQuickButtons] = useState<QuickButton[]>([]);
  const [previewMultiSelect, setPreviewMultiSelect] = useState(false);
  const [previewSelectedValues, setPreviewSelectedValues] = useState<string[]>([]);
  const [previewSessionLabel, setPreviewSessionLabel] = useState<string | null>(null);

  const addLog = (direction: WsLogEntry['direction'], payload: unknown) => {
    const entry: WsLogEntry = {
      id: createId(),
      direction,
      payload,
      timestamp: formatNowIso(),
    };
    setLogs((prev) => [entry, ...prev].slice(0, 100));
  };

  const clearInteractivePreview = useCallback(() => {
    setPreviewQuickButtons([]);
    setPreviewMultiSelect(false);
    setPreviewSelectedValues([]);
  }, []);

  const appendUserPreview = useCallback((text: string, id?: string) => {
    if (!text.trim()) {
      return;
    }
    setPreviewMessages((prev) => [
      ...prev,
      {
        id: id?.trim() || createId(),
        text: text.trim(),
        sender: 'user',
        timestamp: new Date(),
      },
    ]);
  }, []);

  const appendBotPreview = useCallback((text: string, id?: string, at?: Date) => {
    if (!text.trim()) {
      return;
    }
    setPreviewMessages((prev) => [
      ...prev,
      {
        id: id?.trim() || createId(),
        text: text.trim(),
        sender: 'bot',
        timestamp: at ?? new Date(),
      },
    ]);
  }, []);

  const applyInboundToPreview = useCallback(
    (data: unknown) => {
      if (!data || typeof data !== 'object' || !('type' in data)) {
        return;
      }

      const typed = data as { type: string };

      if (typed.type === 'typing_indicator') {
        const d = data as { is_typing?: boolean };
        setPreviewTyping(Boolean(d.is_typing));
        return;
      }

      if (typed.type === 'session_init') {
        const d = data as ChatWidgetWsSessionInitMessage;
        const sid =
          typeof d.session_id === 'string' ? d.session_id : null;

        if (sid) {
          setPreviewSessionLabel(`Session ${sid} · ${d.timestamp ?? ''}`);
        } else {
          setPreviewSessionLabel(null);
        }

        setPreviewTyping(false);
        clearInteractivePreview();

        const next: Message[] = [];
        if (Array.isArray(d.history)) {
          for (const entry of d.history) {
            const text = getHistoryText(entry);
            if (!text) {
              continue;
            }
            next.push({
              id:
                (typeof entry.message_id === 'string' && entry.message_id) ||
                (typeof entry.id === 'string' && entry.id) ||
                createId(),
              text,
              sender: isUserHistoryMessage(entry) ? 'user' : 'bot',
              timestamp: parseWsTimestamp(entry.timestamp),
              attachments: mergeAttachments(entry.attachments, entry.metadata),
              metadata: !isUserHistoryMessage(entry) ? entry.metadata : undefined,
            });
          }
        }
        setPreviewMessages(next);
        return;
      }

      if (typed.type === 'agent_message') {
        const d = data as ChatWidgetWsAgentMessage;
        clearInteractivePreview();
        setPreviewTyping(false);
        const attachments = mergeAttachments(d.attachments, d.metadata);
        if (d.content || attachments) {
          setPreviewMessages((prev) => [
            ...prev,
            {
              id: d.id ?? createId(),
              text: (d.content ?? '').trim(),
              sender: 'bot',
              timestamp: parseWsTimestamp(d.timestamp),
              attachments,
              metadata: d.metadata,
            },
          ]);
        }
        return;
      }

      if (typed.type === 'interactive_request') {
        const d = data as ChatWidgetWsInteractiveRequestMessage;
        const buttons = toQuickButtons(d.options, d.interactive_type);
        if (typeof d.id === 'string') {
          setRequestId(d.id);
        }
        if (buttons.length > 0) {
          const prompt =
            typeof d.request === 'string' && d.request.trim()
              ? d.request.trim()
              : typeof d.question === 'string' && d.question.trim()
                ? d.question.trim()
                : null;
          const requestAttachments = mergeAttachments(undefined, d.metadata);
          if (prompt || requestAttachments) {
            setPreviewMessages((prev) => [
              ...prev,
              {
                id: d.id ? `interactive-${d.id}` : createId(),
                text: prompt ?? '',
                sender: 'bot',
                timestamp: parseWsTimestamp(d.timestamp),
                attachments: requestAttachments,
                metadata: d.metadata,
              },
            ]);
          }
          setPreviewQuickButtons(buttons);
          setPreviewMultiSelect(d.interactive_type === 'multi_select');
          setPreviewSelectedValues([]);
        } else {
          clearInteractivePreview();
        }
        return;
      }

      if (typed.type === 'error') {
        const d = data as { error?: string };
        clearInteractivePreview();
        setPreviewTyping(false);
        appendBotPreview(
          d.error?.trim() || 'Something went wrong. Please try again.',
        );
      }
    },
    [appendBotPreview, clearInteractivePreview],
  );

  const resetPreview = useCallback(() => {
    setPreviewMessages([]);
    setPreviewTyping(false);
    clearInteractivePreview();
    setPreviewSessionLabel(null);
  }, [clearInteractivePreview]);

  const applySample = useCallback(
    (payload: unknown) => {
      const entry: WsLogEntry = {
        id: createId(),
        direction: 'received',
        payload,
        timestamp: formatNowIso(),
      };
      setLogs((prev) => [entry, ...prev].slice(0, 100));
      applyInboundToPreview(payload);
    },
    [applyInboundToPreview],
  );

  const simulateClientPayload = () => {
    let payload: unknown;
    if (eventType === 'user_message') {
      const mid = messageId.trim() || createId();
      payload = {
        type: 'user_message',
        content,
        message_id: mid,
      };
      appendUserPreview(content, mid);
    } else if (eventType === 'interactive_response') {
      const selections = selectionsText
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean);
      payload = {
        type: 'interactive_response',
        request_id: requestId,
        selections,
      };
      appendUserPreview(selections.join(', '));
    } else {
      payload = {
        type: 'typing_indicator',
        is_typing: isTyping,
      };
      applyInboundToPreview(payload);
    }

    addLog('sent', payload);
  };

  const handlePreviewQuickClick = (value: string) => {
    if (previewTyping) {
      return;
    }

    if (previewMultiSelect) {
      setPreviewSelectedValues((prev) =>
        prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value],
      );
      return;
    }

    const btn = previewQuickButtons.find((b) => b.value === value);
    const text = btn?.label ?? value;
    appendUserPreview(text);
    clearInteractivePreview();
  };

  const handlePreviewSubmitSelection = () => {
    if (previewTyping || previewSelectedValues.length === 0) {
      return;
    }

    const selectedButtons = previewQuickButtons.filter((b) =>
      previewSelectedValues.includes(b.value),
    );
    const text =
      selectedButtons.length > 0
        ? selectedButtons.map((b) => b.label).join(', ')
        : previewSelectedValues.join(', ');
    appendUserPreview(text);
    clearInteractivePreview();
  };

  return (
    <section className="max-w-6xl mx-auto p-4 mt-4 bg-white rounded-lg shadow-sm border border-gray-200">
      <h2 className="text-xl font-semibold text-gray-900 mb-2">WebSocket Schema Tester (local)</h2>
      <p className="text-sm text-gray-600 mb-4">
        Offline playground for the chat WebSocket message shapes: sample inbound payloads update the
        preview and log; client payloads are simulated only (no network, no backend).
      </p>

      <div className="grid lg:grid-cols-2 gap-6 items-start">
        <div>
          <div className="border border-gray-200 rounded p-3 mb-4">
            <p className="text-xs font-semibold text-gray-600 mb-2">
              Simulate server → client (sample payloads)
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="text-xs px-2 py-1 rounded border border-gray-300 bg-gray-50 hover:bg-gray-100"
                onClick={() => applySample(SAMPLE_SESSION_INIT)}
              >
                session_init
              </button>
              <button
                type="button"
                className="text-xs px-2 py-1 rounded border border-gray-300 bg-gray-50 hover:bg-gray-100"
                onClick={() => applySample(SAMPLE_AGENT_MESSAGE)}
              >
                agent_message
              </button>
              <button
                type="button"
                className="text-xs px-2 py-1 rounded border border-gray-300 bg-gray-50 hover:bg-gray-100"
                onClick={() => applySample(SAMPLE_AGENT_TIMEOUT)}
              >
                agent_message (timeout)
              </button>
              <button
                type="button"
                className="text-xs px-2 py-1 rounded border border-gray-300 bg-gray-50 hover:bg-gray-100"
                onClick={() => applySample(SAMPLE_INTERACTIVE_SINGLE)}
              >
                interactive_request (single)
              </button>
              <button
                type="button"
                className="text-xs px-2 py-1 rounded border border-gray-300 bg-gray-50 hover:bg-gray-100"
                onClick={() => applySample(SAMPLE_INTERACTIVE_MULTI)}
              >
                interactive_request (multi)
              </button>
              <button
                type="button"
                className="text-xs px-2 py-1 rounded border border-gray-300 bg-gray-50 hover:bg-gray-100"
                onClick={() => applySample(SAMPLE_INTERACTIVE_MULTI_WITH_IMAGES)}
              >
                interactive_request (multi + images)
              </button>
              <button
                type="button"
                className="text-xs px-2 py-1 rounded border border-gray-300 bg-gray-50 hover:bg-gray-100"
                onClick={() => applySample(SAMPLE_ERROR)}
              >
                error
              </button>
              <button
                type="button"
                className="text-xs px-2 py-1 rounded border border-gray-300 bg-gray-50 hover:bg-gray-100"
                onClick={() => applySample(SAMPLE_TYPING_TRUE)}
              >
                typing true
              </button>
              <button
                type="button"
                className="text-xs px-2 py-1 rounded border border-gray-300 bg-gray-50 hover:bg-gray-100"
                onClick={() => applySample(SAMPLE_TYPING_FALSE)}
              >
                typing false
              </button>
              <button
                type="button"
                className="text-xs px-2 py-1 rounded border border-red-200 text-red-700 hover:bg-red-50"
                onClick={resetPreview}
              >
                Reset preview
              </button>
            </div>
          </div>

          <div className="border border-gray-200 rounded p-3 mb-4">
            <p className="text-xs font-semibold text-gray-600 mb-2">
              Simulate client → server (updates preview + log only)
            </p>
            <div className="grid md:grid-cols-2 gap-3 mb-3">
              <label className="text-sm text-gray-700">
                Client Event Type
                <select
                  className="mt-1 w-full border border-gray-300 rounded px-3 py-2"
                  value={eventType}
                  onChange={(event) => setEventType(event.target.value as ClientEventType)}
                >
                  <option value="user_message">user_message</option>
                  <option value="interactive_response">interactive_response</option>
                  <option value="typing_indicator">typing_indicator</option>
                </select>
              </label>
            </div>

            {eventType === 'user_message' && (
              <div className="grid md:grid-cols-2 gap-3">
                <label className="text-sm text-gray-700">
                  content
                  <input
                    className="mt-1 w-full border border-gray-300 rounded px-3 py-2"
                    value={content}
                    onChange={(event) => setContent(event.target.value)}
                  />
                </label>
                <label className="text-sm text-gray-700">
                  message_id
                  <input
                    className="mt-1 w-full border border-gray-300 rounded px-3 py-2"
                    value={messageId}
                    onChange={(event) => setMessageId(event.target.value)}
                  />
                </label>
              </div>
            )}

            {eventType === 'interactive_response' && (
              <div className="grid md:grid-cols-2 gap-3">
                <label className="text-sm text-gray-700">
                  request_id
                  <input
                    className="mt-1 w-full border border-gray-300 rounded px-3 py-2"
                    value={requestId}
                    onChange={(event) => setRequestId(event.target.value)}
                  />
                </label>
                <label className="text-sm text-gray-700">
                  selections (comma separated)
                  <input
                    className="mt-1 w-full border border-gray-300 rounded px-3 py-2"
                    value={selectionsText}
                    onChange={(event) => setSelectionsText(event.target.value)}
                  />
                </label>
              </div>
            )}

            {eventType === 'typing_indicator' && (
              <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={isTyping}
                  onChange={(event) => setIsTyping(event.target.checked)}
                />
                is_typing
              </label>
            )}

            <button
              type="button"
              onClick={simulateClientPayload}
              className="mt-3 px-3 py-2 rounded bg-blue-600 text-white"
            >
              Simulate send
            </button>
          </div>

          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-800">Event Log</h3>
            <button
              type="button"
              onClick={() => setLogs([])}
              className="text-xs px-2 py-1 rounded border border-gray-300 text-gray-700"
            >
              Clear
            </button>
          </div>

          <div className="max-h-80 overflow-y-auto border border-gray-200 rounded">
            {logs.length === 0 ? (
              <p className="p-3 text-sm text-gray-500">No events yet.</p>
            ) : (
              logs.map((entry) => (
                <div key={entry.id} className="border-b border-gray-100 p-3 text-xs font-mono">
                  <div className="mb-1 text-gray-500">
                    [{entry.timestamp}] {entry.direction.toUpperCase()}
                  </div>
                  <pre className="whitespace-pre-wrap break-words text-gray-800">
                    {stringifyPayload(entry.payload)}
                  </pre>
                </div>
              ))
            )}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-gray-800 mb-2">Widget UI preview</h3>
          <p className="text-xs text-gray-500 mb-2">
            Uses <code className="bg-gray-100 px-1 rounded">MessageBubble</code> and{' '}
            <code className="bg-gray-100 px-1 rounded">QuickButtons</code>. Interactive
            prompts use <code className="bg-gray-100 px-1 rounded">request</code> (or
            legacy <code className="bg-gray-100 px-1 rounded">question</code>) and render
            as a bot message before options.
          </p>
          <div
            className="rounded-xl shadow-lg border border-gray-200 overflow-hidden flex flex-col bg-white"
            style={{ maxHeight: 'min(70vh, 640px)' }}
          >
            <div
              className="text-white px-4 py-3 text-sm font-semibold shrink-0"
              style={{ backgroundColor: PRIMARY_COLOR }}
            >
              Preview · Murphy AI
            </div>
            {previewSessionLabel && (
              <div className="px-3 py-2 text-xs text-gray-600 bg-amber-50 border-b border-amber-100">
                {previewSessionLabel}
              </div>
            )}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[200px]">
              {previewMessages.map((message) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  avatar={message.sender === 'bot' ? RiRobot2Fill : ImUser}
                  showTimestamp
                />
              ))}
              {previewTyping && (
                <div className="flex gap-1 p-2 rounded-2xl w-fit">
                  <ThreeDot color={[PRIMARY_COLOR]} size="small" text="" textColor="" />
                </div>
              )}
            </div>
            {previewQuickButtons.length > 0 && (
              <QuickButtons
                buttons={previewQuickButtons}
                selectedValues={previewSelectedValues}
                isMultiSelect={previewMultiSelect}
                disabled={previewTyping}
                onButtonClick={handlePreviewQuickClick}
                onSubmitSelection={handlePreviewSubmitSelection}
                onClearSelection={() => setPreviewSelectedValues([])}
              />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
