import { useEffect, useRef } from 'react';
import logo from './assets/logo.svg';

import ChatWidget, {
  ChatWidgetProvider,
  useChatWidgetController,
} from './components/chatWidget';
import useWebSocketChatTransport from './hooks/useChatTransport';
import type { Attachment, ChatWidgetSendPayload } from './components/chatWidget/types/types';

const CHAT_WS_URL =
  import.meta.env.VITE_CHAT_WS_URL ?? 'ws://localhost:8000/ws/chat';
const CHAT_SESSION_API_URL =
  import.meta.env.VITE_CHAT_SESSION_API_URL ??
  'http://localhost:8000/api/v1/chat/session';

export default function ChatWidgetWithTransport() {
  useEffect(() => {
    if (typeof window === 'undefined' || window.parent === window) {
      return;
    }

    document.documentElement.classList.add('murphy-chat-embed');
    return () => {
      document.documentElement.classList.remove('murphy-chat-embed');
    };
  }, []);

  const handleFallbackMessage = async (
    message: string,
    attachments?: File[],
  ): Promise<string | { text: string; attachments?: Attachment[] }> => {
    await new Promise((resolve) => setTimeout(resolve, 1000));

    if (attachments && attachments.length > 0) {
      const uploadedAttachments: Attachment[] = attachments.map(
        (file, index) => ({
          id: Date.now().toString() + index,
          name: file.name,
          type: file.type,
          size: file.size,
          url: URL.createObjectURL(file),
          status: 'uploaded',
        }),
      );

      return {
        text: `Thanks for sending "${message}" with ${attachments.length} file(s)!`,
        attachments: uploadedAttachments,
      };
    }

    const responses: Record<string, string> = {
      default: 'Thanks for your message! Our team will get back to you soon.',
    };

    return responses.default;
  };

  const handleFileUpload = async (file: File): Promise<Attachment> => {
    await new Promise((resolve) => setTimeout(resolve, 2000));

    return {
      id: Date.now().toString(),
      name: file.name,
      type: file.type,
      size: file.size,
      url: URL.createObjectURL(file),
      status: 'uploaded',
    };
  };

  const transportRef = useRef<{
    sendMessage: (payload: ChatWidgetSendPayload) => Promise<boolean>;
    sendQuickButton: (value: string | string[]) => Promise<boolean>;
    createSession: () => Promise<string | null>;
  }>({
    sendMessage: async () => false,
    sendQuickButton: async () => false,
    createSession: async () => null,
  });

  const controller = useChatWidgetController({
    quickButtons: [],
    maxFiles: 5,
    onOpenChange: async (isOpen) => {
      if (isOpen) {
        await transportRef.current.createSession();
      }
    },
    onFileUpload: handleFileUpload,
    onSendMessage: async (payload, api) => {
      const sentThroughWebSocket = await transportRef.current.sendMessage(payload);
      if (sentThroughWebSocket) {
        return;
      }

      api.setTyping(true);

      try {
        const response = await handleFallbackMessage(payload.text, payload.files);
        return typeof response === 'string'
          ? response
          : { text: response.text, attachments: response.attachments };
      } finally {
        api.setTyping(false);
      }
    },
    onQuickButtonClick: async (value, api) => {
      const sentThroughWebSocket = await transportRef.current.sendQuickButton(value);
      if (sentThroughWebSocket) {
        return;
      }

      const selectedText = Array.isArray(value) ? value.join(', ') : value;
      api.setTyping(true);
      await new Promise((resolve) => setTimeout(resolve, 500));
      api.addBotMessage(`You selected: ${selectedText}. How can I assist further?`);
      api.setTyping(false);
    },
  });

  const transport = useWebSocketChatTransport({
    controller,
    wsUrl: CHAT_WS_URL,
    sessionApiUrl: CHAT_SESSION_API_URL,
  });
  transportRef.current = transport;

  return (
    <ChatWidgetProvider value={controller}>
      <ChatWidget
        title="Murphy AI"
        subtitle="Customer support, We usually reply within minutes"
        isConnected={transport.wsConnected}
        botAvatar={<img src={logo} alt="Bot Avatar" className="w-12 h-12 rounded-full" />}
        placeholder="Type your message or attach files..."
        primaryColor="#41372c"
        embedded={typeof window !== 'undefined' && window.parent !== window}
        position="bottom-right"
        width="400px"
        height="640px"
        showTimestamp={true}
        acceptFileTypes="image/*,.pdf,.doc,.docx,.txt,.xls,.xlsx"
        maxFileSize={10 * 1024 * 1024}
        maxFiles={5}
      />
    </ChatWidgetProvider>
  );
}
