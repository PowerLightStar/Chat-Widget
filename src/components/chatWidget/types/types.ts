import type { ReactElement } from 'react';
import type { IconType } from 'react-icons';

export type ChatWidgetAvatar = string | IconType | ReactElement;

export interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  status?: 'sent' | 'read';
  attachments?: Attachment[];
  metadata?: ChatWidgetWsMetadata;
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
  addBotMessage: (
    text: string,
    attachments?: Attachment[],
    metadata?: ChatWidgetWsMetadata,
  ) => Message;
  addUserMessage: (text: string, attachments?: Attachment[]) => Message;
  setTyping: (value: boolean) => void;
  setQuickButtons: (buttons: QuickButton[]) => void;
  resetQuickButtons: () => void;
  setInteractiveMode: (value: boolean) => void;
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
  isInteractiveMode: boolean;
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
  botAvatar?: ChatWidgetAvatar;
  userAvatar?: ChatWidgetAvatar;
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
  isConnected?: boolean;
}

export type ChatWidgetWsMessageType =
  | 'user_message'
  | 'agent_message'
  | 'interactive_request'
  | 'interactive_response'
  | 'typing_indicator'
  | 'error'
  | 'session_init';

export interface WsHistoryMessage {
  id?: string;
  message_id?: string;
  type?: string;
  sender?: 'user' | 'bot' | 'assistant' | 'agent';
  role?: 'user' | 'assistant' | 'agent';
  content?: string;
  text?: string;
  timestamp?: string;
  attachments?: Attachment[];
  metadata?: ChatWidgetWsMetadata;
}

export interface ChatWidgetProductCard {
  page_url?: string;
  image_url?: string;
  /** Display name for the product preview (optional). */
  product_name?: string;
}

export interface ChatWidgetWsMetadata {
  product_cards?: ChatWidgetProductCard[];
  [key: string]: unknown;
}

export interface ChatWidgetWsSessionInitMessage {
  type: 'session_init';
  session_id: string;
  timestamp: string;
  history: WsHistoryMessage[];
}

export interface ChatWidgetWsTypingIndicatorMessage {
  type: 'typing_indicator';
  is_typing?: boolean;
  timestamp?: string;
}

export interface ChatWidgetWsAgentMessage {
  type: 'agent_message';
  id?: string;
  content?: string;
  timestamp?: string;
  attachments?: Attachment[];
  metadata?: ChatWidgetWsMetadata;
}

export interface ChatWidgetWsInteractiveRequestMessage {
  type: 'interactive_request';
  interactive_type?: 'single_select' | 'multi_select';
  id?: string;
  request_id?: string;
  request?: string;
  question?: string;
  options?: Array<
    string | {
      id?: string;
      label?: string;
      value?: string;
      selectionMode?: 'single' | 'multiple';
      multi_select?: boolean;
      allow_multiple?: boolean;
    }
  >;
  timeout?: number;
  timestamp?: string;
  metadata?: ChatWidgetWsMetadata;
  [key: string]: unknown;
}

export interface ChatWidgetWsErrorMessage {
  type: 'error';
  error?: string;
  timestamp?: string;
  details?: string;
}

export type ChatWidgetWsInboundMessage =
  | ChatWidgetWsSessionInitMessage
  | ChatWidgetWsTypingIndicatorMessage
  | ChatWidgetWsAgentMessage
  | ChatWidgetWsInteractiveRequestMessage
  | ChatWidgetWsErrorMessage;
