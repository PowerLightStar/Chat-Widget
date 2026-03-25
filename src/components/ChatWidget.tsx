import React, { useState, useRef, useEffect } from "react";

import type { Message, ChatWidgetProps, Attachment } from "../types";
import MessageBubble from "./MessageBubble";
import QuickButtons from "./QuickButtons";
import FileUpload from "./FileUpload";
import FileAttachment from "./FileAttachment";

import { IoMdSend } from "react-icons/io";
import { MdOutlineClose } from "react-icons/md";
import { IoChatbubbleEllipsesOutline } from "react-icons/io5";
import { ImUser } from "react-icons/im";
import { ThreeDot } from "react-loading-indicators";
import { RiRobot2Fill } from "react-icons/ri";


const ChatWidget: React.FC<ChatWidgetProps> = ({
  title = "Chat Support",
  subtitle = "We usually reply in a few minutes",
  botAvatar = RiRobot2Fill,
  userAvatar = ImUser,
  placeholder = "Type a message...",
  onSendMessage,
  onFileUpload,
  onQuickButtonClick,
  quickButtons = [],
  primaryColor = "#41372c",
  position = "bottom-right",
  height = "80vh",
  width = "25vw",
  showTimestamp = true,
  initiallyOpen = false,
  acceptFileTypes = "image/*,.pdf,.doc,.docx,.txt,.xls,.xlsx",
  maxFileSize = 10 * 1024 * 1024,
  maxFiles = 5,
  allowFileUpload = false,
  wsUrl,
  sessionId: defaultSessionId,
  sessionApiUrl,
  onWsMessage,
  onWsOpen,
  onWsClose,
}) => {
  const [isOpen, setIsOpen] = useState(initiallyOpen);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pendingAttachments, setPendingAttachments] = useState<Attachment[]>(
    [],
  );
  const [sessionId, setSessionId] = useState<string | null>(defaultSessionId || null);
  const [wsConnected, setWsConnected] = useState(false);
  const [dynamicQuickButtons, setDynamicQuickButtons] = useState(quickButtons);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const inactivityTimeoutRef = useRef<number | null>(null);

  // Optionally, remove default greeting so websocket-driven replies show only
  useEffect(() => {
    // No default greeting - rely on websocket messages only
  }, [wsUrl]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    setDynamicQuickButtons(quickButtons);
  }, [quickButtons]);

  useEffect(() => {
    if (!isOpen && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.sender === "bot" && lastMessage.status !== "read") {
        setUnreadCount((prev) => prev + 1);
      }
    }
  }, [messages, isOpen]);

  useEffect(() => {
    const storedId = localStorage.getItem("chatSessionId");
    if (storedId) {
      setSessionId(storedId);
      updateActivity(); // Start inactivity timer
    }
  }, []);

  const updateActivity = () => {
    if (inactivityTimeoutRef.current) {
      clearTimeout(inactivityTimeoutRef.current);
    }
    inactivityTimeoutRef.current = setTimeout(() => {
      localStorage.removeItem("chatSessionId");
      setSessionId(null);
    }, 60000); // 1 minute
  };

  useEffect(() => {
    return () => {
      if (inactivityTimeoutRef.current) {
        clearTimeout(inactivityTimeoutRef.current);
      }
    };
  }, []);

  const createSession = async () => {
    if (sessionId || !sessionApiUrl) return;
    try {
      const res = await fetch(sessionApiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: "anonymous" }),
      });
      const data = await res.json();
      if (data?.id) {
        setSessionId(data.id);
        localStorage.setItem("chatSessionId", data.id);
        updateActivity(); // Start inactivity timer
      }
    } catch (error) {
      console.warn("Failed to create session:", error);
    }
  };

  useEffect(() => {
    if (isOpen && unreadCount > 0) {
      setUnreadCount(0);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.sender === "bot" && msg.status !== "read"
            ? { ...msg, status: "read" }
            : msg,
        ),
      );
    }
  }, [isOpen, unreadCount]);

  useEffect(() => {
    if (!wsUrl || !isOpen) return;

    // only connect when chat is open
    let wsEndpoint = wsUrl;
    if (sessionId) {
      if (wsUrl.includes("{session_id}")) {
        wsEndpoint = wsUrl.replace("{session_id}", sessionId);
      } else if (!wsUrl.includes(sessionId)) {
        wsEndpoint = wsUrl.endsWith("/") ? `${wsUrl}${sessionId}` : `${wsUrl}/${sessionId}`;
      }
    }

    const ws = new WebSocket(wsEndpoint);
    wsRef.current = ws;

    ws.onopen = () => {
      setWsConnected(true);
      console.log("WebSocket connected to", wsEndpoint);
      onWsOpen && onWsOpen();
    };

    ws.onmessage = (event) => {
      let data;
      try {
        data = JSON.parse(event.data);
      } catch (err) {
        console.warn("Invalid WS message", event.data);
        return;
      }

      updateActivity(); // Reset inactivity timer on WS message

      onWsMessage && onWsMessage(data);
      
      console.log("Received WS message:", data);

      if (data.type === "typing_indicator") {
        setIsTyping(data.is_typing || false);
      }

      if (data.type === "agent_message") {
        if (data.content) {
          addBotMessage(data.content, data.attachments);
        }
        // Handle quick buttons from agent_message if options are present
        if (data.options && Array.isArray(data.options) && data.options.length > 0) {
          const mapped = data.options.map((opt: any) => ({
            label: opt.label || String(opt),
            value: opt.value ?? opt.id ?? opt.label ?? String(opt)
          }));
          setDynamicQuickButtons(mapped);
        } else {
          // Clear quick buttons if no options
          setDynamicQuickButtons([]);
        }
      }

      if (data.type === "interactive_request" && Array.isArray(data.options)) {
        const mapped = data.options.map((opt: any) => ({
          label: opt.label || String(opt),
          value: opt.value ?? opt.id ?? opt.label ?? String(opt)
        }));
        setDynamicQuickButtons(mapped);
      }
    };

    ws.onclose = () => {
      setWsConnected(false);
      onWsClose && onWsClose();
    };

    ws.onerror = (err) => {
      console.error("WebSocket error", err);
    };

    return () => {
      ws.close();
      wsRef.current = null;
      setWsConnected(false);
    };
  }, [wsUrl, sessionId, onWsMessage, onWsOpen, onWsClose]);

  const addBotMessage = (text: string, attachments?: Attachment[]) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      text,
      sender: "bot",
      timestamp: new Date(),
      status: "sent",
      attachments,
    };
    setMessages((prev) => [...prev, newMessage]);
  };

  const addUserMessage = (text: string, attachments?: Attachment[]) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      text,
      sender: "user",
      timestamp: new Date(),
      status: "sent",
      attachments,
    };
    setMessages((prev) => [...prev, newMessage]);
  };

  const handleFileUpload = async (file: File): Promise<Attachment> => {
    let preview: string | undefined;
    if (file.type.startsWith("image/")) {
      preview = URL.createObjectURL(file);
    }

    const attachment: Attachment = {
      id: Date.now().toString() + Math.random(),
      name: file.name,
      type: file.type,
      size: file.size,
      preview,
      status: "uploading",
      uploadProgress: 0,
    };

    if (onFileUpload) {
      try {
        const interval = setInterval(() => {
          setPendingAttachments((prev) =>
            prev.map((att) =>
              att.id === attachment.id
                ? {
                    ...att,
                    uploadProgress: Math.min(
                      (att.uploadProgress || 0) + 10,
                      90,
                    ),
                  }
                : att,
            ),
          );
        }, 200);

        const uploadedAttachment = await onFileUpload(file);
        clearInterval(interval);

        setPendingAttachments((prev) =>
          prev.map((att) =>
            att.id === attachment.id
              ? {
                  ...uploadedAttachment,
                  status: "uploaded",
                  uploadProgress: 100,
                }
              : att,
          ),
        );

        return { ...attachment, ...uploadedAttachment, status: "uploaded" };
      } catch (error) {
        setPendingAttachments((prev) =>
          prev.map((att) =>
            att.id === attachment.id ? { ...att, status: "error" } : att,
          ),
        );
        throw error;
      }
    } else {
      setTimeout(() => {
        setPendingAttachments((prev) =>
          prev.map((att) =>
            att.id === attachment.id
              ? { ...att, status: "uploaded", url: "#", uploadProgress: 100 }
              : att,
          ),
        );
      }, 1500);

      return attachment;
    }
  };

  const handleFileSelect = async (files: File[]) => {
    const newAttachments: Attachment[] = [];

    for (const file of files) {
      try {
        const attachment = await handleFileUpload(file);
        newAttachments.push(attachment);
      } catch (error) {
        console.error("Failed to upload file:", error);
      }
    }

    setPendingAttachments((prev) => [...prev, ...newAttachments]);
  };

  const removePendingAttachment = (id: string) => {
    setPendingAttachments((prev) => prev.filter((att) => att.id !== id));
  };

  const retryUpload = (id: string) => {
    const failedAttachment = pendingAttachments.find((att) => att.id === id);
    if (failedAttachment) {
      handleFileSelect([
        new File([], failedAttachment.name, { type: failedAttachment.type }),
      ]);
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() && pendingAttachments.length === 0) return;

    updateActivity(); // Reset inactivity timer on send

    const userMessage = inputMessage;
    const attachments = [...pendingAttachments];

    addUserMessage(
      userMessage,
      attachments.filter((att) => att.status === "uploaded"),
    );

    setInputMessage("");
    setPendingAttachments([]);

    // Reset textarea height to original
    setTimeout(() => {
      const textarea = inputRef.current;
      if (textarea) {
        textarea.style.height = "auto";
      }
    }, 0);

    setIsTyping(true);

    console.log("ws Connected:", wsConnected, "WS Ref:", wsRef.current); // Debug log
    
    if (wsConnected && wsRef.current) {
      console.log("Sending WS message:", userMessage, attachments);
      wsRef.current.send(
        JSON.stringify({
          type: "user_message",
          content: userMessage,
          message_id: String(Date.now()),
        })
      );
      return;
    }

    if (!onSendMessage) {
      setIsTyping(false);
      return;
    }

    try {
      const files = attachments
        .filter((att) => att.status === "uploaded")
        .map((att) => new File([], att.name, { type: att.type }));

      const response = await onSendMessage(userMessage, files);

      if (typeof response === "string") {
        addBotMessage(response);
      } else {
        addBotMessage(response.text, response.attachments);
      }
    } catch (error) {
      addBotMessage("Sorry, I encountered an error. Please try again.");
    } finally {
      setIsTyping(false);
    }
  };

  const handleQuickButtonClick = (value: string) => {
    updateActivity(); // Reset inactivity timer on quick button click

    if (onQuickButtonClick) {
      onQuickButtonClick(value);
    }

    addUserMessage(value);

    if (wsConnected && wsRef.current) {
      wsRef.current.send(
        JSON.stringify({
          type: "user_message",
          content: value,
          message_id: String(Date.now()),
        }),
      );
    } else {
      setIsTyping(true);
      setTimeout(() => {
        addBotMessage(`You selected: ${value}. How can I assist further?`);
        setIsTyping(false);
      }, 500);
    }

    // clear dynamic quick buttons after selection
    setDynamicQuickButtons(quickButtons);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter") {
      if (e.shiftKey) {
        // Shift + Enter: add new line
        e.preventDefault();
        setInputMessage(inputMessage + "\n");
        // Auto-grow textarea
        setTimeout(() => {
          const textarea = inputRef.current;
          if (textarea) {
            textarea.style.height = "auto";
            textarea.style.height = Math.min(textarea.scrollHeight, 72) + "px";
          }
        }, 0);
      } else {
        // Enter: send message
        e.preventDefault();
        handleSendMessage();
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputMessage(e.target.value);
    // Auto-grow textarea
    setTimeout(() => {
      const textarea = inputRef.current;
      if (textarea) {
        textarea.style.height = "auto";
        textarea.style.height = Math.min(textarea.scrollHeight, 96) + "px";
      }
    }, 0);
  };

  const toggleChat = async () => {
    if (!isOpen) {
      // Only create session when opening chat
      console.log("Opening chat, sessionId:", sessionId);
      if (!sessionId) {
        await createSession();
      }
      updateActivity(); // Reset inactivity timer on open
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };

  const positionClasses = {
    "bottom-right": "bottom-5 right-5",
    "bottom-left": "bottom-5 left-5",
  };

  return (
    <div
      className={`fixed z-1000 ${positionClasses[position]} flex flex-col items-end gap-3`}
    >
      {isOpen && (
        <div
          className="bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden animate-slide-up"
          style={{ width, height }}
        >
          {/* Header */}
          <div
            className="text-white p-4 flex justify-between items-center"
            style={{ backgroundColor: primaryColor }}
          >
            <div className="flex items-center gap-2">
              <div className="relative">
                <span className="text-2xl">
                  {typeof botAvatar === 'string' ? botAvatar : React.createElement(botAvatar)}
                </span>
                <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-green-500 border-2 border-white" />
              </div>
              <div>
                <h3 className="m-0 text-base font-semibold">{title}</h3>
                <p className="m-0 text-xs opacity-90">{subtitle}</p>
              </div>
            </div>
            <button
              onClick={toggleChat}
              className="bg-transparent border-none text-white text-xl cursor-pointer hover:opacity-80 px-1"
            >
              ✕
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                avatar={message.sender === "bot" ? botAvatar : userAvatar}
                showTimestamp={showTimestamp}
              />
            ))}
            {isTyping && (
              <div className="flex gap-1 p-2 rounded-2xl w-fit animate-pulse-slow">
                <ThreeDot color={["#41372c"]} size="small" text="" textColor="" />
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Pending Attachments */}
          {pendingAttachments.length > 0 && (
            <div className="p-3 border-t border-gray-200 bg-gray-50 max-h-150 overflow-y-auto space-y-2">
              {pendingAttachments.map((attachment) => (
                <FileAttachment
                  key={attachment.id}
                  attachment={attachment}
                  onRemove={removePendingAttachment}
                  onRetry={retryUpload}
                />
              ))}
            </div>
          )}

          {/* Quick Buttons */}
          {dynamicQuickButtons.length > 0 && (
            <QuickButtons
              buttons={dynamicQuickButtons}
              onButtonClick={handleQuickButtonClick}
            />
          )}

          {/* Input Area */}
          <div className="px-4 py-2 m-2 border-t border-gray-200 flex gap-3 items-center bg-gray-50 rounded-full">
            {allowFileUpload && (
              <FileUpload
                onFileSelect={handleFileSelect}
                accept={acceptFileTypes}
                multiple={true}
                maxSize={maxFileSize}
                disabled={pendingAttachments.length >= maxFiles}
              />
            )}
            <textarea
              ref={inputRef}
              value={inputMessage}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              rows={1}
              className="flex-1 bg-transparent text-sm outline-none placeholder-gray-400 resize-none max-h-18 overflow-y-auto"
              style={{ lineHeight: "1.5rem", minHeight: "1.5rem" }}
            />
            <button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() && pendingAttachments.length === 0}
              className="p-2 rounded-full transition-opacity hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
              style={{ color: primaryColor }}
              title="Send message"
            >
              <IoMdSend />
            </button>
          </div>
        </div>
      )}

      <button
        onClick={toggleChat}
        className="w-14 h-14 rounded-full shadow-lg hover:scale-105 transition-transform flex justify-center items-center shrink-0"
        style={{ backgroundColor: primaryColor }}
        aria-label={isOpen ? "Close chat" : "Open chat"}
      >
        <span className="text-2xl text-white">
          {isOpen ? <MdOutlineClose /> : <IoChatbubbleEllipsesOutline />}
        </span>
        {!isOpen && unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full px-1.5 py-0.5 text-xs font-bold min-w-5">
            {unreadCount}
          </span>
        )}
      </button>
    </div>
  );
};

export default ChatWidget;
