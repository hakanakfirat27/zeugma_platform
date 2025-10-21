// frontend/src/pages/UserManagementPage.jsx
// MODIFIED: Merged header by removing secondary header and adding props to DashboardLayout

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import UsernameInput from '../components/UsernameInput';
import EmailInput from '../components/EmailInput';

import {
  ArrowLeft, Users, Plus, Search, X, Edit, Trash2, Eye,
  ChevronDown, CheckCircle, XCircle, Download,
  AlertCircle, UserPlus, Save, Mail, User, Shield,
  Phone, Building, ChevronsUpDown
} from 'lucide-react';
import * as XLSX from 'xlsx';

import DashboardLayout from '../components/layout/DashboardLayout';
import LoadingSpinner from '../components/LoadingSpinner';
import Pagination from '../components/database/Pagination';
import { ToastContainer } from '../components/Toast';
import DeleteConfirmationModal from '../components/DeleteConfirmationModal';
import { useToast } from '../hooks/useToast';
import api from '../utils/api';

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

const ROLES = [
  { value: 'SUPERADMIN', label: 'Superadmin' },
  { value: 'STAFF_ADMIN', label: 'Staff Admin' },
  { value: 'CLIENT', label: 'Client' },
  { value: 'GUEST', label: 'Guest' },
];

