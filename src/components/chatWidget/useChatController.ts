import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type {
  Attachment,
  ChatWidgetController,
  ChatControllerApi,
  ChatSendResult,
  Message,
  QuickButton,
  UseChatWidgetControllerOptions,
  ChatWidgetWsMetadata,
} from './types/types';

const buildMessage = (
  sender: Message['sender'],
  text: string,
  attachments?: Attachment[],
  metadata?: ChatWidgetWsMetadata,
): Message => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
  text,
  sender,
  timestamp: new Date(),
  status: 'sent',
  attachments,
  ...(sender === 'bot' && metadata ? { metadata } : {}),
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
  const [isInteractiveMode, setIsInteractiveMode] = useState(false);
  const hasShownInitialQuickButtonsRef = useRef(false);

  useEffect(() => {
    setDefaultQuickButtons((prev) =>
      areQuickButtonsEqual(prev, quickButtons) ? prev : quickButtons,
    );
    setActiveQuickButtons((prev) =>
      areQuickButtonsEqual(prev, quickButtons) ? prev : quickButtons,
    );
    setSelectedQuickButtonValues([]);
    hasShownInitialQuickButtonsRef.current = false;
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

  useEffect(() => {
    if (
      !isOpen ||
      hasShownInitialQuickButtonsRef.current ||
      defaultQuickButtons.length === 0 ||
      messages.length > 0
    ) {
      return;
    }

    setActiveQuickButtons(defaultQuickButtons);
    hasShownInitialQuickButtonsRef.current = true;
  }, [defaultQuickButtons, isOpen, messages.length]);

  const addMessage = useCallback((
    sender: Message['sender'],
    text: string,
    attachments?: Attachment[],
    metadata?: ChatWidgetWsMetadata,
  ): Message => {
    const nextMessage = buildMessage(
      sender,
      text,
      attachments,
      sender === 'bot' ? metadata : undefined,
    );
    setMessagesState((prev) => [...prev, nextMessage]);
    return nextMessage;
  }, []);

  const setQuickButtons = useCallback((buttons: QuickButton[]) => {
    setActiveQuickButtons(buttons);
    setSelectedQuickButtonValues([]);
  }, []);

  const resetQuickButtons = useCallback(() => {
    setActiveQuickButtons([]);
    setSelectedQuickButtonValues([]);
  }, []);

  const api: ChatControllerApi = useMemo(() => ({
    addBotMessage: (text, attachments, metadata) =>
      addMessage('bot', text, attachments, metadata),
    addUserMessage: (text, attachments) => addMessage('user', text, attachments),
    setTyping: setIsTyping,
    setQuickButtons,
    resetQuickButtons,
    setInteractiveMode: setIsInteractiveMode,
  }), [addMessage, resetQuickButtons, setQuickButtons]);

  const uploadFile = useCallback(async (file: File): Promise<Attachment> => {
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
  }, [onFileUpload]);

  const handleFileSelect = useCallback(async (files: File[]) => {
    const availableSlots = Math.max(maxFiles - pendingAttachments.length, 0);
    const filesToUpload = files.slice(0, availableSlots);

    for (const file of filesToUpload) {
      try {
        await uploadFile(file);
      } catch (error) {
        console.error('Failed to upload file:', error);
      }
    }
  }, [maxFiles, pendingAttachments.length, uploadFile]);

  const removePendingAttachment = useCallback((id: string) => {
    setPendingAttachments((prev) => prev.filter((attachment) => attachment.id !== id));
  }, []);

  const retryUpload = useCallback(async (id: string) => {
    const failedAttachment = pendingAttachments.find((attachment) => attachment.id === id);
    if (!failedAttachment?.file) {
      return;
    }

    setPendingAttachments((prev) => prev.filter((attachment) => attachment.id !== id));
    await handleFileSelect([failedAttachment.file]);
  }, [handleFileSelect, pendingAttachments]);

  const sendMessage = useCallback(async () => {
    if (isTyping) {
      return;
    }

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
    setIsInteractiveMode(false);

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
  }, [api, inputMessage, isTyping, onSendMessage, pendingAttachments]);

  const triggerQuickButton = useCallback(async (values: string[]) => {
    if (isTyping) {
      return;
    }

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

    resetQuickButtons();
    setIsInteractiveMode(false);
  }, [activeQuickButtons, api, isTyping, onQuickButtonClick, resetQuickButtons]);

  const sendQuickButton = useCallback(async (value: string) => {
    if (isTyping) {
      return;
    }

    if (isQuickButtonMultiSelect) {
      setSelectedQuickButtonValues((prev) =>
        prev.includes(value)
          ? prev.filter((item) => item !== value)
          : [...prev, value],
      );
      return;
    }

    await triggerQuickButton([value]);
  }, [isQuickButtonMultiSelect, isTyping, triggerQuickButton]);

  const toggleQuickButtonSelection = useCallback((value: string) => {
    setSelectedQuickButtonValues((prev) =>
      prev.includes(value)
        ? prev.filter((item) => item !== value)
        : [...prev, value],
    );
  }, []);

  const submitQuickButtonSelection = useCallback(async () => {
    if (isTyping) {
      return;
    }

    if (selectedQuickButtonValues.length === 0) {
      return;
    }

    await triggerQuickButton(selectedQuickButtonValues);
  }, [isTyping, selectedQuickButtonValues, triggerQuickButton]);

  const clearQuickButtonSelection = useCallback(() => {
    setSelectedQuickButtonValues([]);
  }, []);

  const setOpenState = useCallback((nextIsOpen: boolean) => {
    setIsOpen(nextIsOpen);
    void onOpenChange?.(nextIsOpen, api);
  }, [api, onOpenChange]);

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
    isInteractiveMode,
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
