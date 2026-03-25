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
  botAvatar?: string;
  userAvatar?: string;
  placeholder?: string;
  onSendMessage?: (message: string, attachments?: File[]) => Promise<string | { text: string; attachments?: Attachment[] }>;
  onFileUpload?: (file: File) => Promise<Attachment>;
  onQuickButtonClick?: (value: string) => void;
  quickButtons?: QuickButton[];
  primaryColor?: string;
  position?: 'bottom-right' | 'bottom-left';
  height?: string;
  width?: string;
  showTimestamp?: boolean;
  initiallyOpen?: boolean;
  acceptFileTypes?: string;
  maxFileSize?: number; // in bytes
  maxFiles?: number;
}