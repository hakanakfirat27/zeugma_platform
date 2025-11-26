// frontend/src/pages/StaffChatPage.jsx

import { useState, useEffect, useRef, Fragment } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getBreadcrumbs } from '../utils/breadcrumbConfig';
import {
  MessageSquare, Send, Paperclip, X, Search, UserPlus, CheckCheck,
  Check, Download, Image, File, Video, Music, Archive, Loader2,
  Users, Clock, AlertCircle, MoreVertical, ArrowLeft,
  Trash2, User, Mail, Phone, Building, Calendar, FileText, CreditCard,
  ChevronRight // Added for Drawer close
} from 'lucide-react';
import DashboardLayout from '../components/layout/DashboardLayout';
import api from '../utils/api';
import { useAuth } from '../contexts/AuthContext';

// --- UserInfoDrawer COMPONENT ---
const UserInfoDrawer = ({ isOpen, onClose, user, subscriptions, loading }) => {
  if (!isOpen) return null;

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    // Format date and time
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  // --- *** ADDED THIS HELPER *** ---
  const getActualPlan = (subscription) => {
    if (!subscription?.start_date || !subscription?.end_date) return subscription?.plan || 'N/A';
    try {
      const startDate = new Date(subscription.start_date);
      const endDate = new Date(subscription.end_date);
      // Calculate difference in days
      const daysDiff = Math.ceil(Math.abs(endDate - startDate) / (1000 * 60 * 60 * 24));

      // If the duration is significantly longer than a month (e.g., > 60 days), assume Annual
      return daysDiff > 60 ? 'ANNUAL' : 'MONTHLY';
    } catch (e) {
      console.error("Error calculating plan duration:", e);
      return subscription?.plan || 'N/A'; // Fallback to original plan field
    }
  };
  // --- *** END OF ADDED HELPER *** ---

  const getStatusBadge = (status, endDate) => {
    const today = new Date().toISOString().split('T')[0];
    const isExpired = endDate < today;

    if (status === 'CANCELLED') return <span className="badge badge-error">Cancelled</span>;
    if (isExpired || status === 'EXPIRED') return <span className="badge badge-muted">Expired</span>;
    if (status === 'ACTIVE') return <span className="badge badge-success">Active</span>;
    if (status === 'PENDING') return <span className="badge badge-warning">Pending</span>;
    return <span className="badge badge-muted">{status}</span>;
  };

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity duration-300 ease-in-out"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed top-0 right-0 h-full w-96 bg-white shadow-2xl z-50 flex flex-col transform transition-transform duration-300 ease-in-out translate-x-0">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0"> {/* Added min-w-0 */}
            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-xl font-bold flex-shrink-0">
              {user?.initials || '?'}
            </div>
            <div className="flex-1 min-w-0"> {/* Added min-w-0 and flex-1 */}
              <h2 className="text-lg font-bold truncate">{user?.full_name || user?.username || 'Loading...'}</h2>
              <p className="text-sm text-indigo-100 truncate">{user?.username}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg flex-shrink-0">
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="flex justify-center items-center h-full">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
          ) : !user ? (
            <div className="text-center text-gray-500 py-10">User data not available.</div>
          ) : (
            <>
              {/* User Details Section */}
              <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
                <h3 className="text-sm font-semibold text-gray-800 mb-4 uppercase tracking-wider">Contact Information</h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <Mail className="w-5 h-5 text-gray-400 mt-1 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-gray-500">Email</p>
                      <p className="text-sm font-medium text-gray-900 break-words">{user.email || '-'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Phone className="w-5 h-5 text-gray-400 mt-1 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-gray-500">Phone</p>
                      <p className="text-sm font-medium text-gray-900">{user.phone_number || '-'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Building className="w-5 h-5 text-gray-400 mt-1 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-gray-500">Company</p>
                      <p className="text-sm font-medium text-gray-900">{user.company_name || '-'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Account Details */}
              <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
                <h3 className="text-sm font-semibold text-gray-800 mb-4 uppercase tracking-wider">Account Details</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Role:</span>
                    <span className="font-medium text-gray-900">{user.role?.replace('_', ' ') || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Status:</span>
                    <span className={`font-medium ${user.is_active ? 'text-green-600' : 'text-red-600'}`}>{user.is_active ? 'Active' : 'Inactive'}</span>
                  </div>
                   <div className="flex justify-between">
                    <span className="text-gray-600">Online:</span>
                    <span className={`font-medium ${user.is_online ? 'text-green-600' : 'text-gray-500'}`}>{user.is_online ? 'Online' : 'Offline'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Joined:</span>
                    <span className="font-medium text-gray-900">{formatDate(user.date_joined).split(',')[0]}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Last Active:</span>
                    <span className="font-medium text-gray-900">{formatDate(user.last_activity)}</span>
                  </div>
                </div>
              </div>

              {/* Subscriptions Section */}
              <div>
                <h3 className="text-sm font-semibold text-gray-800 mb-4 uppercase tracking-wider">Subscriptions & Reports</h3>
                {subscriptions && subscriptions.length > 0 ? (
                  <div className="space-y-3">
                    {subscriptions.map(sub => {
                       // --- *** USE THE CALCULATED PLAN *** ---
                       const actualPlan = getActualPlan(sub);
                       const planDisplay = actualPlan === 'ANNUAL' ? 'Annual' : 'Monthly';
                       // --- *** END OF CHANGE *** ---

                       return (
                        <div key={sub.subscription_id} className="bg-white border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                          <div className="flex justify-between items-start mb-2">
                            <p className="font-semibold text-gray-900 text-sm flex items-center gap-2">
                              <FileText className="w-4 h-4 text-purple-600" />
                              {sub.report_title}
                            </p>
                            {getStatusBadge(sub.status, sub.end_date)}
                          </div>
                          <div className="flex justify-between text-xs text-gray-600">
                            <span className="flex items-center gap-1">
                              {/* --- *** DISPLAY CALCULATED PLAN *** --- */}
                              <CreditCard className="w-3 h-3"/> {planDisplay}
                            </span>
                             <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3"/> Expires: {new Date(sub.end_date).toLocaleDateString()}
                             </span>
                          </div>
                        </div>
                       );
                    })}
                  </div>
                ) : (
                  <div className="text-center text-gray-500 py-6 bg-gray-50 rounded-lg border">
                    No subscriptions found for this user.
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
      {/* Add Badge Styles Directly */}
      <style>{`
        .badge { display: inline-flex; align-items: center; padding: 0.25rem 0.625rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 500; border-width: 1px; }
        .badge-success { background-color: #ECFDF5; color: #065F46; border-color: #A7F3D0; }
        .badge-warning { background-color: #FFFBEB; color: #B45309; border-color: #FDE68A; }
        .badge-error { background-color: #FEF2F2; color: #991B1B; border-color: #FECACA; }
        .badge-muted { background-color: #F9FAFB; color: #374151; border-color: #E5E7EB; }
      `}</style>
    </>
  );
};
// --- END UserInfoDrawer COMPONENT ---


const StaffChatPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();  
  const breadcrumbs = getBreadcrumbs(location.pathname);   

  // State
  const [rooms, setRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [availableUsers, setAvailableUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);

  // File upload state
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [uploading, setUploading] = useState(false);

  // Typing indicator state
  const [typingUsers, setTypingUsers] = useState([]);
  const [roomTypingStatus, setRoomTypingStatus] = useState({});
  const typingTimeoutRef = useRef(null);
  const roomTypingTimeouts = useRef({});

  const [isClientOnline, setIsClientOnline] = useState(false);

  // Drawer State
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [drawerUserData, setDrawerUserData] = useState(null);
  const [drawerSubscriptions, setDrawerSubscriptions] = useState([]);
  const drawerUserIdRef = useRef(null);

  // WebSocket
  const wsRef = useRef(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // Load rooms on mount and connect to notification WebSocket
  useEffect(() => {
    fetchRooms(true);
    fetchAvailableUsers();

    const wsScheme = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const notifWsUrl = `${wsScheme}://${window.location.hostname}:8000/ws/notifications/`;

    console.log('🔔 Connecting to notifications WebSocket');
    const notifWs = new WebSocket(notifWsUrl);

    notifWs.onopen = () => console.log('✅ Notifications WebSocket connected');
    notifWs.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log('🔔 Notification received:', data);
      if (data.type === 'notification') {
        console.log('📨 Refreshing rooms due to notification');
        fetchRooms(false);
      }
    };
    notifWs.onerror = (error) => console.error('❌ Notifications WebSocket error:', error);
    notifWs.onclose = () => console.log('🔴 Notifications WebSocket disconnected');

    const pollInterval = setInterval(() => fetchRooms(false), 2000);
    const handleVisibilityChange = () => {
      if (!document.hidden) fetchRooms(false);
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (notifWs.readyState === WebSocket.OPEN) notifWs.close();
      clearInterval(pollInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Connect to WebSocket when room is selected
  useEffect(() => {
    if (selectedRoom) {
      setIsClientOnline(false);
      connectWebSocket(selectedRoom.room_id);
      fetchMessages(selectedRoom.room_id);
      markRoomAsRead(selectedRoom.room_id);
      fetchRooms(false);

      // Drawer logic on room change
      if (isDrawerOpen && drawerUserIdRef.current !== selectedRoom.client.id) {
        fetchDrawerData(selectedRoom.client.id);
      } else if (!isDrawerOpen) {
         drawerUserIdRef.current = null;
         setDrawerUserData(null);
         setDrawerSubscriptions([]);
      }
    } else {
      // No room selected, close drawer and clear data
      setIsDrawerOpen(false);
      drawerUserIdRef.current = null;
      setDrawerUserData(null);
      setDrawerSubscriptions([]);
      if (wsRef.current) wsRef.current.close();
    }

    return () => {
      if (wsRef.current) wsRef.current.close();
    };
  }, [selectedRoom?.room_id]); // Depend only on the room_id

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchRooms = async (showLoadingSpinner = false) => {
    try {
      if (showLoadingSpinner) setLoading(true);
      const response = await api.get('/api/chat/rooms/');
      setRooms(response.data.results || response.data);
    } catch (error) {
      console.error('Error fetching rooms:', error);
    } finally {
      if (showLoadingSpinner) setLoading(false);
    }
  };

const fetchAvailableUsers = async () => {
    try {
      const response = await api.get('/api/auth/users/'); // <-- FIXED PATH
      setAvailableUsers(response.data.results || response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

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
      await api.post('/api/chat/messages/mark_room_read/',
        { room_id: roomId },
        { headers: { 'Content-Type': 'application/json' } }
      );
      setRooms(prevRooms => prevRooms.map(r =>
        r.room_id === roomId ? { ...r, unread_count: 0 } : r
      ));
    } catch (error) {
      console.error('Error marking room as read:', error);
    }
  };

  const connectWebSocket = (roomId) => {
    if (wsRef.current) wsRef.current.close();

    const wsScheme = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const wsUrl = `${wsScheme}://${window.location.hostname}:8000/ws/chat/${roomId}/`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => console.log('✅ WebSocket connected');
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      switch (data.type) {
        case 'chat_message':
          setMessages(prev => {
            if (prev.some(msg => msg.message_id === data.message.message_id)) return prev;
            return [...prev, data.message];
          });
          setRooms(prevRooms => {
            const updatedRooms = prevRooms.map(r => {
              if (r.room_id === roomId) {
                return { ...r, last_message: data.message, unread_count: data.message.sender.id === user.id ? 0 : r.unread_count };
              }
              return r;
            });
            const roomIndex = updatedRooms.findIndex(r => r.room_id === roomId);
            if (roomIndex > 0) {
              const [room] = updatedRooms.splice(roomIndex, 1);
              updatedRooms.unshift(room);
            }
            return updatedRooms;
          });
          if (data.message.sender.id !== user.id && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'mark_read', message_id: data.message.message_id }));
            setRooms(prevRooms => prevRooms.map(r => r.room_id === roomId ? { ...r, unread_count: 0 } : r));
          }
          break;
        case 'typing_indicator':
          handleTypingIndicator(data);
          break;
        case 'message_read':
          updateMessageReadStatus(data.message_id);
          break;
        case 'user_status':
          if (selectedRoom && data.user_id === selectedRoom.client.id) {
            setIsClientOnline(data.is_online);
          }
          break;
        default:
          console.log('Unknown WS message type:', data.type);
      }
    };
    ws.onerror = (error) => console.error('❌ WebSocket error:', error);
    ws.onclose = () => console.log('🔴 WebSocket disconnected');
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
      wsRef.current.send(JSON.stringify({ type: 'typing', is_typing: isTyping }));
    }
  };

  const handleInputChange = (e) => {
    setMessageText(e.target.value);
    if (e.target.value.length > 0) {
      sendTypingIndicator(true);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => sendTypingIndicator(false), 1000);
    } else {
      sendTypingIndicator(false);
    }
  };

  const sendMessage = async () => {
    if ((!messageText.trim() && !selectedFile) || !selectedRoom) return;

    try {
      setSending(true);
      sendTypingIndicator(false);

      if (selectedFile) {
        const formData = new FormData();
        formData.append('room', selectedRoom.room_id);
        formData.append('file', selectedFile);
        formData.append('message_type', 'FILE');
        if (messageText.trim()) formData.append('content', messageText.trim());
        await api.post('/api/chat/messages/', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
        setMessageText('');
        clearFile();
      } else {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ type: 'chat_message', message_type: 'TEXT', content: messageText.trim() }));
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
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => setFilePreview(reader.result);
        reader.readDataURL(file);
      } else {
        setFilePreview(null);
      }
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
    setFilePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
  };

  const startNewChat = async (userId) => {
    try {
      const response = await api.post('/api/chat/rooms/', { client_id: userId, subject: 'Support Chat' });
      const newRoom = response.data;
      setRooms(prev => [newRoom, ...prev.filter(r => r.client.id !== userId)]); // Add new/replace existing
      setSelectedRoom(newRoom);
      setSearchQuery('');
    } catch (error) {
      console.error('Error creating room:', error);
    }
  };

  const handleDeleteChat = async () => {
    if (!selectedRoom || !selectedRoom.is_active) return;
    if (window.confirm('Are you sure you want to delete this conversation? It will be marked as "Closed".')) {
      try {
        await api.post(`/api/chat/rooms/${selectedRoom.room_id}/close/`);
        const updatedRoom = { ...selectedRoom, is_active: false };
        setSelectedRoom(updatedRoom);
        setRooms(prevRooms => prevRooms.map(r => r.room_id === updatedRoom.room_id ? updatedRoom : r));
      } catch (error) {
        console.error('Error deleting chat:', error);
        alert('Failed to delete chat.');
      }
    }
  };

  // NEW Function to fetch drawer data
  const fetchDrawerData = async (userId) => {
    if (!userId) return;
    setDrawerLoading(true);
    drawerUserIdRef.current = userId;
    try {
      const userResponse = await api.get(`/api/auth/users/${userId}/`);
      setDrawerUserData(userResponse.data);
      const subsResponse = await api.get(`/api/subscriptions/?client_id=${userId}`);
      setDrawerSubscriptions(subsResponse.data.results || subsResponse.data);
    } catch (error) {
      console.error('Error fetching drawer data:', error);
      setDrawerUserData(null);
      setDrawerSubscriptions([]);
    } finally {
      setDrawerLoading(false);
    }
  };

  // NEW Function to handle opening the drawer
  const handleOpenDrawer = () => {
    if (selectedRoom?.client?.id) {
      setIsDrawerOpen(true);
      if (drawerUserIdRef.current !== selectedRoom.client.id) {
          fetchDrawerData(selectedRoom.client.id);
      }
    }
  };

  const getFilteredItems = () => {
    const query = searchQuery.toLowerCase();
    const filteredRooms = rooms.filter(room =>
      room.client.username.toLowerCase().includes(query) ||
      room.client.email?.toLowerCase().includes(query) ||
      room.client.full_name?.toLowerCase().includes(query) ||
      room.last_message?.content?.toLowerCase().includes(query)
    );
    const filteredUsers = availableUsers.filter(u =>
      u.role === 'CLIENT' &&
      (u.username.toLowerCase().includes(query) ||
        u.email?.toLowerCase().includes(query) ||
        u.first_name?.toLowerCase().includes(query) ||
        u.last_name?.toLowerCase().includes(query))
    );
    const roomUserIds = rooms.map(r => r.client.id);
    const newUsers = filteredUsers.filter(u => !roomUserIds.includes(u.id));
    return { conversations: filteredRooms, newContacts: newUsers };
  };

  const formatTime = (date) => {
    const messageDate = new Date(date);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (messageDate.toDateString() === today.toDateString()) {
      return messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (messageDate.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return messageDate.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const formatDateDivider = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return date.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase();
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

  const filteredItems = getFilteredItems();

  return (
    <DashboardLayout
    breadcrumbs={breadcrumbs}  
    >
      <div className="flex h-[calc(100vh-4rem)] bg-gray-100">
        {/* Sidebar */}
        <div className={`${showSidebar ? 'w-full md:w-96' : 'hidden md:block md:w-96'} bg-white border-r flex flex-col`}>
          {/* Sidebar Header */}
          <div className="bg-white border-b p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search or start new chat"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-100 text-gray-900 placeholder-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-colors"
              />
            </div>
          </div>

          {/* Conversations/Contacts List */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
              </div>
            ) : (() => {
              const { conversations, newContacts } = getFilteredItems();
              const hasResults = conversations.length > 0 || newContacts.length > 0;

              return !hasResults ? (
                <div className="text-center text-gray-500 py-8 px-4">
                  <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p className="font-medium">No results found</p>
                  <p className="text-sm mt-1">Try a different search term</p>
                </div>
              ) : (
                <>
                  {conversations.length > 0 && conversations.map((room) => {
                    const isSelected = selectedRoom?.room_id === room.room_id;
                    const hasUnread = room.unread_count > 0;
                    return (
                      <button
                        key={room.room_id}
                        onClick={() => { setSelectedRoom(room); setShowSidebar(false); }}
                        className={`w-full text-left p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors ${isSelected ? 'bg-indigo-50' : ''}`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="relative flex-shrink-0">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center text-white font-bold">
                              {room.client.initials}
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <h4 className={`font-semibold text-sm truncate ${hasUnread ? 'text-gray-900' : 'text-gray-700'}`}>
                                {room.client.full_name || room.client.username}
                              </h4>
                              <div className="flex flex-col items-end flex-shrink-0 ml-2">
                                {room.last_message && (
                                  <span className={`text-xs ${hasUnread ? 'text-indigo-600 font-semibold' : 'text-gray-500'}`}>
                                    {formatTime(room.last_message.created_at)}
                                  </span>
                                )}
                                {hasUnread && (
                                  <div className="mt-1 w-5 h-5 bg-indigo-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                                    {room.unread_count}
                                  </div>
                                )}
                              </div>
                            </div>
                            {room.subject && <p className="text-xs text-gray-600 mb-1 truncate">{room.subject}</p>}
                            {room.room_id === selectedRoom?.room_id && typingUsers.length > 0 ? (
                              <p className="text-sm text-green-600 italic">typing...</p>
                            ) : room.last_message ? (
                              <p className={`text-sm truncate ${hasUnread ? 'text-gray-900 font-medium' : 'text-gray-600'}`}>
                                {room.last_message.sender.id === user.id && (
                                  <span className="mr-1">
                                    {room.last_message.is_read ? <CheckCheck className="w-3 h-3 inline text-blue-500" /> : <Check className="w-3 h-3 inline text-gray-400" />}
                                  </span>
                                )}
                                {room.last_message.message_type === 'FILE' ? '📎 File' : room.last_message.content}
                              </p>
                            ) : <p className="text-sm text-gray-400">No messages yet</p>}
                            {!room.is_active && <span className="inline-block mt-1 px-2 py-0.5 bg-gray-200 text-gray-600 text-xs rounded-full">Closed</span>}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                  {newContacts.length > 0 && (
                    <>
                      {conversations.length > 0 && <div className="px-4 py-2 bg-gray-50 border-y border-gray-200"><p className="text-xs font-semibold text-gray-500 uppercase">New Contacts</p></div>}
                      {newContacts.map((contact) => (
                        <button key={contact.id} onClick={() => startNewChat(contact.id)} className="w-full text-left p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center text-white font-semibold">
                              {contact.initials || contact.username.substring(0, 2).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-gray-900 truncate">{contact.full_name || `${contact.first_name} ${contact.last_name}` || contact.username}</h4>
                              <p className="text-sm text-gray-600 truncate">{contact.email}</p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </>
                  )}
                </>
              );
            })()}
          </div>
        </div>

        {/* Chat Area */}
        <div className={`${!showSidebar || selectedRoom ? 'flex-1' : 'hidden md:flex-1'} flex flex-col bg-gray-50 relative`}>
          {selectedRoom ? (
            <>
              {/* Chat Header */}
              <div className="bg-white border-b border-gray-200 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div onClick={handleOpenDrawer} className="flex items-center gap-3 group" title="View user details">
                    <button onClick={(e) => { e.stopPropagation(); setShowSidebar(true); }} className="md:hidden p-2 -ml-2 mr-1 hover:bg-gray-100 rounded-lg group-hover:bg-transparent">
                      <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center text-white font-bold group-hover:scale-105 transition-transform">
                      {selectedRoom.client.initials}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">
                        {selectedRoom.client.full_name || selectedRoom.client.username}
                      </h3>
                      {typingUsers.length > 0 ? (
                        <p className="text-sm text-green-600">typing...</p>
                      ) : (
                        <p className={`text-sm ${isClientOnline ? 'text-green-600' : 'text-gray-500'}`}>
                          {isClientOnline ? 'Online' : 'Offline'}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedRoom.is_active ? (
                      <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full flex items-center gap-1">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>Active
                      </span>
                    ) : (
                      <span className="px-3 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full">Closed</span>
                    )}
                    <button onClick={handleDeleteChat} disabled={!selectedRoom.is_active} className="p-2 hover:bg-gray-100 rounded-full disabled:opacity-50 disabled:cursor-not-allowed" title="Delete Conversation">
                      <Trash2 className="w-5 h-5 text-red-600 hover:text-red-500" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%239C92AC\' fill-opacity=\'0.05\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }}>
                {messages.map((message, index) => {
                  const isOwn = message.sender.id === user.id;
                  const prevMessage = messages[index - 1];
                  const showDateDivider = !prevMessage || new Date(message.created_at).toDateString() !== new Date(prevMessage.created_at).toDateString();
                  return (
                    <Fragment key={message.message_id}>
                      {showDateDivider && <div className="flex justify-center my-4"><span className="bg-gray-200 text-gray-700 text-xs font-medium px-3 py-1 rounded-full">{formatDateDivider(message.created_at)}</span></div>}
                      <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-lg ${isOwn ? 'order-2' : 'order-1'}`}>
                          {!isOwn && <div className="flex items-center gap-2 mb-1"><span className="text-xs font-medium text-gray-700">{message.sender.full_name || message.sender.username}</span></div>}
                          <div className={`rounded-2xl px-4 py-3 ${isOwn ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white' : 'bg-white text-gray-900 border border-gray-200'}`}>
                            {message.message_type === 'FILE' && message.file && (
                              <div className={`mb-2 p-3 rounded-lg ${isOwn ? 'bg-white/20' : 'bg-gray-50'}`}>
                                {message.file_type?.startsWith('image/') ? <img src={message.file_url} alt={message.file_name} className="max-w-full rounded-lg mb-2" /> : (
                                  <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg ${isOwn ? 'bg-white/30' : 'bg-indigo-100'}`}>{getFileIcon(message.file_type)}</div>
                                    <div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{message.file_name}</p><p className={`text-xs ${isOwn ? 'text-white/70' : 'text-gray-500'}`}>{formatFileSize(message.file_size)}</p></div>
                                    <a href={message.file_url} download className={`p-2 rounded-lg hover:bg-white/30 transition-colors`}><Download className="w-4 h-4" /></a>
                                  </div>
                                )}
                              </div>
                            )}
                            {message.content && <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>}
                            <div className={`flex items-center justify-end gap-1 mt-1 text-xs ${isOwn ? 'text-white/70' : 'text-gray-500'}`}>
                              <span>{new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              {isOwn && (message.is_read ? <CheckCheck className="w-4 h-4 text-blue-300" /> : <Check className="w-4 h-4" />)}
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
                {selectedFile && (
                  <div className="mb-3 p-3 bg-gray-100 rounded-lg flex items-center gap-3">
                    {filePreview ? <img src={filePreview} alt="Preview" className="w-16 h-16 object-cover rounded" /> : <div className="w-16 h-16 bg-indigo-100 rounded flex items-center justify-center"><File className="w-8 h-8 text-indigo-600" /></div>}
                    <div className="flex-1 min-w-0"><p className="text-sm font-medium text-gray-700 truncate">{selectedFile.name}</p><p className="text-xs text-gray-500">{formatFileSize(selectedFile.size)}</p></div>
                    <button onClick={clearFile} className="text-gray-600 hover:text-red-600"><X className="w-5 h-5" /></button>
                  </div>
                )}
                <div className="flex items-end gap-2">
                  <button onClick={() => fileInputRef.current?.click()} className="p-3 text-gray-600 hover:bg-gray-100 rounded-full transition-colors"><Paperclip className="w-5 h-5" /></button>
                  <input ref={fileInputRef} type="file" onChange={handleFileSelect} className="hidden" />
                  <textarea value={messageText} onChange={handleInputChange} onKeyPress={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }} placeholder="Type a message..." rows={1} className="flex-1 px-4 py-3 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" style={{ minHeight: '48px', maxHeight: '120px' }} />
                  <button onClick={sendMessage} disabled={sending || (!messageText.trim() && !selectedFile)} className="p-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-full hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all">{sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}</button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <div className="w-24 h-24 mx-auto mb-4 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full flex items-center justify-center"><MessageSquare className="w-12 h-12 text-indigo-600" /></div>
                <h3 className="text-xl font-semibold mb-2 text-gray-900">Select a conversation</h3>
                <p className="text-gray-500">Choose a conversation from the list or start a new chat</p>
              </div>
            </div>
          )}
          <UserInfoDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} user={drawerUserData} subscriptions={drawerSubscriptions} loading={drawerLoading} />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default StaffChatPage;