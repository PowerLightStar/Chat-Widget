import type { ReactNode } from 'react';

import type { ChatWidgetController } from './types/types';
import { ChatWidgetContext } from './useContext';

interface ChatWidgetProviderProps {
  value: ChatWidgetController;
  children: ReactNode;
}

const ChatWidgetProvider = ({
  value,
  children,
}: ChatWidgetProviderProps) => {
  return (
    <ChatWidgetContext.Provider value={value}>
      {children}
    </ChatWidgetContext.Provider>
  );
};

export default ChatWidgetProvider;
