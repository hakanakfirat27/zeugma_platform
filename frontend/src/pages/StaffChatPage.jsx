// frontend/src/pages/StaffChatPage.jsx

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  MessageSquare, Send, Search, MoreVertical,
  Check, CheckCheck, Paperclip, Smile, Users
} from 'lucide-react';
import DashboardLayout from '../components/layout/DashboardLayout';
import api from '../utils/api';

const StaffChatPage = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showUserSearch, setShowUserSearch] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchConversations();
    // Poll for new messages every 5 seconds
    const interval = setInterval(() => {
      if (selectedChat) {
        fetchMessages(selectedChat.other_user.id, false);
      }
      fetchConversations();
    }, 5000);

    return () => clearInterval(interval);
  }, [selectedChat]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchConversations = async () => {
    try {
      const response = await api.get('/api/chat/conversations/');
      setConversations(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching conversations:', error);
      setLoading(false);
    }
  };

  const fetchMessages = async (userId, showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const response = await api.get(`/api/chat/get_messages/?user_id=${userId}`);
      setMessages(response.data);
      if (showLoading) setLoading(false);
    } catch (error) {
      console.error('Error fetching messages:', error);
      if (showLoading) setLoading(false);
    }
  };

  const selectChat = (conversation) => {
    setSelectedChat(conversation);
    fetchMessages(conversation.other_user.id);
    setShowUserSearch(false);
  };

  const searchUsers = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      const response = await api.get(`/api/chat/search_users/?q=${query}`);
      setSearchResults(response.data);
    } catch (error) {
      console.error('Error searching users:', error);
    }
  };

  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    searchUsers(query);
  };

  const startNewChat = (user) => {
    const newChat = {
      id: `new-${user.id}`,
      other_user: {
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        email: user.email
      },
      last_message: '',
      last_message_time: null,
      unread_count: 0
    };
    setSelectedChat(newChat);
    setMessages([]);
    setShowUserSearch(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  const sendMessage = async (e) => {
    e.preventDefault();

    if (!messageText.trim() || !selectedChat) return;

    setSending(true);
    try {
      const response = await api.post('/api/chat/send_message/', {
        receiver_id: selectedChat.other_user.id,
        message: messageText
      });

      setMessages([...messages, response.data]);
      setMessageText('');

      // Refresh conversations to update last message
      fetchConversations();
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  const formatTime = (date) => {
    if (!date) return '';
    const messageDate = new Date(date);
    const now = new Date();
    const diff = now - messageDate;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return messageDate.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      });
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return messageDate.toLocaleDateString('en-US', { weekday: 'short' });
    } else {
      return messageDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      });
    }
  };

  const getUserInitials = (name) => {
    if (!name) return 'U';
    const names = name.split(' ');
    return (names[0][0] + (names[names.length - 1]?.[0] || '')).toUpperCase();
  };

  const filteredConversations = conversations.filter(conv =>
    conv.other_user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.other_user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <DashboardLayout pageTitle="Chat">
      <div className="h-[calc(100vh-80px)] flex bg-white">
        {/* Left Sidebar - Conversations */}
        <div className="w-96 border-r border-gray-200 flex flex-col bg-white">
          {/* Sidebar Header */}
          <div className="h-16 border-b border-gray-200 flex items-center justify-between px-4">
            <h2 className="text-xl font-semibold text-gray-900">Messages</h2>
            <button
              onClick={() => setShowUserSearch(!showUserSearch)}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              title="New Chat"
            >
              <Users className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          {/* Search Bar */}
          <div className="p-3 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={handleSearchChange}
                placeholder={showUserSearch ? "Search all users..." : "Search conversations..."}
                className="w-full pl-10 pr-4 py-2 bg-gray-100 rounded-lg border-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* User Search Results or Conversations List */}
          <div className="flex-1 overflow-y-auto">
            {showUserSearch && searchResults.length > 0 ? (
              // Search Results
              searchResults.map((searchUser) => (
                <button
                  key={searchUser.id}
                  onClick={() => startNewChat(searchUser)}
                  className="w-full p-4 flex items-center gap-3 hover:bg-gray-50 transition-colors border-b border-gray-100"
                >
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                    {getUserInitials(searchUser.full_name)}
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">
                      {searchUser.full_name}
                    </h3>
                    <p className="text-sm text-gray-600 truncate">
                      {searchUser.email}
                    </p>
                  </div>
                </button>
              ))
            ) : (
              // Conversations
              filteredConversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => selectChat(conv)}
                  className={`w-full p-4 flex items-center gap-3 hover:bg-gray-50 transition-colors border-b border-gray-100 ${
                    selectedChat?.id === conv.id ? 'bg-gray-100' : ''
                  }`}
                >
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center text-white font-semibold">
                      {getUserInitials(conv.other_user.full_name)}
                    </div>
                    {conv.unread_count > 0 && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-indigo-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                        {conv.unread_count}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-semibold text-gray-900 truncate">
                        {conv.other_user.full_name}
                      </h3>
                      <span className="text-xs text-gray-500">
                        {formatTime(conv.last_message_time)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 truncate">
                      {conv.last_message || 'No messages yet'}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Right Side - Chat Area */}
        {selectedChat ? (
          <div className="flex-1 flex flex-col">
            {/* Chat Header */}
            <div className="h-16 border-b border-gray-200 flex items-center px-6">
              <div className="flex items-center gap-3 flex-1">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center text-white font-semibold">
                  {getUserInitials(selectedChat.other_user.full_name)}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {selectedChat.other_user.full_name}
                  </h3>
                  <p className="text-xs text-gray-500">
                    {selectedChat.other_user.email}
                  </p>
                </div>
              </div>
              <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <MoreVertical className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            {/* Messages Area */}
            <div
              className="flex-1 overflow-y-auto p-6 bg-[#f0f2f5]"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23d4d4d8' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
              }}
            >
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="w-32 h-32 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <MessageSquare className="w-16 h-16 text-gray-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-700 mb-2">
                    No messages yet
                  </h3>
                  <p className="text-gray-500 max-w-sm">
                    Start the conversation by sending a message.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {messages.map((message) => {
                    const isOwn = message.sender === user.id;
                    return (
                      <div
                        key={message.id}
                        className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[70%] rounded-lg px-4 py-2 ${
                            isOwn
                              ? 'bg-[#d9fdd3] text-gray-900'
                              : 'bg-white text-gray-900 shadow-sm'
                          }`}
                        >
                          <p className="text-sm whitespace-pre-wrap break-words">
                            {message.message}
                          </p>
                          <div className="flex items-center justify-end gap-1 mt-1">
                            <span className="text-[10px] text-gray-500">
                              {formatTime(message.created_at)}
                            </span>
                            {isOwn && (
                              message.is_read ? (
                                <CheckCheck className="w-3 h-3 text-blue-500" />
                              ) : (
                                <Check className="w-3 h-3 text-gray-500" />
                              )
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Message Input */}
            <div className="h-16 border-t border-gray-200 px-4 flex items-center gap-2 bg-[#f0f2f5]">
              <button className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                <Smile className="w-6 h-6 text-gray-600" />
              </button>
              <button className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                <Paperclip className="w-6 h-6 text-gray-600" />
              </button>
              <form onSubmit={sendMessage} className="flex-1 flex items-center gap-2">
                <input
                  type="text"
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Type a message"
                  className="flex-1 px-4 py-2 rounded-full bg-white border-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="submit"
                  disabled={!messageText.trim() || sending}
                  className="p-3 bg-indigo-600 hover:bg-indigo-700 rounded-full text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-5 h-5" />
                </button>
              </form>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-[#f0f2f5]">
            <div className="text-center">
              <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                <MessageSquare className="w-16 h-16 text-gray-400" />
              </div>
              <h3 className="text-2xl font-semibold text-gray-700 mb-2">
                Select a conversation
              </h3>
              <p className="text-gray-500">
                Choose a conversation from the list or search for users to start messaging.
              </p>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default StaffChatPage;