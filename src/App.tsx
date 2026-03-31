import { useRef } from 'react';
import logo from './assets/logo.svg';

import ChatWidget, {
  ChatWidgetProvider,
  useChatWidgetController,
} from './components/chatWidget';
import useWebSocketChatTransport from './hooks/useChatTransport';
import type { Attachment, ChatWidgetSendPayload } from './components/chatWidget/types/types';

const DEFAULT_QUICK_BUTTONS = [
  {
    label: 'Contact Support',
    value: 'I want to contact support',
    selectionMode: 'single' as const,
  },
];

const CHAT_WS_URL =
  import.meta.env.VITE_CHAT_WS_URL ?? 'ws://localhost:8000/ws/chat';
const CHAT_SESSION_API_URL =
  import.meta.env.VITE_CHAT_SESSION_API_URL ??
  'http://localhost:8000/api/v1/chat/session';

function App() {
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
          status: "uploaded",
        }),
      );

      return {
        text: `Thanks for sending "${message}" with ${attachments.length} file(s)!`,
        attachments: uploadedAttachments,
      };
    }

    const responses: Record<string, string> = {
      default: "Thanks for your message! Our team will get back to you soon.",
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
      status: "uploaded",
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
    quickButtons: DEFAULT_QUICK_BUTTONS,
    maxFiles: 5,
    onOpenChange: async (isOpen) => {
      if (isOpen) {
        await transportRef.current.createSession();
      }
    },
    onFileUpload: handleFileUpload,
    onSendMessage: async (
      payload,
      api,
    ) => {
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
    <div className="min-h-screen bg-linear-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">
            Chat Widget with File Upload
          </h1>
          <p className="text-lg text-gray-600 mb-2">
            Try sending files through the chat widget!
          </p>
          <div className="bg-white rounded-lg shadow-md p-6 mb-8 text-left">
            <h2 className="font-semibold text-gray-700 mb-3">Features:</h2>
            <ul className="space-y-2 text-gray-600">
              <li className="flex items-center gap-2">
                ✓ File uploads (images, PDFs, documents)
              </li>
              <li className="flex items-center gap-2">
                ✓ Multiple file support
              </li>
              <li className="flex items-center gap-2">
                ✓ Upload progress indicators
              </li>
              <li className="flex items-center gap-2">✓ Image previews</li>
              <li className="flex items-center gap-2">
                ✓ Quick response buttons
              </li>
              <li className="flex items-center gap-2">
                ✓ Fully customizable with Tailwind CSS
              </li>
            </ul>
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500">
                📎 Supported: Images, PDFs, Word docs, Text files, Excel
                <br />
                💾 Max size: 10MB per file
                <br />
                🔄 Max files: 5 per message
              </p>
            </div>
          </div>
        </div>
      </div>

      <ChatWidgetProvider value={controller}>
        <ChatWidget
          title="Murphy AI"
          subtitle="Customer support, We usually reply within minutes"
          isConnected={transport.wsConnected}
          botAvatar={<img src={logo} alt="Bot Avatar" className="w-12 h-12 rounded-full" />}
          placeholder="Type your message or attach files..."
          primaryColor="#41372c"
          position="bottom-right"
          showTimestamp={true}
          acceptFileTypes="image/*,.pdf,.doc,.docx,.txt,.xls,.xlsx"
          maxFileSize={10 * 1024 * 1024}
          maxFiles={5}
          allowFileUpload={true}
        />
      </ChatWidgetProvider>
    </div>
  );
}

export default App;
