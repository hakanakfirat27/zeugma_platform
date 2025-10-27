// ExpandableRow.jsx - Complete expandable row component with inline editing

import React from 'react';
import {
  Phone, Building, ChevronDown, ChevronRight, Check, X,
  Eye, Edit, Trash2, User, Shield, CheckCircle, XCircle
} from 'lucide-react';

// Badge components (duplicated here for standalone use)
// Alternatively, you can export these from UserManagementPage.jsx and import them
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

const ExpandableRow = ({
  user,
  index,
  columns,
  isExpanded,
  onToggleExpand,
  onEdit,
  onView,
  onDelete,
  isInlineEdit,
  onInlineEdit,
  onInlineEditSave,
  onInlineEditCancel,
  editedData,
  onEditedDataChange
}) => {
  const bgClass = index % 2 === 0 ? 'bg-white' : 'bg-gray-50';

  // Render cell content based on column type and edit mode
  const renderCell = (column) => {
    // INLINE EDITING MODE
    if (isInlineEdit) {
      switch (column.id) {
        case 'user':
          return (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center font-bold text-indigo-600">
                {user.initials}
              </div>
              <div className="space-y-1">
                <input
                  type="text"
                  value={editedData.first_name}
                  onChange={(e) => onEditedDataChange('first_name', e.target.value)}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="First Name"
                />
                <input
                  type="text"
                  value={editedData.last_name}
                  onChange={(e) => onEditedDataChange('last_name', e.target.value)}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Last Name"
                />
              </div>
            </div>
          );

        case 'username':
          return (
            <input
              type="text"
              value={editedData.username}
              disabled
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded bg-gray-100 cursor-not-allowed font-mono"
              title="Username cannot be changed"
            />
          );

        case 'email':
          return (
            <input
              type="email"
              value={editedData.email}
              onChange={(e) => onEditedDataChange('email', e.target.value)}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          );

        case 'phone':
          return (
            <input
              type="tel"
              value={editedData.phone_number}
              onChange={(e) => onEditedDataChange('phone_number', e.target.value)}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="+1234567890"
            />
          );

        case 'company':
          return (
            <input
              type="text"
              value={editedData.company_name}
              onChange={(e) => onEditedDataChange('company_name', e.target.value)}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Company name"
            />
          );

        case 'role':
          return (
            <select
              value={editedData.role}
              onChange={(e) => onEditedDataChange('role', e.target.value)}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
            >
              <option value="SUPERADMIN">Superadmin</option>
              <option value="STAFF_ADMIN">Staff Admin</option>
              <option value="CLIENT">Client</option>
              <option value="GUEST">Guest</option>
            </select>
          );

        case 'status':
          return (
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={editedData.is_active}
                onChange={(e) => onEditedDataChange('is_active', e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
              />
              <span className="text-sm text-gray-700">Active</span>
            </label>
          );

        case 'online':
        case 'dateJoined':
        default:
          return <span className="text-sm text-gray-400 italic">Non-editable</span>;
      }
    }

    // NORMAL VIEW MODE
    switch (column.id) {
      case 'user':
        return (
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
        );

      case 'username':
        return <span className="text-sm text-gray-700 font-mono">{user.username}</span>;

      case 'email':
        return <span className="text-sm text-gray-700">{user.email}</span>;

      case 'phone':
        return user.phone_number ? (
          <div className="flex items-center gap-1.5 text-sm text-gray-700">
            <Phone className="w-4 h-4 text-gray-400" />
            {user.phone_number}
          </div>
        ) : (
          <span className="text-sm text-gray-400 italic">No phone</span>
        );

      case 'company':
        return user.company_name ? (
          <div className="flex items-center gap-1.5 text-sm text-gray-700">
            <Building className="w-4 h-4 text-gray-400" />
            {user.company_name}
          </div>
        ) : (
          <span className="text-sm text-gray-400 italic">No company</span>
        );

      case 'role':
        return <RoleBadge role={user.role} />;

      case 'status':
        return <StatusBadge isActive={user.is_active} />;

      case 'online':
        return <OnlineStatusBadge isOnline={user.is_online} />;

      case 'dateJoined':
        return <span className="text-sm text-gray-700">{new Date(user.date_joined).toLocaleDateString()}</span>;

      default:
        return null;
    }
  };

  return (
    <>
      {/* Main Row */}
      <tr className={`hover:bg-indigo-50 transition-colors ${bgClass} ${isExpanded ? 'border-b-0' : ''} ${isInlineEdit ? 'bg-yellow-50' : ''}`}>
        {/* Expand/Collapse Button */}
        <td className="px-6 py-4 whitespace-nowrap w-12">
          <button
            onClick={() => onToggleExpand(user.id)}
            className="p-1 hover:bg-gray-200 rounded transition-colors"
            title={isExpanded ? 'Collapse row' : 'Expand row'}
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-gray-600" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-600" />
            )}
          </button>
        </td>

        {/* Dynamic Columns */}
        {columns.filter(col => col.visible).map((column) => (
          <td
            key={column.id}
            className="px-6 py-4 whitespace-nowrap"
            style={{ width: column.width, minWidth: column.width, maxWidth: column.width }}
          >
            {renderCell(column)}
          </td>
        ))}

        {/* Actions Column */}
        <td className="px-6 py-4 whitespace-nowrap text-right">
          {isInlineEdit ? (
            // Inline Edit Actions
            <div className="flex items-center justify-end gap-1">
              <button
                onClick={onInlineEditSave}
                className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-all"
                title="Save changes"
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                onClick={onInlineEditCancel}
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                title="Cancel"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            // Normal Actions
            <div className="flex items-center justify-end gap-1">
              <button
                onClick={() => onView(user)}
                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                title="View user details"
              >
                <Eye className="w-4 h-4" />
              </button>
              <button
                onClick={() => onInlineEdit(user)}
                className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                title="Quick edit (inline)"
              >
                <Edit className="w-4 h-4" />
              </button>
              <button
                onClick={() => onDelete(user)}
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                title="Delete user"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}
        </td>
      </tr>

      {/* Expanded Row Details */}
      {isExpanded && (
        <tr className={`${bgClass} border-t-0`}>
          <td colSpan={columns.filter(col => col.visible).length + 2} className="px-6 py-4">
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg p-6 space-y-4 border border-gray-200">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-gray-300 pb-3">
                <h4 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                  <User className="w-5 h-5 text-indigo-600" />
                  User Details
                </h4>
                <div className="flex items-center gap-2">
                  <OnlineStatusBadge isOnline={user.is_online} />
                  <StatusBadge isActive={user.is_active} />
                </div>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="bg-white rounded-lg p-3 border border-gray-200">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Full Name</p>
                  <p className="text-sm text-gray-900 font-medium">{user.full_name || 'Not provided'}</p>
                </div>

                <div className="bg-white rounded-lg p-3 border border-gray-200">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Username</p>
                  <p className="text-sm text-gray-900 font-mono">{user.username}</p>
                </div>

                <div className="bg-white rounded-lg p-3 border border-gray-200">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Email</p>
                  <p className="text-sm text-gray-900">{user.email}</p>
                </div>

                <div className="bg-white rounded-lg p-3 border border-gray-200">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Phone Number</p>
                  <p className="text-sm text-gray-900">{user.phone_number || 'Not provided'}</p>
                </div>

                <div className="bg-white rounded-lg p-3 border border-gray-200">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Company</p>
                  <p className="text-sm text-gray-900">{user.company_name || 'Not provided'}</p>
                </div>

                <div className="bg-white rounded-lg p-3 border border-gray-200">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Role</p>
                  <div className="mt-1">
                    <RoleBadge role={user.role} />
                  </div>
                </div>

                <div className="bg-white rounded-lg p-3 border border-gray-200">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Last Login</p>
                  <p className="text-sm text-gray-900">
                    {user.last_login ? new Date(user.last_login).toLocaleString() : 'Never'}
                  </p>
                </div>

                <div className="bg-white rounded-lg p-3 border border-gray-200">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Date Joined</p>
                  <p className="text-sm text-gray-900">
                    {new Date(user.date_joined).toLocaleDateString()}
                  </p>
                </div>

                <div className="bg-white rounded-lg p-3 border border-gray-200">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">User ID</p>
                  <p className="text-sm text-gray-900 font-mono">#{user.id}</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-gray-300 flex flex-wrap gap-2">
                <button
                  onClick={() => onEdit(user)}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium transition-colors flex items-center gap-2 shadow-sm"
                >
                  <Edit className="w-4 h-4" />
                  Edit Full Profile
                </button>
                <button
                  onClick={() => onView(user)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium transition-colors flex items-center gap-2"
                >
                  <Eye className="w-4 h-4" />
                  View in Modal
                </button>
                <button
                  onClick={() => onInlineEdit(user)}
                  className="px-4 py-2 border border-indigo-300 text-indigo-700 bg-indigo-50 rounded-lg hover:bg-indigo-100 text-sm font-medium transition-colors flex items-center gap-2"
                >
                  <Edit className="w-4 h-4" />
                  Quick Edit
                </button>
                <button
                  onClick={() => onDelete(user)}
                  className="px-4 py-2 border border-red-300 text-red-700 bg-red-50 rounded-lg hover:bg-red-100 text-sm font-medium transition-colors flex items-center gap-2 ml-auto"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete User
                </button>
              </div>

              {/* Info Note */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs text-blue-900">
                  <strong>💡 Tip:</strong> Use "Quick Edit" for fast inline editing, or "Edit Full Profile" for the complete form with all fields.
                </p>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
};

export default ExpandableRow;