const RoleBadge = ({ role }) => {
  const roleStyles = {
    SUPERADMIN: 'bg-red-100 text-red-800 border-red-200',
    STAFF_ADMIN: 'bg-purple-100 text-purple-800 border-purple-200',
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

// Sortable Table Header Component
const SortableHeader = ({ label, field, currentSort, onSort }) => {
  const isActive = currentSort.startsWith(field) || currentSort.startsWith(`-${field}`);
  const isDesc = currentSort === `-${field}`;

  return (
    <th
      className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors select-none group"
      onClick={() => onSort(field)}
    >
      <div className="flex items-center gap-2">
        <span>{label}</span>
        <div className="flex flex-col">
          <ChevronDown
            className={`w-3 h-3 -mb-1 transition-colors ${
              isActive && !isDesc ? 'text-indigo-600' : 'text-gray-400 group-hover:text-gray-500'
            }`}
            style={{ transform: 'rotate(180deg)' }}
          />
          <ChevronDown
            className={`w-3 h-3 transition-colors ${
              isActive && isDesc ? 'text-indigo-600' : 'text-gray-400 group-hover:text-gray-500'
            }`}
          />
        </div>
      </div>
    </th>
  );
};

// --- Main Page Component ---

const UserManagementPage = () => {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [ordering, setOrdering] = useState('-date_joined');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [viewingUser, setViewingUser] = useState(null);
  const [deletingUser, setDeletingUser] = useState(null);

  const { toasts, removeToast, success, error: showError } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['users', { page, pageSize, search, role: roleFilter, ordering }],
    queryFn: fetchUsers,
    keepPreviousData: true,
  });

  const users = data?.results || [];
  const totalCount = data?.count || 0;
  const totalPages = pageSize > 0 ? Math.ceil(totalCount / pageSize) : 0;

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

  // --- NEW: Define the header subtitle ---
  const pageSubtitle = (
    <p className="text-sm text-white-500">Add, edit, and manage all platform users.</p> // Color for white header
  );

  return (
    // --- MODIFIED: Pass pageTitle and pageSubtitleBottom ---
    <DashboardLayout
        pageTitle="User Management"
        pageSubtitleBottom={pageSubtitle}
    >
      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      {/* --- REMOVED: The secondary gradient header div --- */}

      {/* Main Content */}
      <div className="p-8">
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
                <button
                  onClick={handleExportToExcel}
                  className="flex-1 lg:flex-none px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center justify-center gap-2 shadow-md text-sm" // Added text-sm
                >
                  <Download className="w-5 h-5" />
                  Export to Excel
                </button>
                <button
                  onClick={() => handleOpenModal()}
                  className="flex-1 lg:flex-none px-5 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition flex items-center justify-center gap-2 shadow-md text-sm" // Added text-sm
                >
                  <UserPlus className="w-5 h-5" />
                  Add User
                </button>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <SortableHeader label="User" field="first_name" currentSort={ordering} onSort={handleSort} />
                  <SortableHeader label="Username" field="username" currentSort={ordering} onSort={handleSort} />
                  <SortableHeader label="Company" field="company_name" currentSort={ordering} onSort={handleSort} />
                  <SortableHeader label="Role" field="role" currentSort={ordering} onSort={handleSort} />
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Online Status
                  </th>
                  <SortableHeader label="Date Joined" field="date_joined" currentSort={ordering} onSort={handleSort} />
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {isLoading ? (
                  <tr>
                    <td colSpan="7" className="text-center py-12"><LoadingSpinner /></td>
                  </tr>
                ) : isError ? (
                  <tr>
                    <td colSpan="7" className="text-center py-12 text-red-600">{error.message}</td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center py-12 text-gray-500">No users found.</td>
                  </tr>
                ) : (
                  users.map((user, index) => (
                    <tr
                      key={user.id}
                      className={`hover:bg-indigo-50 transition-colors ${
                        index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                      }`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center font-bold text-indigo-600">
                            {user.initials}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{user.full_name}</p>
                            <p className="text-xs text-gray-500">{user.email}</p>
                            {user.phone_number && (
                              <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                                <Phone className="w-3 h-3" />
                                {user.phone_number}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 font-mono">{user.username}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {user.company_name ? (
                          <div className="flex items-center gap-1.5 text-sm text-gray-700">
                            <Building className="w-4 h-4 text-gray-400" />
                            {user.company_name}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400 italic">No company</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap"><RoleBadge role={user.role} /></td>
                      <td className="px-6 py-4 whitespace-nowrap"><OnlineStatusBadge isOnline={user.is_online} /></td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {new Date(user.date_joined).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleViewUser(user)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                            title="View user"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenModal(user)}
                            className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                            title="Edit user"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(user)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                            title="Delete user"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Component */}
          {!isLoading && !isError && totalCount > 0 && (
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              totalCount={totalCount}
              pageSize={pageSize}
              onPageChange={handlePageChange}
              onPageSizeChange={handlePageSizeChange}
              showFirstLast={true}
            />
          )}
        </div>
      </div>

      {/* Edit/Create Modal */}
      {isModalOpen && (
        <UserFormModal
          user={editingUser}
          onClose={() => {
            setIsModalOpen(false);
            setEditingUser(null);
          }}
          onSubmit={mutation.mutate}
          isLoading={mutation.isLoading}
          error={mutation.error}
        />
      )}

      {/* View Modal */}
      {isViewModalOpen && (
        <UserViewModal
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

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setDeletingUser(null);
        }}
        onConfirm={confirmDelete}
        title="Delete User"
        message="Are you sure you want to delete this user?"
        itemName={deletingUser ? `${deletingUser.full_name || deletingUser.username} (${deletingUser.email})` : ''}
        isDeleting={deleteMutation.isLoading}
      />
    </DashboardLayout>
  );
};

// --- User View Modal Component ---
const UserViewModal = ({ user, onClose, onEdit }) => {
  if (!user) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-indigo-600 to-purple-600">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center font-bold text-indigo-600 text-2xl">
                {user.initials}
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">{user.full_name}</h2>
                <p className="text-indigo-100 text-sm">@{user.username}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-white hover:bg-white/20 rounded-lg transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Status Badges */}
          <div className="flex gap-3">
            <RoleBadge role={user.role} />
            <StatusBadge isActive={user.is_active} />
            <OnlineStatusBadge isOnline={user.is_online} />
          </div>

          {/* Contact Information */}
          <div>
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3">
              Contact Information
            </h3>
            <div className="space-y-3 bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Email</p>
                  <p className="text-sm font-medium text-gray-900">{user.email}</p>
                </div>
              </div>
              {user.phone_number && (
                <div className="flex items-center gap-3">
                  <Phone className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">Phone</p>
                    <p className="text-sm font-medium text-gray-900">{user.phone_number}</p>
                  </div>
                </div>
              )}
              {user.company_name && (
                <div className="flex items-center gap-3">
                  <Building className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">Company</p>
                    <p className="text-sm font-medium text-gray-900">{user.company_name}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Account Details */}
          <div>
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3">
              Account Details
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs text-gray-500 mb-1">Date Joined</p>
                <p className="text-sm font-medium text-gray-900">
                  {new Date(user.date_joined).toLocaleDateString()}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs text-gray-500 mb-1">Last Login</p>
                <p className="text-sm font-medium text-gray-900">
                  {user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Never'}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs text-gray-500 mb-1">Username</p>
                <p className="text-sm font-medium text-gray-900 font-mono">{user.username}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs text-gray-500 mb-1">User ID</p>
                <p className="text-sm font-medium text-gray-900 font-mono">#{user.id}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-100 font-medium text-sm transition-colors"
          >
            Close
          </button>
          <button
            onClick={onEdit}
            className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium text-sm transition-colors flex items-center gap-2"
          >
            <Edit className="w-4 h-4" />
            Edit User
          </button>
        </div>
      </div>
    </div>
  );
};

// --- User Form Modal Component ---
const UserFormModal = ({ user, onClose, onSubmit, isLoading, error }) => {
  const [formData, setFormData] = useState({
    username: user?.username || '',
    email: user?.email || '',
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    phone_number: user?.phone_number || '',
    company_name: user?.company_name || '',
    role: user?.role || 'GUEST',
    is_active: user ? user.is_active : true,
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = { ...formData };
    if (user) {
      payload.id = user.id;
    }
    onSubmit(payload);
  };

  const apiError = error?.response?.data;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="p-6 border-b">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {user ? 'Edit User' : 'Add New User'}
              </h2>
              {!user && (
                <p className="text-sm text-gray-600 mt-1">
                  Password creation link will be sent to the user's email
                </p>
              )}
            </div>
            <button onClick={onClose} className="p-2 text-gray-500 hover:text-gray-800 transition-colors">
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
          />

          {/* Email - with availability checker */}
          <EmailInput
            value={formData.email}
            onChange={handleChange}
            existingUserId={user?.id}
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
            onClick={onClose}
            type="button"
            className="px-5 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-100 font-medium text-sm transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium text-sm disabled:opacity-50 flex items-center gap-2 transition-colors"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Saving...
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