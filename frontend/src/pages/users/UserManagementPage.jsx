// frontend/src/pages/UserManagementPage.jsx

import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getBreadcrumbs } from '../../utils/breadcrumbConfig';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import UsernameInput from '../../components/auth/UsernameInput';
import EmailInput from '../../components/auth/EmailInput';
import ExpandableRow from '../../contexts/ExpandableRow';

import {
  ArrowLeft, Users, Plus, Search, X, Edit, Trash2, Eye,
  ChevronDown, CheckCircle, XCircle, Download,
  AlertCircle, UserPlus, Save, Mail, User, Shield,
  Phone, Building, ChevronsUpDown, Calendar, Wifi,
  Settings, GripVertical, ChevronRight, ChevronUp,
  Columns, Maximize2, Check, Activity
} from 'lucide-react';
import * as XLSX from 'xlsx';

import DashboardLayout from '../../components/layout/DashboardLayout';
import LoadingSpinner from '../../components/LoadingSpinner';
import Pagination from '../../components/database/Pagination';
import { ToastContainer } from '../../components/Toast';
import DeleteConfirmationModal from '../../components/modals/DeleteConfirmationModal';
import { useToast } from '../../hooks/useToast';
import useUserStatus from '../../hooks/useUserStatus';
import UserLoginHistoryModal from '../../components/userActivity/UserLoginHistoryModal';
import api from '../../utils/api';

// --- Helper Functions & Components ---

const fetchUsers = async ({ queryKey }) => {
  const [_key, { page, pageSize, search, role, ordering }] = queryKey;
  const params = new URLSearchParams({
    page,
    page_size: pageSize
  });
  if (search) params.append('search', search);
  if (role) params.append('role', role);
  if (ordering) params.append('ordering', ordering);

  const { data } = await api.get(`/api/auth/users/?${params.toString()}`);
  return data;
};

const fetchDashboardStats = async () => {
  const { data } = await api.get('/api/dashboard-stats/');
  return data;
};

// 🆕 NEW: Fetch all online users
const fetchOnlineUsers = async () => {
  const { data } = await api.get('/api/auth/users/?page_size=1000'); // Get all users
  return data.results.filter(user => user.is_online); // Filter only online users
};

const ROLES = [
  { value: 'SUPERADMIN', label: 'Superadmin' },
  { value: 'STAFF_ADMIN', label: 'Staff Admin' },
  { value: 'DATA_COLLECTOR', label: 'Data Collector' },
  { value: 'CLIENT', label: 'Client' },
  { value: 'GUEST', label: 'Guest' },
];

const RoleBadge = ({ role }) => {
  const roleStyles = {
    SUPERADMIN: 'bg-red-100 text-red-800 border-red-200',
    STAFF_ADMIN: 'bg-purple-100 text-purple-800 border-purple-200',
    DATA_COLLECTOR: 'bg-blue-100 text-blue-800 border-blue-200',
    CLIENT: 'bg-green-100 text-green-800 border-green-200',
    GUEST: 'bg-gray-100 text-gray-800 border-gray-200',
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${roleStyles[role] || roleStyles['GUEST']}`}>
      <Shield className="w-3 h-3" />
      {role.replace('_', ' ')}
    </span>
  );
};

// Default column configuration
const DEFAULT_COLUMNS = [
  { id: 'user', label: 'User', field: 'first_name', visible: true, width: 300, sortable: true, resizable: true },
  { id: 'username', label: 'Username', field: 'username', visible: true, width: 150, sortable: true, resizable: true },
  { id: 'email', label: 'Email', field: 'email', visible: false, width: 200, sortable: true, resizable: true },
  { id: 'phone', label: 'Phone', field: 'phone_number', visible: false, width: 150, sortable: false, resizable: true },
  { id: 'company', label: 'Company', field: 'company_name', visible: true, width: 200, sortable: true, resizable: true },
  { id: 'role', label: 'Role', field: 'role', visible: true, width: 150, sortable: true, resizable: true },
  { id: 'status', label: 'Status', field: 'is_active', visible: false, width: 120, sortable: true, resizable: true },
  { id: 'online', label: 'Online Status', field: 'is_online', visible: true, width: 150, sortable: false, resizable: true },
  { id: 'dateJoined', label: 'Date Joined', field: 'date_joined', visible: true, width: 150, sortable: true, resizable: true },
];

// localStorage key
const COLUMNS_STORAGE_KEY = 'userManagementColumns';

const StatusBadge = ({ isActive }) => {
  return isActive ? (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
      <CheckCircle className="w-3 h-3" />
      Active
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">
      <XCircle className="w-3 h-3" />
      Inactive
    </span>
  );
};

const OnlineStatusBadge = ({ isOnline }) => {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
      isOnline
        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
        : 'bg-slate-50 text-slate-600 border-slate-200'
    }`}>
      <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}></div>
      {isOnline ? 'Online' : 'Offline'}
    </span>
  );
};

