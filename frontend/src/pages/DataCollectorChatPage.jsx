// frontend/src/pages/DataCollectorChatPage.jsx
// Chat page for DATA COLLECTORS - can only message admin users

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useChatWebSocket } from '../hooks/useChatWebSocket';
import DataCollectorLayout from '../components/layout/DataCollectorLayout';
import {
  Send, Paperclip, X, MessageCircle, Clock, CheckCheck,
  User, Image as ImageIcon, File, Download, AlertCircle
} from 'lucide-react';

const DataCollectorChatPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const isInitialLoadRef = useRef(true); // Track if this is the first load

  // State
  const [room, setRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [typingUsers, setTypingUsers] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const typingTimeoutRef = useRef(null);

  // WebSocket handlers
  const handleNewMessage = (message) => {
    setMessages(prev => {
      if (prev.some(m => m.message_id === message.message_id)) {
        return prev;
      }
      return [...prev, message];
    });

    // DON'T auto-mark as read here!
    // Messages should only be marked as read when:
    // 1. User actually opens the chat page (handled by loadMessages)
    // 2. User is viewing the specific room
    // This allows the unread badge to work correctly
  };

  const handleTyping = (data) => {
    if (data.user_id !== user?.id) {
      if (data.is_typing) {
        setTypingUsers(prev => {
          if (!prev.includes(data.username)) {
            return [...prev, data.username];
          }
          return prev;
        });
      } else {
        setTypingUsers(prev => prev.filter(u => u !== data.username));
      }
    }
  };

  const handleUserStatus = (data) => {
    if (data.is_online) {
      setOnlineUsers(prev => {
        if (!prev.includes(data.user_id)) {
          return [...prev, data.user_id];
        }
        return prev;
      });
    } else {
      setOnlineUsers(prev => prev.filter(id => id !== data.user_id));
    }
  };

  const handleMessageRead = (data) => {
    setMessages(prev =>
      prev.map(msg =>
        msg.message_id === data.message_id
          ? { ...msg, is_read: true }
          : msg
      )
    );
  };

  const {
    isConnected,
    error: wsError,
    sendMessage: wsSendMessage,
    sendTyping,
    markAsRead,
    autoMarkAsRead
  } = useChatWebSocket(
    room?.room_id,
    handleNewMessage,
    handleTyping,
    handleUserStatus,
    handleMessageRead
  );

  useEffect(() => {
    loadChatRoom();
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom(isInitialLoadRef.current);
      isInitialLoadRef.current = false;
    }
  }, [messages]);

  const loadChatRoom = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.post('/api/chat/rooms/', {
        subject: 'Support Chat'
      });

      setRoom(response.data);

      if (response.data.room_id) {
        await loadMessages(response.data.room_id);
      }
    } catch (err) {
      console.error('Error loading chat room:', err);
      setError('Failed to load chat. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (roomId) => {
    try {
      const response = await api.get(`/api/chat/messages/?room_id=${roomId}`);
      setMessages(response.data || []);

      // Mark messages as read when opening the chat
      await api.post('/api/chat/messages/mark_room_read/', {
        room_id: roomId
      });

      // Ensure scroll happens after DOM updates
      setTimeout(() => {
        scrollToBottom(true);
      }, 100);
    } catch (err) {
      console.error('Error loading messages:', err);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();

    if ((!newMessage.trim() && !selectedFile) || sending || !room) {
      return;
    }

    try {
      setSending(true);

      if (selectedFile) {
        const formData = new FormData();
        formData.append('room', room.room_id);
        formData.append('message_type', 'FILE');
        formData.append('file', selectedFile);
        formData.append('content', newMessage || '');

        await api.post('/api/chat/messages/', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });

        setSelectedFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } else {
        wsSendMessage({
          type: 'chat_message',
          message_type: 'TEXT',
          content: newMessage.trim()
        });
      }

      setNewMessage('');
      sendTyping(false);
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const handleTypingChange = (e) => {
    setNewMessage(e.target.value);

    if (e.target.value.trim()) {
      sendTyping(true);

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      typingTimeoutRef.current = setTimeout(() => {
        sendTyping(false);
      }, 2000);
    } else {
      sendTyping(false);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setError('File size must be less than 10MB');
        return;
      }
      setSelectedFile(file);
      setError(null);
    }
  };

  const removeSelectedFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const scrollToBottom = (instant = false) => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({
        behavior: instant ? 'auto' : 'smooth',
        block: 'end'
      });
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    }
  };

  const getMessageDateSeparator = (currentMsg, previousMsg) => {
    if (!previousMsg) return formatDate(currentMsg.created_at);

    const currentDate = new Date(currentMsg.created_at).toDateString();
    const previousDate = new Date(previousMsg.created_at).toDateString();

    if (currentDate !== previousDate) {
      return formatDate(currentMsg.created_at);
    }

    return null;
  };

  const renderMessage = (message, index) => {
    const isOwnMessage = message.sender?.id === user?.id;
    const dateSeparator = getMessageDateSeparator(message, messages[index - 1]);

    return (
      <div key={message.message_id}>
        {dateSeparator && (
          <div className="flex items-center justify-center my-4">
            <div className="px-4 py-1 bg-gray-200 text-gray-600 text-xs rounded-full">
              {dateSeparator}
            </div>
          </div>
        )}

        <div className={`flex gap-3 mb-4 ${isOwnMessage ? 'flex-row-reverse' : ''}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 ${
            isOwnMessage
              ? 'bg-purple-600 text-white'
              : 'bg-blue-600 text-white'
          }`}>
            {message.sender?.initials || 'A'}
          </div>

          <div className={`max-w-[70%] ${isOwnMessage ? 'items-end' : 'items-start'}`}>
            <div className={`text-xs text-gray-600 mb-1 ${isOwnMessage ? 'text-right' : 'text-left'}`}>
              {message.sender?.full_name || message.sender?.username}
            </div>

            <div className={`rounded-2xl px-4 py-2 ${
              isOwnMessage
                ? 'bg-purple-600 text-white rounded-tr-none'
                : 'bg-white text-gray-900 border border-gray-200 rounded-tl-none'
            }`}>
              {message.message_type === 'FILE' && message.file && (
                <div className="mb-2">
                  <a
                    href={message.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex items-center gap-2 p-2 rounded-lg ${
                      isOwnMessage
                        ? 'bg-purple-700 hover:bg-purple-800'
                        : 'bg-gray-100 hover:bg-gray-200'
                    }`}
                  >
                    {message.file_type?.startsWith('image/') ? (
                      <ImageIcon className="w-5 h-5" />
                    ) : (
                      <File className="w-5 h-5" />
                    )}
                    <span className="text-sm font-medium truncate">
                      {message.file_name}
                    </span>
                    <Download className="w-4 h-4 ml-auto" />
                  </a>
                </div>
              )}

              {message.content && (
                <p className="text-sm whitespace-pre-wrap break-words">
                  {message.content}
                </p>
              )}

              <div className={`flex items-center justify-end gap-2 mt-1 text-xs ${
                isOwnMessage ? 'text-purple-200' : 'text-gray-500'
              }`}>
                <span>{formatTime(message.created_at)}</span>
                {isOwnMessage && (
                  <CheckCheck className={`w-4 h-4 ${
                    message.is_read ? 'text-blue-300' : 'text-purple-300'
                  }`} />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <DataCollectorLayout>
        <div className="h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading chat...</p>
          </div>
        </div>
      </DataCollectorLayout>
    );
  }

  return (
    <DataCollectorLayout>
      <div className="h-[calc(100vh-4rem)] flex flex-col bg-white">
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-4 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold">Support Chat</h1>
              <p className="text-sm text-purple-100">
                Chat with admin team
                {isConnected && (
                  <span className="ml-2 inline-flex items-center gap-1">
                    <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                    Connected
                  </span>
                )}
              </p>
            </div>

            {room?.assigned_staff && (
              <div className="flex items-center gap-2 bg-white/10 px-3 py-2 rounded-lg">
                <User className="w-4 h-4" />
                <span className="text-sm">
                  {room.assigned_staff.full_name || room.assigned_staff.username}
                </span>
                {onlineUsers.includes(room.assigned_staff.id) && (
                  <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                )}
              </div>
            )}
          </div>
        </div>

        {(error || wsError) && (
          <div className="bg-red-50 border-l-4 border-red-500 px-4 py-3 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <p className="text-sm text-red-700">{error || wsError}</p>
            <button
              onClick={() => { setError(null); loadChatRoom(); }}
              className="ml-auto text-sm text-red-700 underline"
            >
              Retry
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
          {messages.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <MessageCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 font-medium">No messages yet</p>
                <p className="text-sm text-gray-400 mt-2">
                  Start a conversation with the admin team
                </p>
              </div>
            </div>
          ) : (
            <>
              {messages.map((message, index) => renderMessage(message, index))}
              <div ref={messagesEndRef} />
            </>
          )}

          {typingUsers.length > 0 && (
            <div className="flex gap-3 mb-4">
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-xs font-semibold text-white">
                A
              </div>
              <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-none px-4 py-2">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100"></span>
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200"></span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white border-t border-gray-200 p-4">
          {selectedFile && (
            <div className="mb-3 flex items-center gap-2 p-3 bg-purple-50 rounded-lg">
              <File className="w-5 h-5 text-purple-600" />
              <span className="text-sm text-gray-700 flex-1 truncate">
                {selectedFile.name}
              </span>
              <button
                onClick={removeSelectedFile}
                className="text-gray-500 hover:text-red-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          )}

          <form onSubmit={handleSendMessage} className="flex items-end gap-2">
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileSelect}
              className="hidden"
              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-3 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
              title="Attach file"
            >
              <Paperclip className="w-5 h-5" />
            </button>

            <textarea
              value={newMessage}
              onChange={handleTypingChange}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage(e);
                }
              }}
              placeholder="Type your message..."
              rows={1}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
              disabled={sending || !isConnected}
            />

            <button
              type="submit"
              disabled={(!newMessage.trim() && !selectedFile) || sending || !isConnected}
              className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {sending ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Send
                </>
              )}
            </button>
          </form>

          {!isConnected && (
            <p className="text-xs text-orange-600 mt-2 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Reconnecting...
            </p>
          )}
        </div>
      </div>
    </DataCollectorLayout>
  );
};

export default DataCollectorChatPage;
