import { createContext, useContext } from 'react';

import type { ChatWidgetController } from './types/types';

export const ChatWidgetContext = createContext<ChatWidgetController | null>(null);

export const useChatWidget = (): ChatWidgetController => {
  const context = useContext(ChatWidgetContext);

  if (!context) {
    throw new Error('useChatWidget must be used within a ChatWidgetProvider.');
  }

  return context;
};
