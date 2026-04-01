import ChatWidgetWithTransport from './ChatWidgetWithTransport';

function App() {
  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">
            Murphy AI Chat Widget (Demo)
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

      <ChatWidgetWithTransport />
    </div>
  );
}

export default App;
