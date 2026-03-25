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
  url?: string;
  preview?: string;
  uploadProgress?: number;
  status: 'uploading' | 'uploaded' | 'error';
}

export interface QuickButton {
  label: string;
  value: string;
}

export interface ChatWidgetProps {
  title?: string;
  subtitle?: string;
  botAvatar?: string | IconType;
  userAvatar?: string | IconType;
  placeholder?: string;
  onSendMessage?: (message: string, attachments?: File[]) => Promise<string | { text: string; attachments?: Attachment[] }>;
  onFileUpload?: (file: File) => Promise<Attachment>;
  onQuickButtonClick?: (value: string) => void;
  quickButtons?: QuickButton[];
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
  wsUrl?: string;
  sessionId?: string;
  sessionApiUrl?: string;
  onWsMessage?: (message: any) => void;
  onWsOpen?: () => void;
  onWsClose?: () => void;
}