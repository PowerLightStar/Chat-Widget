import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import ChatWidgetWithTransport from './ChatWidgetWithTransport';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <div className="relative h-full w-full min-h-0 bg-transparent">
      <ChatWidgetWithTransport />
    </div>
  </StrictMode>,
);
