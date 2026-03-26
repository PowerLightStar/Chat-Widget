import { useCallback, useEffect, useRef, useState } from 'react';

import type {
  Attachment,
  ChatWidgetController,
  ChatWidgetSendPayload,
  QuickButton,
} from '../components/chatWidget/types/types';

interface WebSocketTransportMessage {
  type?: string;
  content?: string;
  attachments?: Attachment[];
  options?: Array<
    string | {
      id?: string;
      label?: string;
      value?: string;
      selectionMode?: 'single' | 'multiple';
      multi_select?: boolean;
      allow_multiple?: boolean;
    }
  >;
  is_typing?: boolean;
}

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
  onWsMessage?: (message: WebSocketTransportMessage) => void;
}

const toQuickButtons = (
  options: WebSocketTransportMessage['options'],
): QuickButton[] => {
  if (!Array.isArray(options)) {
    return [];
  }

  return options.map((option) => {
    if (typeof option === 'string') {
      return { label: option, value: option };
    }

    const label = option.label ?? option.value ?? option.id ?? 'Select';
    const value = option.value ?? option.id ?? label;
    const selectionMode =
      option.selectionMode === 'multiple' ||
      option.multi_select ||
      option.allow_multiple
        ? 'multiple'
        : 'single';

    return { label, value, selectionMode };
  });
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
      let data: WebSocketTransportMessage;

      try {
        data = JSON.parse(event.data) as WebSocketTransportMessage;
      } catch {
        console.warn('Invalid WS message:', event.data);
        return;
      }

      touchActivity();
      onWsMessage?.(data);

      if (data.type === 'typing_indicator') {
        controllerRef.current.setTyping(Boolean(data.is_typing));
      }

      if (data.type === 'agent_message') {
        controllerRef.current.setTyping(false);
        if (data.content) {
          controllerRef.current.addBotMessage(data.content, data.attachments);
        }

        if (data.options?.length) {
          controllerRef.current.setQuickButtons(toQuickButtons(data.options));
        } else {
          controllerRef.current.setQuickButtons([]);
        }
      }

      if (data.type === 'interactive_request' && data.options?.length) {
        controllerRef.current.setQuickButtons(toQuickButtons(data.options));
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
    wsRef.current.send(
      JSON.stringify({
        type: 'user_message',
        content: selections.join(', '),
        selections,
        message_id: String(Date.now()),
      }),
    );
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
