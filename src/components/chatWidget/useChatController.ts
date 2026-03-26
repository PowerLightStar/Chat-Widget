import { useEffect, useState } from 'react';

import type {
  Attachment,
  ChatWidgetController,
  ChatControllerApi,
  ChatSendResult,
  Message,
  QuickButton,
  UseChatWidgetControllerOptions,
} from './types/types';

const buildMessage = (
  sender: Message['sender'],
  text: string,
  attachments?: Attachment[],
): Message => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
  text,
  sender,
  timestamp: new Date(),
  status: 'sent',
  attachments,
});

const isChatSendResult = (
  value: string | ChatSendResult | void,
): value is ChatSendResult => {
  return typeof value === 'object' && value !== null && 'text' in value;
};

const areQuickButtonsEqual = (
  left: QuickButton[],
  right: QuickButton[],
): boolean => {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((button, index) => {
    const nextButton = right[index];
    return (
      button.label === nextButton?.label &&
      button.value === nextButton?.value &&
      button.selectionMode === nextButton?.selectionMode
    );
  });
};

const isMultiSelectQuickButtonSet = (buttons: QuickButton[]) => {
  return buttons.some((button) => button.selectionMode === 'multiple');
};

export const useChatWidgetController = ({
  initiallyOpen = false,
  quickButtons = [],
  maxFiles = 5,
  onOpenChange,
  onFileUpload,
  onSendMessage,
  onQuickButtonClick,
}: UseChatWidgetControllerOptions = {}): ChatWidgetController => {
  const [isOpen, setIsOpen] = useState(initiallyOpen);
  const [messages, setMessagesState] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pendingAttachments, setPendingAttachments] = useState<Attachment[]>([]);
  const [defaultQuickButtons, setDefaultQuickButtons] = useState<QuickButton[]>(
    quickButtons,
  );
  const [activeQuickButtons, setActiveQuickButtons] = useState<QuickButton[]>(
    quickButtons,
  );
  const [selectedQuickButtonValues, setSelectedQuickButtonValues] = useState<
    string[]
  >([]);

  useEffect(() => {
    setDefaultQuickButtons((prev) =>
      areQuickButtonsEqual(prev, quickButtons) ? prev : quickButtons,
    );
    setActiveQuickButtons((prev) =>
      areQuickButtonsEqual(prev, quickButtons) ? prev : quickButtons,
    );
    setSelectedQuickButtonValues([]);
  }, [quickButtons]);

  const isQuickButtonMultiSelect = isMultiSelectQuickButtonSet(activeQuickButtons);

  useEffect(() => {
    if (!isOpen && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.sender === 'bot' && lastMessage.status !== 'read') {
        setUnreadCount((prev) => prev + 1);
      }
    }
  }, [isOpen, messages]);

  useEffect(() => {
    if (!isOpen || unreadCount === 0) {
      return;
    }

    setUnreadCount(0);
    setMessagesState((prev) =>
      prev.map((message) =>
        message.sender === 'bot' && message.status !== 'read'
          ? { ...message, status: 'read' }
          : message,
      ),
    );
  }, [isOpen, unreadCount]);

  const addMessage = (
    sender: Message['sender'],
    text: string,
    attachments?: Attachment[],
  ): Message => {
    const nextMessage = buildMessage(sender, text, attachments);
    setMessagesState((prev) => [...prev, nextMessage]);
    return nextMessage;
  };

  const api: ChatControllerApi = {
    addBotMessage: (text, attachments) => addMessage('bot', text, attachments),
    addUserMessage: (text, attachments) => addMessage('user', text, attachments),
    setTyping: setIsTyping,
    setQuickButtons: (buttons) => {
      setActiveQuickButtons(buttons);
      setSelectedQuickButtonValues([]);
    },
    resetQuickButtons: () => {
      setActiveQuickButtons(defaultQuickButtons);
      setSelectedQuickButtonValues([]);
    },
  };

  const uploadFile = async (file: File): Promise<Attachment> => {
    const preview = file.type.startsWith('image/')
      ? URL.createObjectURL(file)
      : undefined;
    const attachmentId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const baseAttachment: Attachment = {
      id: attachmentId,
      name: file.name,
      type: file.type,
      size: file.size,
      file,
      preview,
      status: 'uploading',
      uploadProgress: 0,
    };

    setPendingAttachments((prev) => [...prev, baseAttachment]);

    if (!onFileUpload) {
      const uploadedAttachment = {
        ...baseAttachment,
        status: 'uploaded' as const,
        uploadProgress: 100,
      };

      setPendingAttachments((prev) =>
        prev.map((attachment) =>
          attachment.id === attachmentId ? uploadedAttachment : attachment,
        ),
      );

      return uploadedAttachment;
    }

    let progressTimer: number | undefined;

    try {
      progressTimer = window.setInterval(() => {
        setPendingAttachments((prev) =>
          prev.map((attachment) =>
            attachment.id === attachmentId
              ? {
                  ...attachment,
                  uploadProgress: Math.min(
                    (attachment.uploadProgress ?? 0) + 10,
                    90,
                  ),
                }
              : attachment,
          ),
        );
      }, 200);

      const uploadedAttachment = await onFileUpload(file);
      const nextAttachment: Attachment = {
        ...baseAttachment,
        ...uploadedAttachment,
        file,
        status: 'uploaded',
        uploadProgress: 100,
      };

      setPendingAttachments((prev) =>
        prev.map((attachment) =>
          attachment.id === attachmentId ? nextAttachment : attachment,
        ),
      );

      return nextAttachment;
    } catch (error) {
      setPendingAttachments((prev) =>
        prev.map((attachment) =>
          attachment.id === attachmentId
            ? { ...attachment, status: 'error' }
            : attachment,
        ),
      );
      throw error;
    } finally {
      if (progressTimer) {
        window.clearInterval(progressTimer);
      }
    }
  };

  const handleFileSelect = async (files: File[]) => {
    const availableSlots = Math.max(maxFiles - pendingAttachments.length, 0);
    const filesToUpload = files.slice(0, availableSlots);

    for (const file of filesToUpload) {
      try {
        await uploadFile(file);
      } catch (error) {
        console.error('Failed to upload file:', error);
      }
    }
  };

  const removePendingAttachment = (id: string) => {
    setPendingAttachments((prev) => prev.filter((attachment) => attachment.id !== id));
  };

  const retryUpload = async (id: string) => {
    const failedAttachment = pendingAttachments.find((attachment) => attachment.id === id);
    if (!failedAttachment?.file) {
      return;
    }

    setPendingAttachments((prev) => prev.filter((attachment) => attachment.id !== id));
    await handleFileSelect([failedAttachment.file]);
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() && pendingAttachments.length === 0) {
      return;
    }

    const attachments = pendingAttachments.filter(
      (attachment) => attachment.status === 'uploaded',
    );
    const files = attachments.flatMap((attachment) =>
      attachment.file ? [attachment.file] : [],
    );
    const messageText = inputMessage;

    api.addUserMessage(messageText, attachments);
    setInputMessage('');
    setPendingAttachments([]);

    if (!onSendMessage) {
      return;
    }

    try {
      const response = await onSendMessage(
        {
          text: messageText,
          attachments,
          files,
        },
        api,
      );

      if (typeof response === 'string') {
        api.addBotMessage(response);
      } else if (isChatSendResult(response)) {
        api.addBotMessage(response.text, response.attachments);
      }
    } catch {
      api.addBotMessage('Sorry, I encountered an error. Please try again.');
    }
  };

  const triggerQuickButton = async (values: string[]) => {
    const selectedButtons = activeQuickButtons.filter((button) =>
      values.includes(button.value),
    );
    const messageText = selectedButtons.length > 0
      ? selectedButtons.map((button) => button.label).join(', ')
      : values.join(', ');

    api.addUserMessage(messageText);

    if (onQuickButtonClick) {
      await onQuickButtonClick(
        values.length === 1 ? values[0] : values,
        api,
        selectedButtons,
      );
    }

    api.resetQuickButtons();
  };

  const sendQuickButton = async (value: string) => {
    if (isQuickButtonMultiSelect) {
      setSelectedQuickButtonValues((prev) =>
        prev.includes(value)
          ? prev.filter((item) => item !== value)
          : [...prev, value],
      );
      return;
    }

    await triggerQuickButton([value]);
  };

  const toggleQuickButtonSelection = (value: string) => {
    setSelectedQuickButtonValues((prev) =>
      prev.includes(value)
        ? prev.filter((item) => item !== value)
        : [...prev, value],
    );
  };

  const submitQuickButtonSelection = async () => {
    if (selectedQuickButtonValues.length === 0) {
      return;
    }

    await triggerQuickButton(selectedQuickButtonValues);
  };

  const clearQuickButtonSelection = () => {
    setSelectedQuickButtonValues([]);
  };

  const setOpenState = (nextIsOpen: boolean) => {
    setIsOpen(nextIsOpen);
    void onOpenChange?.(nextIsOpen, api);
  };

  return {
    ...api,
    isOpen,
    messages,
    inputMessage,
    isTyping,
    unreadCount,
    pendingAttachments,
    quickButtons: activeQuickButtons,
    selectedQuickButtonValues,
    isQuickButtonMultiSelect,
    openChat: () => setOpenState(true),
    closeChat: () => setOpenState(false),
    toggleChat: () => setOpenState(!isOpen),
    setInputMessage,
    setMessages: (nextMessages) => {
      if (typeof nextMessages === 'function') {
        setMessagesState(nextMessages);
        return;
      }

      setMessagesState(nextMessages);
    },
    handleFileSelect,
    removePendingAttachment,
    retryUpload,
    sendMessage,
    sendQuickButton,
    toggleQuickButtonSelection,
    submitQuickButtonSelection,
    clearQuickButtonSelection,
  };
};

export default useChatWidgetController;
