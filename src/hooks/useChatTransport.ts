import { useCallback, useEffect, useRef, useState } from 'react';

import type {
  Attachment,
  ChatWidgetWsMetadata,
  ChatWidgetWsInboundMessage,
  ChatWidgetWsInteractiveRequestMessage,
  ChatWidgetController,
  ChatWidgetSendPayload,
  QuickButton,
  WsHistoryMessage,
} from '../components/chatWidget/types/types';

type InteractiveOption = ChatWidgetWsInteractiveRequestMessage['options'];

interface UseWebSocketChatTransportOptions {
  controller: ChatWidgetController;
  wsUrl?: string;
  sessionApiUrl?: string;
  defaultSessionId?: string;
  storageKey?: string;
  inactivityTimeoutMs?: number;
  userId?: string;
  onWsOpen?: () => void;
  onWsClose?: () => void;
  onWsMessage?: (message: ChatWidgetWsInboundMessage) => void;
}

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

const getProductCardAttachments = (metadata?: ChatWidgetWsMetadata): Attachment[] => {
  const cards = metadata?.product_cards;
  if (!Array.isArray(cards)) {
    return [];
  }

  return cards
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
        id: `${Date.now()}-product-card-${index}`,
        name: displayName,
        type: 'image/product-card',
        size: 0,
        url: pageUrl,
        preview: imageUrl,
        status: 'uploaded' as const,
      };
    });
};

const mergeAttachments = (
  base?: Attachment[],
  metadata?: ChatWidgetWsMetadata,
): Attachment[] | undefined => {
  const productCards = getProductCardAttachments(metadata);
  const merged = [...(base ?? []), ...productCards];
  return merged.length > 0 ? merged : undefined;
};

const buildWsEndpoint = (wsUrl: string, sessionId: string | null) => {
  if (!sessionId) {
    return wsUrl;
  }

  if (wsUrl.includes('{session_id}')) {
    return wsUrl.replace('{session_id}', sessionId);
  }

  if (wsUrl.includes(sessionId)) {
    return wsUrl;
  }

  return wsUrl.endsWith('/') ? `${wsUrl}${sessionId}` : `${wsUrl}/${sessionId}`;
};

export const useWebSocketChatTransport = ({
  controller,
  wsUrl,
  sessionApiUrl,
  defaultSessionId,
  storageKey = 'chatSessionId',
  inactivityTimeoutMs = 60_000,
  userId = 'anonymous',
  onWsOpen,
  onWsClose,
  onWsMessage,
}: UseWebSocketChatTransportOptions) => {
  const [sessionId, setSessionId] = useState<string | null>(() => {
    if (defaultSessionId) {
      return defaultSessionId;
    }

    if (typeof window === 'undefined') {
      return null;
    }

    return localStorage.getItem(storageKey);
  });
  const [wsConnected, setWsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const inactivityTimeoutRef = useRef<number | null>(null);
  const controllerRef = useRef(controller);
  const pendingInteractiveRequestIdRef = useRef<string | null>(null);
  const initializedSessionIdRef = useRef<string | null>(null);

  const clearInteractiveState = useCallback(() => {
    controllerRef.current.setInteractiveMode(false);
    controllerRef.current.setQuickButtons([]);
    pendingInteractiveRequestIdRef.current = null;
  }, []);

  useEffect(() => {
    controllerRef.current = controller;
  }, [controller]);

  const touchActivity = useCallback(() => {
    if (inactivityTimeoutRef.current) {
      window.clearTimeout(inactivityTimeoutRef.current);
    }

    inactivityTimeoutRef.current = window.setTimeout(() => {
      localStorage.removeItem(storageKey);
      setSessionId(null);
    }, inactivityTimeoutMs);
  }, [inactivityTimeoutMs, storageKey]);

  useEffect(() => {
    return () => {
      if (inactivityTimeoutRef.current) {
        window.clearTimeout(inactivityTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!sessionId) {
      return;
    }

    touchActivity();
  }, [sessionId, touchActivity]);

  const createSession = useCallback(async () => {
    if (!sessionApiUrl || sessionId) {
      return sessionId;
    }

    try {
      const response = await fetch(sessionApiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId }),
      });
      const data = await response.json();
      const nextSessionId =
        typeof data?.id === 'string' ? data.id : null;

      if (nextSessionId) {
        setSessionId(nextSessionId);
        localStorage.setItem(storageKey, nextSessionId);
        touchActivity();
      }

      return nextSessionId;
    } catch (error) {
      console.warn('Failed to create session:', error);
      return null;
    }
  }, [sessionApiUrl, sessionId, storageKey, touchActivity, userId]);

  useEffect(() => {
    if (!wsUrl || !controller.isOpen) {
      return;
    }

    const endpoint = buildWsEndpoint(wsUrl, sessionId);
    const ws = new WebSocket(endpoint);
    wsRef.current = ws;

    ws.onopen = () => {
      setWsConnected(true);
      onWsOpen?.();
    };

    ws.onmessage = (event) => {
      let data: ChatWidgetWsInboundMessage;

      try {
        data = JSON.parse(event.data) as ChatWidgetWsInboundMessage;
      } catch {
        console.warn('Invalid WS message:', event.data);
        return;
      }

      touchActivity();
      onWsMessage?.(data);

      if (data.type === 'typing_indicator') {
        controllerRef.current.setTyping(Boolean(data.is_typing));
      }

      if (data.type === 'session_init') {
        const sessionInitId =
          typeof data.session_id === 'string' ? data.session_id : null;

        if (sessionInitId) {
          setSessionId(sessionInitId);
          localStorage.setItem(storageKey, sessionInitId);
        }

        if (
          Array.isArray(data.history) &&
          sessionInitId &&
          initializedSessionIdRef.current !== sessionInitId
        ) {
          initializedSessionIdRef.current = sessionInitId;
          for (const entry of data.history) {
            const text = getHistoryText(entry);
            if (!text) {
              continue;
            }

            if (isUserHistoryMessage(entry)) {
              controllerRef.current.addUserMessage(
                text,
                mergeAttachments(entry.attachments as Attachment[] | undefined, entry.metadata),
              );
            } else {
              controllerRef.current.addBotMessage(
                text,
                mergeAttachments(entry.attachments as Attachment[] | undefined, entry.metadata),
                entry.metadata,
              );
            }
          }
        }
      }

      if (data.type === 'agent_message') {
        clearInteractiveState();
        controllerRef.current.setTyping(false);
        const attachments = mergeAttachments(data.attachments, data.metadata);
        if (data.content || attachments) {
          controllerRef.current.addBotMessage(
            data.content ?? '',
            attachments,
            data.metadata,
          );
        }
      }

      if (data.type === 'interactive_request' && data.options?.length) {
        const requestText =
          typeof data.request === 'string' && data.request.trim()
            ? data.request.trim()
            : typeof data.question === 'string' && data.question.trim()
              ? data.question.trim()
              : '';
        const requestAttachments = mergeAttachments(undefined, data.metadata);
        if (requestText || requestAttachments) {
          controllerRef.current.addBotMessage(
            requestText,
            requestAttachments,
            data.metadata,
          );
        }
        controllerRef.current.setInteractiveMode(true);
        pendingInteractiveRequestIdRef.current =
          typeof data.id === 'string'
            ? data.id
            : typeof data.request_id === 'string'
              ? data.request_id
              : null;
        controllerRef.current.setQuickButtons(
          toQuickButtons(data.options, data.interactive_type),
        );
      } else if (data.type === 'interactive_request') {
        clearInteractiveState();
      }

      if (data.type === 'error') {
        clearInteractiveState();
        controllerRef.current.setTyping(false);
        controllerRef.current.addBotMessage(
          data.error || 'Something went wrong. Please try again.',
        );
      }
    };

    ws.onclose = () => {
      setWsConnected(false);
      onWsClose?.();
    };

    ws.onerror = (error) => {
      console.error('WebSocket error', error);
    };

    return () => {
      ws.close();
      wsRef.current = null;
      setWsConnected(false);
    };
  }, [
    controller.isOpen,
    onWsClose,
    clearInteractiveState,
    onWsMessage,
    onWsOpen,
    sessionId,
    touchActivity,
    wsUrl,
  ]);

  const sendMessage = async ({ text }: ChatWidgetSendPayload) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      return false;
    }

    touchActivity();
    controllerRef.current.setTyping(true);
    wsRef.current.send(
      JSON.stringify({
        type: 'user_message',
        content: text,
        message_id: String(Date.now()),
      }),
    );
    return true;
  };

  const sendQuickButton = async (value: string | string[]) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      return false;
    }

    touchActivity();
    controllerRef.current.setTyping(true);
    const selections = Array.isArray(value) ? value : [value];
    const requestId = pendingInteractiveRequestIdRef.current;
    if (requestId) {
      wsRef.current.send(
        JSON.stringify({
          type: 'interactive_response',
          request_id: requestId,
          selections,
        }),
      );
      pendingInteractiveRequestIdRef.current = null;
    } else {
      wsRef.current.send(
        JSON.stringify({
          type: 'user_message',
          content: selections.join(', '),
          message_id: String(Date.now()),
        }),
      );
    }
    return true;
  };

  return {
    sessionId,
    wsConnected,
    createSession,
    sendMessage,
    sendQuickButton,
  };
};

export default useWebSocketChatTransport;