// 🆕 NEW: UserAvatar component for online users modal
const UserAvatar = ({ user, size = 'md' }) => {
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
  };

  const bgColors = {
    SUPERADMIN: 'bg-red-500',
    STAFF_ADMIN: 'bg-purple-500',
    DATA_COLLECTOR: 'bg-blue-500',
    CLIENT: 'bg-green-500',
    GUEST: 'bg-gray-500',
  };

  return (
    <div className={`${sizeClasses[size]} ${bgColors[user.role] || bgColors.GUEST} rounded-full flex items-center justify-center text-white font-semibold`}>
      {user.initials}
    </div>
  );
};

// 🆕 MODIFIED: StatCard with optional onClick
const StatCard = ({ label, value, subtitle, icon, color = 'gray', isLoading, onClick }) => {
  const IconComponent = icon;

  const colorClasses = {
    green: {
      icon: 'text-green-500',
      subtitle: 'text-green-600',
      bg: 'bg-green-100',
    },
    teal: {
      icon: 'text-teal-500',
      subtitle: 'text-teal-600',
      bg: 'bg-teal-100',
    },
    purple: {
      icon: 'text-purple-500',
      subtitle: 'text-purple-600',
      bg: 'bg-purple-100',
    },
    blue: {
      icon: 'text-blue-500',
      subtitle: 'text-blue-600',
      bg: 'bg-blue-100',
    },
    gray: {
      icon: 'text-gray-500',
      subtitle: 'text-gray-500',
      bg: 'bg-gray-100',
    },
  };

  const colors = colorClasses[color] || colorClasses.gray;

  // 🆕 NEW: Add cursor and hover effects if clickable
  const clickableClasses = onClick
    ? 'cursor-pointer hover:shadow-md hover:border-blue-300 transition-all duration-200'
    : '';

  return (
    <div
      className={`bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex justify-between items-start ${clickableClasses}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
    >
      {/* Left side: Text content */}
      <div className="flex flex-col">
        <p className="text-sm font-medium text-gray-600">{label}</p>
        {isLoading ? (
          <>
            <div className="h-8 w-12 bg-gray-200 rounded animate-pulse mt-1"></div>
            <div className="h-4 w-24 bg-gray-200 rounded animate-pulse mt-2"></div>
          </>
        ) : (
          <>
            <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
            <p className={`text-xs font-medium mt-2 ${colors.subtitle}`}>
              {subtitle}
            </p>
          </>
        )}
      </div>
      {/* Right side: Icon */}
      <div className={`p-3 rounded-lg ${colors.bg}`}>
        <IconComponent className={`w-6 h-6 ${colors.icon}`} />
      </div>
    </div>
  );
};


// 🆕 MODIFIED: OnlineUsersModal component - Now accepts onUserClick prop
const OnlineUsersModal = ({ isOpen, onClose, onlineUsers, isLoading, onUserClick }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState('ALL');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [sortBy, setSortBy] = useState('name'); // 'name', 'role', 'company'

  if (!isOpen) return null;

  // Filter and sort users
  const filteredUsers = onlineUsers
    .filter(user => {
      const matchesSearch =
        user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.company_name?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesRole = selectedRole === 'ALL' || user.role === selectedRole;

      return matchesSearch && matchesRole;
    })
    .sort((a, b) => {
      if (sortBy === 'name') {
        const nameA = a.full_name || a.username;
        const nameB = b.full_name || b.username;
        return nameA.localeCompare(nameB);
      } else if (sortBy === 'role') {
        return a.role.localeCompare(b.role);
      } else if (sortBy === 'company') {
        const compA = a.company_name || '';
        const compB = b.company_name || '';
        return compA.localeCompare(compB);
      }
      return 0;
    });

  // Calculate stats by role
  const roleStats = onlineUsers.reduce((acc, user) => {
    acc[user.role] = (acc[user.role] || 0) + 1;
    return acc;
  }, {});

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4">
          <div className="relative bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[85vh] flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg">
                    <Wifi className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Online Users</h2>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {isLoading ? 'Loading...' : (
                        <>
                          <span className="font-semibold text-blue-600">{filteredUsers.length}</span>
                          {filteredUsers.length !== onlineUsers.length && (
                            <span className="text-gray-400"> of {onlineUsers.length}</span>
                          )}
                          {' '}{filteredUsers.length === 1 ? 'user' : 'users'}
                          {searchQuery || selectedRole !== 'ALL' ? ' (filtered)' : ' currently online'}
                        </>
                      )}
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {/* Quick Stats */}
              {!isLoading && onlineUsers.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {ROLES.map(({ value, label }) => {
                    const count = roleStats[value] || 0;
                    if (count === 0 && selectedRole !== value) return null;

                    const roleColors = {
                      SUPERADMIN: 'bg-red-50 text-red-700 border-red-200',
                      STAFF_ADMIN: 'bg-purple-50 text-purple-700 border-purple-200',
                      CLIENT: 'bg-green-50 text-green-700 border-green-200',
                      GUEST: 'bg-gray-50 text-gray-700 border-gray-200',
                    };

                    return (
                      <div
                        key={value}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${roleColors[value]}`}
                      >
                        {label}: <span className="font-bold">{count}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Search and Filters */}
              <div className="flex flex-col sm:flex-row gap-3">
                {/* Search */}
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by name, email, or company..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded"
                    >
                      <X className="w-3 h-3 text-gray-400" />
                    </button>
                  )}
                </div>

                {/* Role Filter */}
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-sm font-medium"
                >
                  <option value="ALL">All Roles</option>
                  {ROLES.map(({ value, label }) => (
                    <option key={value} value={value}>
                      {label} {roleStats[value] ? `(${roleStats[value]})` : ''}
                    </option>
                  ))}
                </select>

                {/* Sort */}
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-sm font-medium"
                >
                  <option value="name">Sort by Name</option>
                  <option value="role">Sort by Role</option>
                  <option value="company">Sort by Company</option>
                </select>

                {/* View Toggle */}
                <div className="flex border border-gray-300 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`px-3 py-2 text-sm font-medium transition-colors ${
                      viewMode === 'grid'
                        ? 'bg-blue-50 text-blue-700'
                        : 'bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    Grid
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`px-3 py-2 text-sm font-medium transition-colors border-l border-gray-300 ${
                      viewMode === 'list'
                        ? 'bg-blue-50 text-blue-700'
                        : 'bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    List
                  </button>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <LoadingSpinner />
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="text-center py-12">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                    <Users className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {searchQuery || selectedRole !== 'ALL' ? 'No matching users found' : 'No users online'}
                  </h3>
                  <p className="text-gray-500">
                    {searchQuery || selectedRole !== 'ALL'
                      ? 'Try adjusting your search or filters'
                      : 'Check back later to see who\'s online'
                    }
                  </p>
                </div>
              ) : viewMode === 'grid' ? (
                /* Grid View - Compact cards */
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {filteredUsers.map((user) => (
                    <div
                      key={user.id}
                      onClick={() => onUserClick && onUserClick(user)}
                      className="relative bg-gradient-to-br from-gray-50 to-white border border-gray-200 rounded-lg p-4 hover:shadow-md hover:border-blue-300 transition-all cursor-pointer group"
                    >
                      {/* Online indicator */}
                      <div className="absolute top-2 right-2 w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse ring-2 ring-emerald-100"></div>

                      {/* Avatar */}
                      <div className="flex justify-center mb-3">
                        <UserAvatar user={user} size="lg" />
                      </div>

                      {/* User Info */}
                      <div className="text-center">
                        <h3 className="font-semibold text-gray-900 text-sm truncate mb-1 group-hover:text-blue-600 transition-colors" title={user.full_name || user.username}>
                          {user.full_name || user.username}
                        </h3>
                        <p className="text-xs text-gray-500 truncate mb-2" title={user.email}>
                          {user.email}
                        </p>

                        {/* Role Badge - Smaller */}
                        <div className="flex justify-center mb-2">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${
                            {
                              SUPERADMIN: 'bg-red-50 text-red-700 border-red-200',
                              STAFF_ADMIN: 'bg-purple-50 text-purple-700 border-purple-200',
                              CLIENT: 'bg-green-50 text-green-700 border-green-200',
                              GUEST: 'bg-gray-50 text-gray-700 border-gray-200',
                            }[user.role]
                          }`}>
                            <Shield className="w-2.5 h-2.5" />
                            {user.role.replace('_', ' ')}
                          </span>
                        </div>

                        {/* Company */}
                        {user.company_name && (
                          <p className="text-xs text-gray-600 truncate flex items-center justify-center gap-1" title={user.company_name}>
                            <Building className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate">{user.company_name}</span>
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                /* List View - More detailed */
                <div className="space-y-2">
                  {filteredUsers.map((user) => (
                    <div
                      key={user.id}
                      onClick={() => onUserClick && onUserClick(user)}
                      className="flex items-center gap-4 p-3 bg-gradient-to-r from-gray-50 to-white border border-gray-200 rounded-lg hover:shadow-md hover:border-blue-300 transition-all cursor-pointer group"
                    >
                      {/* Avatar */}
                      <div className="relative">
                        <UserAvatar user={user} size="md" />
                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white animate-pulse"></div>
                      </div>

                      {/* User Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-gray-900 truncate text-sm group-hover:text-blue-600 transition-colors">
                            {user.full_name || user.username}
                          </h3>
                        </div>
                        <p className="text-xs text-gray-600 truncate">
                          {user.email}
                        </p>
                      </div>

                      {/* Role and Company */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${
                          {
                            SUPERADMIN: 'bg-red-50 text-red-700 border-red-200',
                            STAFF_ADMIN: 'bg-purple-50 text-purple-700 border-purple-200',
                            CLIENT: 'bg-green-50 text-green-700 border-green-200',
                            GUEST: 'bg-gray-50 text-gray-700 border-gray-200',
                          }[user.role]
                        }`}>
                          <Shield className="w-3 h-3" />
                          {user.role.replace('_', ' ')}
                        </span>

                        {user.company_name && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-50 text-gray-700 border border-gray-200 max-w-[120px]">
                            <Building className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate">{user.company_name}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
              <div className="text-sm text-gray-600">
                Showing <span className="font-semibold text-gray-900">{filteredUsers.length}</span> of <span className="font-semibold text-gray-900">{onlineUsers.length}</span> online users
              </div>
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

// Sortable Table Header Component
const ResizableHeader = ({ column, currentSort, onSort, onResize }) => {
  const [isMouseDown, setIsMouseDown] = useState(false);
  const startX = useRef(0);
  const startWidth = useRef(0);

  const handleMouseDown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsMouseDown(true);
    startX.current = e.clientX;
    startWidth.current = column.width;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isMouseDown) {
        const diff = e.clientX - startX.current;
        const newWidth = Math.max(100, startWidth.current + diff);
        onResize(column.id, newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsMouseDown(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    if (isMouseDown) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isMouseDown, column.id, onResize]);

  const isActive = currentSort.startsWith(column.field) || currentSort.startsWith(`-${column.field}`);
  const isDesc = currentSort === `-${column.field}`;

  return (
    <th
      className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider bg-gray-50 select-none relative group"
      style={{ width: column.width, minWidth: column.width, maxWidth: column.width }}
    >
      <div
        className="flex items-center gap-2 cursor-pointer"
        onClick={() => column.sortable && onSort(column.field)}
      >
        <span>{column.label}</span>
        {column.sortable && (
          <div className="flex flex-col">
            {isActive ? (
              isDesc ? <ChevronDown className="w-4 h-4 text-indigo-600" /> : <ChevronUp className="w-4 h-4 text-indigo-600" />
            ) : (
              <ChevronsUpDown className="w-4 h-4 text-gray-400" />
            )}
          </div>
        )}
      </div>

      {/* Resize handle */}
      {column.resizable && (
        <div
          className="absolute top-0 right-0 h-full w-1 cursor-col-resize hover:bg-indigo-400 group-hover:bg-indigo-200"
          onMouseDown={handleMouseDown}
        />
      )}
    </th>
  );
};

// Column Settings Modal Component
const ColumnSettingsModal = ({ isOpen, onClose, columns, onColumnsChange, onReset }) => {
  const [localColumns, setLocalColumns] = useState(columns);
  const [draggedIndex, setDraggedIndex] = useState(null);

  useEffect(() => {
    setLocalColumns(columns);
  }, [columns]);

  if (!isOpen) return null;

  const handleToggleColumn = (columnId) => {
    setLocalColumns(localColumns.map(col =>
      col.id === columnId ? { ...col, visible: !col.visible } : col
    ));
  };

  const handleDragStart = (index) => {
    setDraggedIndex(index);
  };

  const handleDragEnter = (index) => {
    if (draggedIndex === null || draggedIndex === index) return;

    const newColumns = [...localColumns];
    const draggedItem = newColumns[draggedIndex];
    newColumns.splice(draggedIndex, 1);
    newColumns.splice(index, 0, draggedItem);

    setLocalColumns(newColumns);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const handleSave = () => {
    onColumnsChange(localColumns);
    onClose();
  };

  const handleReset = () => {
    onReset();
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4">
          <div className="relative bg-white rounded-xl shadow-2xl max-w-md w-full">
            {/* Header */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-100 rounded-lg">
                    <Columns className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">Column Settings</h2>
                    <p className="text-sm text-gray-500 mt-0.5">Customize table columns</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              <div className="space-y-2">
                {localColumns.map((column, index) => (
                  <div
                    key={column.id}
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragEnter={() => handleDragEnter(index)}
                    onDragEnd={handleDragEnd}
                    onDragOver={(e) => e.preventDefault()}
                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-move transition-colors group"
                  >
                    <GripVertical className="w-5 h-5 text-gray-400 group-hover:text-gray-600" />
                    <input
                      type="checkbox"
                      checked={column.visible}
                      onChange={() => handleToggleColumn(column.id)}
                      className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer"
                    />
                    <span className={`flex-1 text-sm font-medium ${column.visible ? 'text-gray-900' : 'text-gray-400'}`}>
                      {column.label}
                    </span>
                    {column.visible && <Check className="w-4 h-4 text-green-600" />}
                  </div>
                ))}
              </div>

              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-900 font-medium">💡 Tip</p>
                <p className="text-sm text-blue-700 mt-1">
                  Drag columns to reorder them. Uncheck to hide columns from the table.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-between gap-3">
              <button
                onClick={handleReset}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 font-medium text-sm text-gray-700 transition-colors"
              >
                Reset to Default
              </button>
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 font-medium text-sm text-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium text-sm transition-colors flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};


// --- Main Page Component ---

const UserManagementPage = () => {
  const navigate = useNavigate();
  const location = useLocation();  
  const breadcrumbs = getBreadcrumbs(location.pathname);    
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [ordering, setOrdering] = useState('-date_joined');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isOnlineUsersModalOpen, setIsOnlineUsersModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [viewingUser, setViewingUser] = useState(null);
  const [deletingUser, setDeletingUser] = useState(null);

  // 🆕 NEW: State for login history modal
  const [isLoginHistoryModalOpen, setIsLoginHistoryModalOpen] = useState(false);
  const [selectedUserForHistory, setSelectedUserForHistory] = useState(null);

  const { toasts, removeToast, success, error: showError } = useToast();
  const queryClient = useQueryClient();

  const [columns, setColumns] = useState(() => {
    const saved = localStorage.getItem(COLUMNS_STORAGE_KEY);
    return saved ? JSON.parse(saved) : DEFAULT_COLUMNS;
  });
  const [isColumnSettingsOpen, setIsColumnSettingsOpen] = useState(false);
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [inlineEditingRow, setInlineEditingRow] = useState(null);
  const [editedData, setEditedData] = useState({});

  // Enable real-time user status updates via WebSocket
  useUserStatus();

  useEffect(() => {
    localStorage.setItem(COLUMNS_STORAGE_KEY, JSON.stringify(columns));
  }, [columns]);

// Column management handlers
const handleColumnsChange = (newColumns) => {
  setColumns(newColumns);
};

const handleResetColumns = () => {
  setColumns(DEFAULT_COLUMNS);
  localStorage.removeItem(COLUMNS_STORAGE_KEY);
};

const handleColumnResize = (columnId, newWidth) => {
  setColumns(columns.map(col =>
    col.id === columnId ? { ...col, width: newWidth } : col
  ));
};

// Row expansion handlers
const handleToggleExpand = (userId) => {
  const newExpanded = new Set(expandedRows);
  if (newExpanded.has(userId)) {
    newExpanded.delete(userId);
  } else {
    newExpanded.add(userId);
  }
  setExpandedRows(newExpanded);
};

// Inline editing handlers
const handleInlineEdit = (user) => {
  setInlineEditingRow(user.id);
  setEditedData({
    first_name: user.first_name || '',
    last_name: user.last_name || '',
    username: user.username,
    email: user.email,
    phone_number: user.phone_number || '',
    company_name: user.company_name || '',
    role: user.role,
    is_active: user.is_active,
  });
};

const handleInlineEditSave = () => {
  if (inlineEditingRow) {
    mutation.mutate({ id: inlineEditingRow, ...editedData });
    setInlineEditingRow(null);
    setEditedData({});
  }
};

const handleInlineEditCancel = () => {
  setInlineEditingRow(null);
  setEditedData({});
};

const handleEditedDataChange = (field, value) => {
  setEditedData({ ...editedData, [field]: value });
};

  // Existing query for the user list
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['users', { page, pageSize, search, role: roleFilter, ordering }],
    queryFn: fetchUsers,
    keepPreviousData: true,
  });

  // --- NEW: Query for dashboard stats ---
  const {
    data: statsData,
    isLoading: isStatsLoading,
    isError: isStatsError,
  } = useQuery({
    queryKey: ['dashboardStats'],
    queryFn: fetchDashboardStats,
    staleTime: 1000 * 60 * 5,
  });

    // 🆕 NEW: Query for online users (only fetched when modal is open)
    const {
      data: onlineUsersData,
      isLoading: isOnlineUsersLoading,
    } = useQuery({
      queryKey: ['onlineUsers'],
      queryFn: fetchOnlineUsers,
      enabled: isOnlineUsersModalOpen,
      refetchInterval: 5000,
    });

  const users = data?.results || [];
  const totalCount = data?.count || 0;
  const totalPages = pageSize > 0 ? Math.ceil(totalCount / pageSize) : 0;
  const onlineUsersCount = users.filter(user => user.is_online).length;

    const mutation = useMutation({
      mutationFn: (userData) => {
        const { id, ...payload } = userData;

        if (id) {
          // Update existing user
          const url = `/api/auth/users/${id}/`;
          return api.patch(url, payload);
        } else {
          // Create new user with email
          return api.post('/api/auth/create-user-send-email/', payload);
        }
      },
      onSuccess: (data, variables) => {
        queryClient.invalidateQueries(['users']);
        queryClient.invalidateQueries(['dashboardStats']);
        queryClient.invalidateQueries(['onlineUsers']);
        setIsModalOpen(false);
        setEditingUser(null);

        // Show success toast
        if (variables.id) {
          success('User updated successfully!');
        } else {
          success('User created successfully! Password link sent to their email.');
        }
      },
      onError: (err) => {
        showError('Failed to save user. Please try again.');
      },
    });

  const deleteMutation = useMutation({
    mutationFn: (userId) => api.delete(`/api/auth/users/${userId}/`),
    onSuccess: () => {
      queryClient.invalidateQueries(['users']);
      queryClient.invalidateQueries(['dashboardStats']);
      queryClient.invalidateQueries(['onlineUsers']);
      setIsDeleteModalOpen(false);
      setDeletingUser(null);
      success('User deleted successfully!');
    },
    onError: (err) => {
      showError('Failed to delete user. Please try again.');
    },
  });

  const handleOpenModal = (user = null) => {
    setEditingUser(user);
    setIsModalOpen(true);
  };

  const handleViewUser = (user) => {
    setViewingUser(user);
    setIsViewModalOpen(true);
  };

  const handleDelete = (user) => {
    setDeletingUser(user);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = () => {
    if (deletingUser) {
      deleteMutation.mutate(deletingUser.id);
    }
  };

  const handlePageChange = (newPage) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePageSizeChange = (newPageSize) => {
    setPageSize(newPageSize);
    setPage(1);
  };

  const handleSort = (field) => {
    if (ordering === field) {
      setOrdering(`-${field}`);
    } else if (ordering === `-${field}`) {
      setOrdering('');
    } else {
      setOrdering(field);
    }
    setPage(1);
  };

  const handleSearchReset = () => {
    setSearch('');
    setPage(1);
  };

  // Export to Excel function
  const handleExportToExcel = () => {
    // Prepare data for export
    const exportData = users.map(user => ({
      'Username': user.username,
      'Full Name': user.full_name,
      'Email': user.email,
      'Phone': user.phone_number || '',
      'Company': user.company_name || '',
      'Role': user.role.replace('_', ' '),
      'Status': user.is_active ? 'Active' : 'Inactive',
      'Online': user.is_online ? 'Online' : 'Offline',
      'Last Login': user.last_login ? new Date(user.last_login).toLocaleString() : 'Never',
      'Date Joined': new Date(user.date_joined).toLocaleDateString(),
    }));

    // Create worksheet
    const ws = XLSX.utils.json_to_sheet(exportData);

    // Create workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Users');

    // Generate filename with current date
    const filename = `users_export_${new Date().toISOString().split('T')[0]}.xlsx`;

    // Save file
    XLSX.writeFile(wb, filename);
  };

  // Format date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // 🆕 NEW: Handler to open login history modal from online users modal
  const handleUserClickFromOnlineModal = (user) => {
    setSelectedUserForHistory(user);
    setIsLoginHistoryModalOpen(true);
  };

  // --- NEW: Define the header subtitle ---
  const pageSubtitle = (
    <p className="text-sm text-white-500">Add, edit, and manage all platform users.</p>
  );

  return (
    <DashboardLayout
        pageTitle="User Management"
        pageSubtitleBottom={pageSubtitle}
        breadcrumbs={breadcrumbs}
    >
      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      {/* Main Content */}
      <div className="p-8">

        {/* --- MODIFIED: Stats Cards Grid (Redesigned) --- */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <StatCard
            icon={Users}
            label="Total Clients"
            value={statsData?.total_clients ?? 0}
            subtitle={
              statsData?.new_clients > 0
                ? `+${statsData.new_clients} new users`
                : (statsData ? 'All clients' : ' ')
            }
            color="green"
            isLoading={isStatsLoading}
          />
          <StatCard
            icon={Users}
            label="Staff Members"
            value={statsData?.total_staff ?? 0}
            subtitle="Active staff accounts"
            color="purple"
            isLoading={isStatsLoading}
          />
          <StatCard
            icon={Calendar}
            label="Guest Users"
            value={statsData?.total_guests ?? 0}
            subtitle="Guest accounts"
            color="teal"
            isLoading={isStatsLoading}
          />
          {/* 🆕 NEW: Online Users Card - Clickable */}
          <StatCard
            icon={Wifi}
            label="Online Users"
            value={onlineUsersCount}
            subtitle="Click to view details"
            color="blue"
            isLoading={isLoading}
            onClick={() => setIsOnlineUsersModalOpen(true)}
          />
        </div>

        {/* Show error message if stats fail to load */}
        {isStatsError && (
            <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-lg mb-6">
              <p>Could not load user statistics. Please try again later.</p>
           </div>
        )}


        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          {/* Toolbar */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
              {/* Search and Filter */}
              <div className="w-full lg:w-auto flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setPage(1);
                    }}
                    className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                  />
                  {search && (
                    <button
                      onClick={handleSearchReset}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                      title="Clear search"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}
                </div>
                <select
                  value={roleFilter}
                  onChange={(e) => {
                    setRoleFilter(e.target.value);
                    setPage(1);
                  }}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition bg-white cursor-pointer appearance-none"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                    backgroundPosition: 'right 0.5rem center',
                    backgroundRepeat: 'no-repeat',
                    backgroundSize: '1.5em 1.5em',
                    paddingRight: '2.5rem'
                  }}
                >
                  <option value="">All Roles</option>
                  {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 w-full lg:w-auto">
                {/* 🆕 NEW: Navigate to User Activity Button */}
                <button
                  onClick={() => navigate('/user-activity')}
                  className="flex-1 lg:flex-none px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center justify-center gap-2 shadow-md text-sm"
                >
                  <Activity className="w-5 h-5" />
                  User Activity
                </button>
                <button
                  onClick={handleExportToExcel}
                  className="flex-1 lg:flex-none px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center justify-center gap-2 shadow-md text-sm"
                >
                  <Download className="w-5 h-5" />
                  Export to Excel
                </button>
                <button
                  onClick={() => handleOpenModal()}
                  className="flex-1 lg:flex-none px-5 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition flex items-center justify-center gap-2 shadow-md text-sm"
                >
                  <UserPlus className="w-5 h-5" />
                  Add User
                </button>
                <button
                  onClick={() => setIsColumnSettingsOpen(true)}
                  className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 text-gray-700 bg-white rounded-lg hover:bg-gray-50 font-medium text-sm transition-colors"
                >
                  <Settings className="w-4 h-4" />
                  Columns
                </button>
              </div>
            </div>
          </div>

          {/* Table */}
            <div className="overflow-x-auto" style={{ maxHeight: 'calc(100vh - 400px)' }}>
              <table className="min-w-full divide-y divide-gray-200">
                {/* Sticky Header */}
                <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
                  <tr>
                    {/* Expand/Collapse column */}
                    <th className="px-6 py-4 w-12 bg-gray-50"></th>

                    {/* Dynamic columns based on visibility */}
                    {columns.filter(col => col.visible).map((column) => (
                      <ResizableHeader
                        key={column.id}
                        column={column}
                        currentSort={ordering}
                        onSort={handleSort}
                        onResize={handleColumnResize}
                      />
                    ))}

                    {/* Actions column */}
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider bg-gray-50 sticky right-0">
                      Actions
                    </th>
                  </tr>
                </thead>

                {/* Table body */}
                <tbody className="bg-white divide-y divide-gray-200">
                  {isLoading ? (
                    <tr>
                      <td colSpan={columns.filter(col => col.visible).length + 2} className="text-center py-12">
                        <LoadingSpinner />
                      </td>
                    </tr>
                  ) : isError ? (
                    <tr>
                      <td colSpan={columns.filter(col => col.visible).length + 2} className="text-center py-12 text-red-600">
                        {error.message}
                      </td>
                    </tr>
                  ) : users.length === 0 ? (
                    <tr>
                      <td colSpan={columns.filter(col => col.visible).length + 2} className="text-center py-12 text-gray-500">
                        No users found.
                      </td>
                    </tr>
                  ) : (
                    users.map((user, index) => (
                      <ExpandableRow
                        key={user.id}
                        user={user}
                        index={index}
                        columns={columns}
                        isExpanded={expandedRows.has(user.id)}
                        onToggleExpand={handleToggleExpand}
                        onEdit={handleOpenModal}
                        onView={handleViewUser}
                        onDelete={handleDelete}
                        isInlineEdit={inlineEditingRow === user.id}
                        onInlineEdit={handleInlineEdit}
                        onInlineEditSave={handleInlineEditSave}
                        onInlineEditCancel={handleInlineEditCancel}
                        editedData={editedData}
                        onEditedDataChange={handleEditedDataChange}
                        RoleBadge={RoleBadge}
                        StatusBadge={StatusBadge}
                        OnlineStatusBadge={OnlineStatusBadge}
                        formatDate={formatDate}
                      />
                    ))
                  )}
                </tbody>
              </table>
            </div>

          {/* Pagination */}
          {!isLoading && !isError && users.length > 0 && (
            <div className="p-4 border-t border-gray-200">
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                totalCount={totalCount}
                pageSize={pageSize}
                onPageChange={handlePageChange}
                onPageSizeChange={handlePageSizeChange}
              />
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {isModalOpen && (
        <UserFormModal
          user={editingUser}
          onClose={() => {
            setIsModalOpen(false);
            setEditingUser(null);
          }}
          onSubmit={(userData) => mutation.mutate(userData)}
          isLoading={mutation.isLoading}
          error={mutation.error}
        />
      )}

      {isViewModalOpen && viewingUser && (
        <ViewUserModal
          user={viewingUser}
          onClose={() => {
            setIsViewModalOpen(false);
            setViewingUser(null);
          }}
          onEdit={() => {
            setIsViewModalOpen(false);
            handleOpenModal(viewingUser);
          }}
        />
      )}

      {isDeleteModalOpen && (
        <DeleteConfirmationModal
          isOpen={isDeleteModalOpen}
          onClose={() => {
            setIsDeleteModalOpen(false);
            setDeletingUser(null);
          }}
          onConfirm={confirmDelete}
          title="Delete User"
          message={`Are you sure you want to delete ${deletingUser?.full_name || deletingUser?.username}? This action cannot be undone.`}
          isLoading={deleteMutation.isLoading}
        />
      )}

      {/* 🆕 MODIFIED: Online Users Modal with onUserClick prop */}
      {isOnlineUsersModalOpen && (
        <OnlineUsersModal
          isOpen={isOnlineUsersModalOpen}
          onClose={() => setIsOnlineUsersModalOpen(false)}
          onlineUsers={onlineUsersData || []}
          isLoading={isOnlineUsersLoading}
          onUserClick={handleUserClickFromOnlineModal}
        />
      )}

      {/* 🆕 NEW: Login History Modal */}
      {isLoginHistoryModalOpen && selectedUserForHistory && (
        <UserLoginHistoryModal
          user={selectedUserForHistory}
          onClose={() => {
            setIsLoginHistoryModalOpen(false);
            setSelectedUserForHistory(null);
          }}
        />
      )}

      {/* Column Settings Modal */}
      {isColumnSettingsOpen && (
        <ColumnSettingsModal
          isOpen={isColumnSettingsOpen}
          onClose={() => setIsColumnSettingsOpen(false)}
          columns={columns}
          onColumnsChange={handleColumnsChange}
          onReset={handleResetColumns}
        />
      )}
    </DashboardLayout>
  );
};

// View User Modal Component
const ViewUserModal = ({ user, onClose, onEdit }) => {
  if (!user) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="p-6 border-b">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-900">User Details</h2>
            <button onClick={onClose} className="p-2 text-gray-500 hover:text-gray-800 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Username</label>
              <p className="text-gray-900 font-medium">{user.username}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Email</label>
              <p className="text-gray-900 font-medium">{user.email}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">First Name</label>
              <p className="text-gray-900 font-medium">{user.first_name || '-'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Last Name</label>
              <p className="text-gray-900 font-medium">{user.last_name || '-'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Phone Number</label>
              <p className="text-gray-900 font-medium">{user.phone_number || '-'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Company</label>
              <p className="text-gray-900 font-medium">{user.company_name || '-'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Role</label>
              <div className="mt-1">
                <RoleBadge role={user.role} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Status</label>
              <div className="mt-1">
                <StatusBadge isActive={user.is_active} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Online Status</label>
              <div className="mt-1">
                <OnlineStatusBadge isOnline={user.is_online} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Date Joined</label>
              <p className="text-gray-900 font-medium">
                {new Date(user.date_joined).toLocaleDateString()}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Last Login</label>
              <p className="text-gray-900 font-medium">
                {user.last_login ? new Date(user.last_login).toLocaleString() : 'Never'}
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 border-t bg-gray-50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-100 font-medium text-sm transition-colors"
          >
            Close
          </button>
          <button
            onClick={onEdit}
            className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium text-sm flex items-center gap-2 transition-colors"
          >
            <Edit className="w-4 h-4" />
            Edit User
          </button>
        </div>
      </div>
    </div>
  );
};

// User Form Modal Component
const UserFormModal = ({ user, onClose, onSubmit, isLoading, error }) => {
  const [formData, setFormData] = useState({
    username: user?.username || '',
    email: user?.email || '',
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    phone_number: user?.phone_number || '',
    company_name: user?.company_name || '',
    role: user?.role || 'CLIENT',
    is_active: user?.is_active !== undefined ? user.is_active : true,
  });

  // New state to track validation status
  const [usernameValid, setUsernameValid] = useState(!!user);
  const [emailValid, setEmailValid] = useState(!!user);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // ✅ VALIDATION: Check if email is available (if EmailInput validation failed)
    if (!user && !emailValid) {
      showError('Please use a valid and available email address');
      return;
    }

    // ✅ VALIDATION: Check if username is available (if UsernameInput validation failed)
    if (!user && !usernameValid) {
      showError('Please use a valid and available username');
      return;
    }

    const payload = { ...formData };
    if (user) {
      payload.id = user.id;
    }
    onSubmit(payload);
  };

  const apiError = error?.response?.data;

  // Enable submit button when required fields (username and email) are filled
  // Validation will still happen on submit via handleSubmit function
  const canSubmit = formData.username.trim() && formData.email.trim();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="p-6 border-b bg-indigo-600">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold text-white">
                {user ? 'Edit User' : 'Add New User'}
              </h2>
              {!user && (
                <p className="text-sm text-white mt-1">
                  Password creation link will be sent to the user's email
                </p>
              )}
            </div>
            <button onClick={onClose} className="p-2 text-white hover:text-gray-100 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {apiError && (
            <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-lg">
                {Object.entries(apiError).map(([key, value]) => (
                    <p key={key} className="text-sm"><strong>{key}:</strong> {Array.isArray(value) ? value.join(', ') : value}</p>
                ))}
            </div>
          )}

          {/* Username - with availability checker */}
          <UsernameInput
            value={formData.username}
            onChange={handleChange}
            firstName={formData.first_name}
            lastName={formData.last_name}
            email={formData.email}
            disabled={!!user} // Disable if editing
            required={true}
            onValidationChange={setUsernameValid}
          />

          {/* Email - with availability checker */}
          <EmailInput
            value={formData.email}
            onChange={handleChange}
            existingUserId={user?.id}
            onValidationChange={setEmailValid}
          />

          {/* First Name & Last Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
              <input
                type="text"
                name="first_name"
                value={formData.first_name}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="John"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
              <input
                type="text"
                name="last_name"
                value={formData.last_name}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Doe"
              />
            </div>
          </div>

          {/* Phone & Company */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
              <input
                type="tel"
                name="phone_number"
                value={formData.phone_number}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="+1234567890"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
              <input
                type="text"
                name="company_name"
                value={formData.company_name}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Company Inc."
              />
            </div>
          </div>

          {/* Role */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <select
              name="role"
              value={formData.role}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white cursor-pointer"
            >
              <option value="SUPERADMIN">Superadmin</option>
              <option value="STAFF_ADMIN">Staff Admin</option>
              <option value="DATA_COLLECTOR">Data Collector</option>
              <option value="CLIENT">Client</option>
              <option value="GUEST">Guest</option>
            </select>
          </div>

          {/* Active Status */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              name="is_active"
              id="is_active"
              checked={formData.is_active}
              onChange={handleChange}
              className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer"
            />
            <label htmlFor="is_active" className="text-sm font-medium text-gray-700 cursor-pointer">User is active</label>
          </div>

          {/* Password Info for New Users */}
          {!user && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex gap-3">
                <Mail className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-blue-900">Password Setup</p>
                  <p className="text-sm text-blue-700 mt-1">
                    A password creation link will be automatically sent to the user's email address.
                  </p>
                </div>
              </div>
            </div>
          )}
        </form>

        <div className="p-6 border-t bg-gray-50 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 border border-gray-300 bg-red-500 text-white rounded-lg hover:bg-red-600 font-medium text-sm transition-colors"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isLoading || !canSubmit}
            className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium text-sm disabled:opacity-50 flex items-center gap-2 transition-colors"
          >
            {isLoading ? (
              <>
              <LoadingSpinner />
              {user ? 'Updating...' : 'Creating...'}
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                {user ? 'Update User' : 'Create User & Send Email'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserManagementPage;