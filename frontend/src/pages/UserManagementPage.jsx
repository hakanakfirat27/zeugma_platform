import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users, Plus, Search, X, Edit, Trash2, MoreVertical,
  ChevronDown, CheckCircle, XCircle, Clock, Calendar,
  AlertCircle, UserPlus, Save, Mail, User, Shield
} from 'lucide-react';

import DashboardLayout from '../components/layout/DashboardLayout';
import LoadingSpinner from '../components/LoadingSpinner';
import api from '../utils/api';

// --- Helper Functions & Components ---

const fetchUsers = async ({ queryKey }) => {
  const [_key, { page, search, role }] = queryKey;
  const params = new URLSearchParams({ page });
  if (search) params.append('search', search);
  if (role) params.append('role', role);

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

// --- Main Page Component ---

const UserManagementPage = () => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  const queryClient = useQueryClient();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['users', { page, search, role: roleFilter }],
    queryFn: fetchUsers,
    keepPreviousData: true,
  });

  const users = data?.results || [];
  const pageCount = data ? Math.ceil(data.count / 10) : 0;

  const mutation = useMutation({
    mutationFn: (userData) => {
      const { id, ...payload } = userData;
      const url = id ? `/api/auth/users/${id}/` : '/api/auth/users/';
      const method = id ? 'patch' : 'post';
      return api[method](url, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['users']);
      setIsModalOpen(false);
      setEditingUser(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (userId) => api.delete(`/api/auth/users/${userId}/`),
    onSuccess: () => {
      queryClient.invalidateQueries(['users']);
    },
  });

  const handleOpenModal = (user = null) => {
    setEditingUser(user);
    setIsModalOpen(true);
  };

  const handleDelete = (user) => {
    if (window.confirm(`Are you sure you want to delete ${user.full_name || user.username}?`)) {
      deleteMutation.mutate(user.id);
    }
  };

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-8 py-6 shadow-lg">
        <h1 className="text-2xl font-bold flex items-center gap-3">
          <Users className="w-6 h-6" />
          User Management
        </h1>
        <p className="text-indigo-100 mt-1">Add, edit, and manage all platform users.</p>
      </div>

      {/* Main Content */}
      <div className="p-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          {/* Toolbar */}
          <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="w-full sm:w-auto flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 transition"
                />
              </div>
              <select
                value={roleFilter}
                onChange={(e) => {
                  setRoleFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 transition bg-white"
              >
                <option value="">All Roles</option>
                {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <button
              onClick={() => handleOpenModal()}
              className="w-full sm:w-auto px-5 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition flex items-center justify-center gap-2 shadow-md"
            >
              <UserPlus className="w-5 h-5" />
              Add User
            </button>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">User</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Username</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Role</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Last Login</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Date Joined</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
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
                  users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center font-bold text-indigo-600">
                            {user.initials}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{user.full_name}</p>
                            <p className="text-xs text-gray-500">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 font-mono">{user.username}</td>
                      <td className="px-6 py-4 whitespace-nowrap"><RoleBadge role={user.role} /></td>
                      <td className="px-6 py-4 whitespace-nowrap"><StatusBadge isActive={user.is_active} /></td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {user.last_login ? new Date(user.last_login).toLocaleString() : 'Never'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {new Date(user.date_joined).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <button onClick={() => handleOpenModal(user)} className="p-2 text-gray-500 hover:text-indigo-600"><Edit className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete(user)} className="p-2 text-gray-500 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="p-4 border-t border-gray-200 flex items-center justify-between">
            <span className="text-sm text-gray-600">
              Page {page} of {pageCount || 1}
            </span>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-4 py-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50">
                Previous
              </button>
              <button onClick={() => setPage(p => Math.min(pageCount, p + 1))} disabled={page === pageCount || pageCount === 0} className="px-4 py-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50">
                Next
              </button>
            </div>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <UserFormModal
          user={editingUser}
          onClose={() => setIsModalOpen(false)}
          onSubmit={mutation.mutate}
          isLoading={mutation.isLoading}
          error={mutation.error}
        />
      )}
    </DashboardLayout>
  );
};

// --- User Form Modal Component ---

const UserFormModal = ({ user, onClose, onSubmit, isLoading, error }) => {
  const [formData, setFormData] = useState({
    username: user?.username || '',
    email: user?.email || '',
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    role: user?.role || 'GUEST',
    is_active: user ? user.is_active : true,
    password: '',
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
      // Don't send empty password on update
      if (!payload.password) {
        delete payload.password;
      }
    }
    onSubmit(payload);
  };

  const apiError = error?.response?.data;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="p-6 border-b">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-900">{user ? 'Edit User' : 'Add New User'}</h2>
            <button onClick={onClose} className="p-2 text-gray-500 hover:text-gray-800"><X /></button>
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Username *</label>
              <input type="text" name="username" value={formData.username} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
              <input type="email" name="email" value={formData.email} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" required />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
              <input type="text" name="first_name" value={formData.first_name} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
              <input type="text" name="last_name" value={formData.last_name} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <select name="role" value={formData.role} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white">
              {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input type="password" name="password" value={formData.password} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" placeholder={user ? 'Leave blank to keep current' : 'Required for new user'} required={!user} />
          </div>
          <div className="flex items-center gap-3">
            <input type="checkbox" name="is_active" id="is_active" checked={formData.is_active} onChange={handleChange} className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500" />
            <label htmlFor="is_active" className="text-sm font-medium text-gray-700">User is active</label>
          </div>
        </form>

        <div className="p-6 border-t bg-gray-50 flex justify-end gap-3">
          <button onClick={onClose} type="button" className="px-5 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-100 font-medium text-sm">Cancel</button>
          <button onClick={handleSubmit} disabled={isLoading} className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium text-sm disabled:opacity-50 flex items-center gap-2">
            {isLoading ? <><LoadingSpinner size="sm" /> Saving...</> : <><Save className="w-4 h-4" /> Save User</>}
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserManagementPage;

