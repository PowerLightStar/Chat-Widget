import type { IconType } from 'react-icons';

export interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  status?: 'sent' | 'read';
  attachments?: Attachment[];
}

export interface Attachment {
  id: string;
  name: string;
  type: string;
  size: number;
  file?: File;
  url?: string;
  preview?: string;
  uploadProgress?: number;
  status: 'uploading' | 'uploaded' | 'error';
}

export interface QuickButton {
  label: string;
  value: string;
  selectionMode?: 'single' | 'multiple';
}

export interface ChatWidgetSendPayload {
  text: string;
  attachments: Attachment[];
  files: File[];
}

export interface ChatSendResult {
  text: string;
  attachments?: Attachment[];
}

export interface ChatControllerApi {
  addBotMessage: (text: string, attachments?: Attachment[]) => Message;
  addUserMessage: (text: string, attachments?: Attachment[]) => Message;
  setTyping: (value: boolean) => void;
  setQuickButtons: (buttons: QuickButton[]) => void;
  resetQuickButtons: () => void;
}

export interface ChatWidgetController extends ChatControllerApi {
  isOpen: boolean;
  messages: Message[];
  inputMessage: string;
  isTyping: boolean;
  unreadCount: number;
  pendingAttachments: Attachment[];
  quickButtons: QuickButton[];
  selectedQuickButtonValues: string[];
  isQuickButtonMultiSelect: boolean;
  openChat: () => void;
  closeChat: () => void;
  toggleChat: () => void;
  setInputMessage: (value: string) => void;
  setMessages: (
    nextMessages: Message[] | ((messages: Message[]) => Message[]),
  ) => void;
  handleFileSelect: (files: File[]) => Promise<void>;
  removePendingAttachment: (id: string) => void;
  retryUpload: (id: string) => Promise<void>;
  sendMessage: () => Promise<void>;
  sendQuickButton: (value: string) => Promise<void>;
  toggleQuickButtonSelection: (value: string) => void;
  submitQuickButtonSelection: () => Promise<void>;
  clearQuickButtonSelection: () => void;
}

export interface UseChatWidgetControllerOptions {
  initiallyOpen?: boolean;
  quickButtons?: QuickButton[];
  maxFiles?: number;
  onOpenChange?: (
    isOpen: boolean,
    api: ChatControllerApi,
  ) => Promise<void> | void;
  onFileUpload?: (file: File) => Promise<Attachment>;
  onSendMessage?: (
    payload: ChatWidgetSendPayload,
    api: ChatControllerApi,
  ) => Promise<string | ChatSendResult | void> | string | ChatSendResult | void;
  onQuickButtonClick?: (
    value: string | string[],
    api: ChatControllerApi,
    buttons?: QuickButton[],
  ) => Promise<void> | void;
}

export interface ChatWidgetProps {
  title?: string;
  subtitle?: string;
  botAvatar?: string | IconType;
  userAvatar?: string | IconType;
  placeholder?: string;
  controller?: ChatWidgetController;
  primaryColor?: string;
  position?: 'bottom-right' | 'bottom-left';
  width?: string;
  height?: string;
  showTimestamp?: boolean;
  initiallyOpen?: boolean;
  acceptFileTypes?: string;
  maxFileSize?: number; // in bytes
  maxFiles?: number;
  allowFileUpload?: boolean;
}
