import React from 'react';
import type { IconType } from 'react-icons';

import type { ChatWidgetAvatar } from '../types/types';

export const renderChatAvatar = (avatar: ChatWidgetAvatar): React.ReactNode => {
  if (typeof avatar === 'string') {
    return avatar;
  }
  if (React.isValidElement(avatar)) {
    return avatar;
  }
  return React.createElement(avatar as IconType);
};
