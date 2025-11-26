// frontend/src/pages/client/ClientChatPage.jsx

import { useState, useEffect, useRef, Fragment } from 'react';
import { useLocation } from 'react-router-dom';
import { getBreadcrumbs } from '../../utils/breadcrumbConfig';
import {
  MessageSquare, Send, Paperclip, X, Image, File, Download,
  Loader2, CheckCheck, Check, Search, MoreVertical, ArrowLeft, Video, Music, Archive,
  Trash2 // Import Delete Icon
} from 'lucide-react';
import ClientDashboardLayout from '../../components/layout/ClientDashboardLayout';
import api from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';

const ClientChatPage = () => {
  const { user } = useAuth();
  const location = useLocation();  
  const breadcrumbs = getBreadcrumbs(location.pathname);    

  // State
  const [room, setRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  // const [searchQuery, setSearchQuery] = useState(''); // Removed
  // const [availableAdmins, setAvailableAdmins] = useState([]); // Removed
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [typingUsers, setTypingUsers] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const wsRef = useRef(null);

  useEffect(() => {
    fetchRoom(true); // Show loading spinner on initial load
    // fetchAvailableAdmins(); // Removed

    // Connect to notification WebSocket for instant updates
    const wsScheme = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const notifWsUrl = `${wsScheme}://${window.location.hostname}:8000/ws/notifications/`;

    console.log('🔔 Connecting to notifications WebSocket');
    const notifWs = new WebSocket(notifWsUrl);

    notifWs.onopen = () => {
      console.log('✅ Notifications WebSocket connected');
    };

    notifWs.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log('🔔 Notification received:', data);

      // Refresh room when notification arrives (usually admin reply)
      if (data.type === 'notification') {
        console.log('📨 Refreshing room due to notification');
        fetchRoom(false); // Background refresh, no loading spinner
      }
    };

    notifWs.onerror = (error) => {
      console.error('❌ Notifications WebSocket error:', error);
    };

    notifWs.onclose = () => {
      console.log('🔴 Notifications WebSocket disconnected');
    };

    // Backup: Poll every 2 seconds to catch any missed updates
    // This ensures messages always appear even if WebSocket fails
    const pollInterval = setInterval(() => {
      fetchRoom(false); // Background refresh, no loading spinner
    }, 2000); // 2 seconds for near-instant updates

    // Refresh when tab becomes visible
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchRoom(false); // Background refresh, no loading spinner
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (notifWs.readyState === WebSocket.OPEN) {
        notifWs.close();
      }
      clearInterval(pollInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    if (room) {
      connectWebSocket(room.room_id);
      fetchMessages(room.room_id);
      markRoomAsRead(room.room_id);
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [room?.room_id]); // Only reconnect if room_id changes, not if room object updates

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchRoom = async (showLoadingSpinner = false) => {
    try {
      if (showLoadingSpinner) {
        setLoading(true);
      }
      // Use the backend filter for 'is_active'
      const response = await api.get('/api/chat/rooms/', {
        params: { is_active: 'true' }
      });

      const rooms = (response.data.results || response.data);

      if (rooms.length > 0) {
        setRoom(rooms[0]); // Client typically has one active support room
      } else {
        setRoom(null); // No active room
      }
    } catch (error) {
      console.error('Error fetching room:', error);
    } finally {
      if (showLoadingSpinner) {
        setLoading(false);
      }
    }
  };

  // fetchAvailableAdmins function removed

  const fetchMessages = async (roomId) => {
    try {
      const response = await api.get('/api/chat/messages/', {
        params: { room_id: roomId }
      });
      setMessages(response.data.results || response.data);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const markRoomAsRead = async (roomId) => {
    try {
      // This endpoint is provided by your ChatMessageViewSet
      await api.post('/api/chat/messages/mark_room_read/',
        { room_id: roomId },
        { headers: { 'Content-Type': 'application/json' } }
      );
    } catch (error) {
      console.error('Error marking room as read:', error);
    }
  };

  const connectWebSocket = (roomId) => {
    if (wsRef.current) {
      wsRef.current.close();
    }

    const wsScheme = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const wsUrl = `${wsScheme}://${window.location.hostname}:8000/ws/chat/${roomId}/`;

    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('✅ WebSocket connected');
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === 'chat_message') {
        setMessages(prev => {
          if (prev.some(msg => msg.message_id === data.message.message_id)) {
            return prev;
          }
          return [...prev, data.message];
        });

        if (data.message.sender.id !== user.id && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'mark_read',
            message_id: data.message.message_id
          }));
        }

      } else if (data.type === 'typing_indicator') {
        handleTypingIndicator(data);
      } else if (data.type === 'message_read') {
        updateMessageReadStatus(data.message_id);
      }
    };

    ws.onerror = (error) => {
      console.error('❌ WebSocket error:', error);
      setIsConnected(false);
    };

    ws.onclose = () => {
      console.log('🔴 WebSocket disconnected');
      setIsConnected(false);
    };

    wsRef.current = ws;
  };

  const handleTypingIndicator = (data) => {
    if (data.is_typing) {
      setTypingUsers(prev => {
        if (!prev.find(u => u.user_id === data.user_id)) {
          return [...prev, { user_id: data.user_id, username: data.username }];
        }
        return prev;
      });

      setTimeout(() => {
        setTypingUsers(prev => prev.filter(u => u.user_id !== data.user_id));
      }, 3000);
    } else {
      setTypingUsers(prev => prev.filter(u => u.user_id !== data.user_id));
    }
  };

  const updateMessageReadStatus = (messageId) => {
    setMessages(prev => prev.map(msg =>
      msg.message_id === messageId ? { ...msg, is_read: true } : msg
    ));
  };

  const sendTypingIndicator = (isTyping) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'typing',
        is_typing: isTyping
      }));
    }
  };

  const handleInputChange = (e) => {
    setMessageText(e.target.value);

    if (e.target.value.length > 0) {
      sendTypingIndicator(true);

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      typingTimeoutRef.current = setTimeout(() => {
        sendTypingIndicator(false);
      }, 1000);
    } else {
      sendTypingIndicator(false);
    }
  };

  const sendMessage = async () => {
    if ((!messageText.trim() && !selectedFile) || !room) return;

    try {
      setSending(true);
      sendTypingIndicator(false);

      if (selectedFile) {
        const formData = new FormData();
        formData.append('room', room.room_id);
        formData.append('file', selectedFile);
        formData.append('message_type', 'FILE');
        if (messageText.trim()) {
          formData.append('content', messageText.trim());
        }

        await api.post('/api/chat/messages/', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });

        setMessageText('');
        clearFile();
      } else {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({
            type: 'chat_message',
            message_type: 'TEXT',
            content: messageText.trim()
          }));
          setMessageText('');
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);

      // Create preview for images
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setFilePreview(reader.result);
        };
        reader.readDataURL(file);
      } else {
        setFilePreview(null);
      }
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
    setFilePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
  };

  const startNewChat = async () => {
    // If user already has an active room, don't create a new one.
    if (room) {
      setShowSidebar(false); // Just show the existing room
      return;
    }

    try {
      // This uses your custom create logic from ChatRoomViewSet
      const response = await api.post('/api/chat/rooms/', {
        subject: 'Support Request'
      });

      const newRoom = response.data;

      // Manually set the room state with the returned room
      setRoom(newRoom);

    } catch (error) {
      console.error('Error creating room:', error);
    }
  };

  const handleDeleteChat = async () => {
    if (!room) return;

    if (window.confirm('Are you sure you want to delete this conversation? You can start a new one by contacting an admin.')) {
      try {
        // Call the 'close' custom action on your viewset
        await api.post(`/api/chat/rooms/${room.room_id}/close/`);

        // Clear the room, showing the "Welcome" screen
        setRoom(null);
        setMessages([]); // Clear messages as well

      } catch (error) {
        console.error('Error deleting chat:', error);
        alert('Failed to delete chat.');
      }
    }
  };

  const formatDateDivider = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    }
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }
    return date.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).toUpperCase();
  };

  const getFileIcon = (fileType) => {
    if (fileType?.startsWith('image/')) return <Image className="w-5 h-5 text-indigo-600" />;
    if (fileType?.startsWith('video/')) return <Video className="w-5 h-5 text-indigo-600" />;
    if (fileType?.startsWith('audio/')) return <Music className="w-5 h-5 text-indigo-600" />;
    if (fileType?.includes('zip') || fileType?.includes('rar')) return <Archive className="w-5 h-5 text-indigo-600" />;
    return <File className="w-5 h-5 text-indigo-600" />;
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // filteredAdmins variable removed

  return (
    <ClientDashboardLayout
    breadcrumbs={breadcrumbs}
    >
      <div className="flex h-[calc(100vh-4rem)] bg-gray-100">
        {/* Sidebar */}
        <div className={`${showSidebar ? 'w-full md:w-96' : 'hidden md:block md:w-96'} bg-white border-r flex flex-col`}>
          {/* Sidebar Header */}
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold">Support Chat</h2>
              <button
                onClick={handleDeleteChat}
                disabled={!room} // Disable if no room exists
                className="p-2 hover:bg-white/20 rounded-full transition-colors disabled:opacity-50"
                title="Delete Conversation"
              >
                <Trash2 className="w-5 h-5 text-white hover:text-red-400" />
              </button>
            </div>

            {/* *** MODIFIED SECTION - Search Bar Replaced *** */}
            <button
              onClick={startNewChat}
              disabled={!!room} // Disable if a room already exists
              className="w-full py-2.5 px-4 rounded-lg text-sm font-semibold bg-white text-indigo-600 hover:bg-indigo-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Contact Admin
            </button>
            {/* *** END OF MODIFIED SECTION *** */}

          </div>

          {/* Chat / Admins List */}
          <div className="flex-1 overflow-y-auto">
            {/* *** MODIFIED SECTION - Simplified Logic *** */}
            {loading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
              </div>
            ) : (
              <>
                {/* 1. If room exists, show it */}
                {room && (
                  <button
                    onClick={() => setShowSidebar(false)}
                    className="w-full text-left p-4 border-b border-gray-100 bg-indigo-50"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center text-white font-bold">
                        {room.assigned_staff?.initials || 'ST'}
                      </div>

                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-sm text-gray-900">
                          {room.assigned_staff?.full_name || room.assigned_staff?.username || 'Support Team'}
                        </h4>
                        {typingUsers.length > 0 ? (
                          <p className="text-sm text-green-600 italic">typing...</p>
                        ) : (
                          <p className="text-sm text-gray-600">Support Chat</p>
                        )}

                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-xs ${isConnected ? 'text-green-600' : 'text-gray-400'}`}>
                            {isConnected ? '● Connected' : '○ Disconnected'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                )}

                {/* 2. If NO room, show "no chat" message */}
                {!room && (
                  <div className="text-center text-gray-500 py-8 px-4">
                    <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p className="font-medium">No active chat</p>
                    <p className="mt-2 text-sm text-gray-500">
                      Click "Contact Admin" above to start a new conversation.
                    </p>
                  </div>
                )}
              </>
            )}
            {/* *** END OF MODIFIED SECTION *** */}
          </div>
        </div>

        {/* Chat Area */}
        <div className={`${!showSidebar || room ? 'flex-1' : 'hidden md:flex-1'} flex flex-col bg-gray-50`}>
          {room ? (
            <>
              {/* Chat Header */}
              <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-4">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowSidebar(true)}
                    className="md:hidden p-2 hover:bg-white/20 rounded-lg"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>

                  <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    <MessageSquare className="w-6 h-6" />
                  </div>

                  <div>
                    <h2 className="text-lg font-bold">Support Chat</h2>
                    <p className="text-sm text-indigo-100">
                      {isConnected ? '● Connected' : '○ Connecting...'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-6 bg-gray-50 space-y-4" style={{
                backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%239C92AC\' fill-opacity=\'0.05\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")'
              }}>
                {messages.length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    <MessageSquare className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <p className="text-lg font-semibold mb-2">Start a conversation</p>
                    <p className="text-sm">Send a message to our support team</p>
                  </div>
                )}

                {messages.map((message, index) => {
                  const isOwn = message.sender.id === user.id;

                  // Date divider logic
                  const prevMessage = messages[index - 1];
                  const showDateDivider = !prevMessage ||
                    new Date(message.created_at).toDateString() !== new Date(prevMessage.created_at).toDateString();

                  return (
                    <Fragment key={message.message_id}>
                      {showDateDivider && (
                        <div className="flex justify-center my-4">
                          <span className="bg-gray-200 text-gray-700 text-xs font-medium px-3 py-1 rounded-full">
                            {formatDateDivider(message.created_at)}
                          </span>
                        </div>
                      )}

                      {/* Existing Message Bubble */}
                      <div
                        className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-lg ${isOwn ? 'order-2' : 'order-1'}`}>
                          {!isOwn && (
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-medium text-gray-700">
                                {message.sender.full_name || message.sender.username}
                              </span>
                              <span className="text-xs text-gray-500">Support</span>
                            </div>
                          )}

                          <div
                            className={`rounded-2xl px-4 py-3 ${isOwn
                                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white'
                                : 'bg-white text-gray-900 border border-gray-200'
                              }`}
                          >
                            {/* File Attachment */}
                            {message.message_type === 'FILE' && message.file && (
                              <div className={`mb-2 p-3 rounded-lg ${isOwn ? 'bg-white/20' : 'bg-gray-50'
                                }`}>
                                {message.file_type?.startsWith('image/') ? (
                                  <img
                                    src={message.file_url}
                                    alt={message.file_name}
                                    className="max-w-full rounded-lg mb-2 max-h-64 object-contain"
                                  />
                                ) : (
                                  <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg ${isOwn ? 'bg-white/30' : 'bg-indigo-100'
                                      }`}>
                                      {getFileIcon(message.file_type)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium truncate">
                                        {message.file_name}
                                      </p>
                                      <p className={`text-xs ${isOwn ? 'text-white/70' : 'text-gray-500'
                                        }`}>
                                        {formatFileSize(message.file_size)}
                                      </p>
                                    </div>
                                    <a
                                      href={message.file_url}
                                      download
                                      className="p-2 rounded-lg hover:bg-white/30 transition-colors"
                                    >
                                      <Download className="w-4 h-4" />
                                    </a>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Message Content */}
                            {message.content && (
                              <p className="text-sm whitespace-pre-wrap break-words">
                                {message.content}
                              </p>
                            )}

                            {/* Message Footer */}
                            <div className={`flex items-center justify-end gap-1 mt-1 text-xs ${isOwn ? 'text-white/70' : 'text-gray-500'
                              }`}>
                              <span>
                                {new Date(message.created_at).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                              {isOwn && (
                                message.is_read ? (
                                  <CheckCheck className="w-4 h-4 text-blue-300" />
                                ) : (
                                  <Check className="w-4 h-4" />
                                )
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </Fragment>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div className="bg-white border-t border-gray-200 p-4">
                {/* File Preview */}
                {selectedFile && (
                  <div className="mb-3 p-3 bg-gray-100 rounded-lg flex items-center gap-3">
                    {filePreview ? (
                      <img src={filePreview} alt="Preview" className="w-16 h-16 object-cover rounded" />
                    ) : (
                      <div className="w-16 h-16 bg-indigo-100 rounded flex items-center justify-center">
                        <File className="w-8 h-8 text-indigo-600" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-700 truncate">{selectedFile.name}</p>
                      <p className="text-xs text-gray-500">{formatFileSize(selectedFile.size)}</p>
                    </div>
                    <button onClick={clearFile} className="text-gray-600 hover:text-red-600">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                )}

                <div className="flex items-end gap-2">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="p-3 text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <Paperclip className="w-5 h-5" />
                  </button>

                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileSelect}
                    className="hidden"
                  />

                  <textarea
                    value={messageText}
                    onChange={handleInputChange}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                    placeholder="Type a message..."
                    rows={1}
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                    style={{ minHeight: '48px', maxHeight: '120px' }}
                  />

                  <button
                    onClick={sendMessage}
                    disabled={sending || (!messageText.trim() && !selectedFile)}
                    className="p-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-full hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {sending ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Send className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>
            </>
          ) : (
            // *** MODIFIED SECTION - Welcome Message ***
            <div className="flex-1 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <div className="w-24 h-24 mx-auto mb-4 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full flex items-center justify-center">
                  <MessageSquare className="w-12 h-12 text-indigo-600" />
                </div>
                <h3 className="text-xl font-semibold mb-2 text-gray-900">Welcome to Support</h3>
                <p className="text-gray-500 mb-4">
                  Click "Contact Admin" in the sidebar to start a conversation.
                </p>
              </div>
            </div>
            // *** END OF MODIFIED SECTION ***
          )}
        </div>
      </div>
    </ClientDashboardLayout>
  );
};

export default ClientChatPage;