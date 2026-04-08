import ChatWidgetWithTransport from './ChatWidgetWithTransport';
import WebSocketSchemaTester from './components/WebSocketSchemaTester';

function App() {
  const path = typeof window !== 'undefined' ? window.location.pathname : '/';
  const normalizedPath = path.endsWith('/') && path.length > 1 ? path.slice(0, -1) : path;
  const isSchemaTestRoute = normalizedPath === '/test';

  return (
    <div className="min-h-screen bg-gray-50">
      {isSchemaTestRoute ? <WebSocketSchemaTester /> : <ChatWidgetWithTransport />}
    </div>
  );
}

export default App;
