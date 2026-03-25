import ChatWidget from "./components/ChatWidget";
import type { Attachment } from "./types";

function App() {
  const handleSendMessage = async (
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
      hello: "Hi there! How can I help you today?",
      help: "I can help you with orders, shipping, or general questions. You can also send me files!",
      order: "Please provide your order number and I'll check the status.",
      default: "Thanks for your message! Our team will get back to you soon.",
    };

    const lowerMessage = message.toLowerCase();
    for (const [key, response] of Object.entries(responses)) {
      if (lowerMessage.includes(key)) {
        return response;
      }
    }

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

  const quickButtons = [
    { label: "🖼️ Send Image", value: "I want to send an image" },
    { label: "📄 Send Document", value: "I want to share a document" },
    { label: "❓ Help", value: "I need help with something" },
    { label: "📞 Contact Support", value: "I want to contact support" },
  ];

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

      <ChatWidget
        title="Customer Support"
        subtitle="We usually reply within minutes"
        placeholder="Type your message or attach files..."
        onSendMessage={handleSendMessage}
        onFileUpload={handleFileUpload}
        quickButtons={quickButtons}
        primaryColor="#41372c"
        position="bottom-right"
        showTimestamp={true}
        acceptFileTypes="image/*,.pdf,.doc,.docx,.txt,.xls,.xlsx"
        maxFileSize={10 * 1024 * 1024}
        maxFiles={5}
      />
    </div>
  );
}

export default App;
