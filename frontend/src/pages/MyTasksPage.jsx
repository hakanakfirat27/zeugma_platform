// frontend/src/pages/MyTasksPage.jsx

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import DataCollectorLayout from '../components/layout/DataCollectorLayout';
import {
  AlertCircle, Clock, CheckCircle, XCircle, RefreshCw,
  Calendar, User, FolderOpen, MessageSquare, ArrowRight
} from 'lucide-react';

const MyTasksPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Fetch user's tasks
  const { data: tasksData, isLoading, refetch } = useQuery({
    queryKey: ['my-tasks'],
    queryFn: async () => {
      const response = await api.get('/api/my-tasks/');
      return response.data;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const getStatusBadge = (status) => {
    const badges = {
      'PENDING': { color: 'bg-yellow-100 text-yellow-800', icon: <Clock className="w-3 h-3" />, text: 'Pending' },
      'UNDER_REVIEW': { color: 'bg-blue-100 text-blue-800', icon: <RefreshCw className="w-3 h-3" />, text: 'Under Review' },
      'NEEDS_REVISION': { color: 'bg-orange-100 text-orange-800', icon: <AlertCircle className="w-3 h-3" />, text: 'Needs Revision' },
      'APPROVED': { color: 'bg-green-100 text-green-800', icon: <CheckCircle className="w-3 h-3" />, text: 'Approved' },
      'REJECTED': { color: 'bg-red-100 text-red-800', icon: <XCircle className="w-3 h-3" />, text: 'Rejected' },
    };
    const badge = badges[status] || badges['PENDING'];
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        {badge.icon}
        {badge.text}
      </span>
    );
  };

  const isDataCollector = user?.role === 'DATA_COLLECTOR';

  if (isLoading) {
    return (
      <DataCollectorLayout pageTitle="My Tasks">
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </DataCollectorLayout>
    );
  }

  return (
    <DataCollectorLayout
      pageTitle="My Tasks"
      pageSubtitleBottom={
        isDataCollector
          ? "Sites that need your attention and revision"
          : "Sites pending your review from assigned projects"
      }
    >
      <div className="p-6 max-w-7xl mx-auto">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {isDataCollector ? (
            <>
              <StatCard
                title="Needs Revision"
                value={tasksData?.count || 0}
                icon={<AlertCircle className="w-6 h-6" />}
                color="orange"
                description="Sites sent back for fixes"
              />
              <StatCard
                title="Projects"
                value={tasksData?.needs_revision?.length ? new Set(tasksData.needs_revision.map(s => s.project_info?.project_id)).size : 0}
                icon={<FolderOpen className="w-6 h-6" />}
                color="blue"
                description="Active projects"
              />
              <StatCard
                title="Total Sites"
                value={tasksData?.needs_revision?.length || 0}
                icon={<Clock className="w-6 h-6" />}
                color="purple"
                description="Requiring action"
              />
            </>
          ) : (
            <>
              <StatCard
                title="Pending Review"
                value={tasksData?.count || 0}
                icon={<Clock className="w-6 h-6" />}
                color="yellow"
                description="Sites awaiting review"
              />
              <StatCard
                title="Assigned Projects"
                value={tasksData?.assigned_projects_count || 0}
                icon={<FolderOpen className="w-6 h-6" />}
                color="blue"
                description="Projects to review"
              />
              <StatCard
                title="Today's Priority"
                value={tasksData?.pending_review?.filter(s => s.priority === 'HIGH' || s.priority === 'URGENT').length || 0}
                icon={<AlertCircle className="w-6 h-6" />}
                color="red"
                description="High priority sites"
              />
            </>
          )}
        </div>

        {/* Tasks List */}
        <div className="bg-white rounded-lg shadow-sm">
          {/* Header */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">
                {isDataCollector ? 'Sites Needing Revision' : 'Sites Pending Review'}
              </h2>
              <button
                onClick={() => refetch()}
                className="flex items-center gap-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
            </div>
          </div>

          {/* Sites List */}
          <div className="divide-y divide-gray-200">
            {isDataCollector ? (
              // Data Collector View
              tasksData?.needs_revision?.length > 0 ? (
                tasksData.needs_revision.map((site) => (
                  <SiteCard
                    key={site.site_id}
                    site={site}
                    isDataCollector={true}
                    onNavigate={() => navigate(`/projects/${site.project_info?.project_id}`)}
                    getStatusBadge={getStatusBadge}
                  />
                ))
              ) : (
                <EmptyState
                  icon={<CheckCircle className="w-16 h-16 text-gray-300" />}
                  title="All Caught Up!"
                  description="You don't have any sites needing revision right now."
                />
              )
            ) : (
              // Reviewer View
              tasksData?.pending_review?.length > 0 ? (
                tasksData.pending_review.map((site) => (
                  <SiteCard
                    key={site.site_id}
                    site={site}
                    isDataCollector={false}
                    onNavigate={() => navigate(`/projects/${site.project_info?.project_id}`)}
                    getStatusBadge={getStatusBadge}
                  />
                ))
              ) : (
                <EmptyState
                  icon={<CheckCircle className="w-16 h-16 text-gray-300" />}
                  title="No Pending Reviews"
                  description="All sites have been reviewed. Great work!"
                />
              )
            )}
          </div>
        </div>
      </div>
    </DataCollectorLayout>
  );
};

// Stat Card Component
const StatCard = ({ title, value, icon, color, description }) => {
  const colors = {
    orange: 'bg-orange-50 text-orange-600',
    blue: 'bg-blue-50 text-blue-600',
    purple: 'bg-purple-50 text-purple-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    red: 'bg-red-50 text-red-600',
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-lg ${colors[color]}`}>
          {icon}
        </div>
        <div className="text-right">
          <p className="text-3xl font-bold text-gray-900">{value}</p>
        </div>
      </div>
      <h3 className="text-sm font-medium text-gray-600 mb-1">{title}</h3>
      <p className="text-xs text-gray-500">{description}</p>
    </div>
  );
};

// Site Card Component
const SiteCard = ({ site, isDataCollector, onNavigate, getStatusBadge }) => {
  return (
    <div className="p-6 hover:bg-gray-50 transition-colors cursor-pointer" onClick={onNavigate}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          {/* Company Name and Status */}
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-lg font-semibold text-gray-900">{site.company_name}</h3>
            {getStatusBadge(site.verification_status)}
          </div>

          {/* Location */}
          <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
            <span>{site.city ? `${site.city}, ` : ''}{site.country}</span>
            <span className="text-gray-400">•</span>
            <span>{site.category_display}</span>
          </div>

          {/* Project Info */}
          {site.project_info && (
            <div className="flex items-center gap-2 mb-3">
              <FolderOpen className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-600">{site.project_info.project_name}</span>
            </div>
          )}

          {/* Metadata */}
          <div className="flex items-center gap-6 text-sm text-gray-500">
            {isDataCollector ? (
              <>
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  <span>Reviewed by: {site.verified_by_name || 'Unassigned'}</span>
                </div>
                {site.verified_date && (
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>Sent back: {new Date(site.verified_date).toLocaleDateString()}</span>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  <span>Collected by: {site.collected_by_name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>Submitted: {new Date(site.created_at).toLocaleDateString()}</span>
                </div>
              </>
            )}
            
            {site.notes_count > 0 && (
              <div className="flex items-center gap-2 text-blue-600">
                <MessageSquare className="w-4 h-4" />
                <span>{site.notes_count} note{site.notes_count > 1 ? 's' : ''}</span>
              </div>
            )}
          </div>

          {/* Quality Score */}
          {site.data_quality_score && (
            <div className="mt-3">
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-600">Data Quality:</span>
                <div className="flex-1 max-w-xs">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${site.data_quality_score}%` }}
                    ></div>
                  </div>
                </div>
                <span className="text-xs font-medium text-gray-700">{site.data_quality_score}%</span>
              </div>
            </div>
          )}
        </div>

        {/* Action Arrow */}
        <div className="ml-4">
          <ArrowRight className="w-6 h-6 text-gray-400" />
        </div>
      </div>
    </div>
  );
};

// Empty State Component
const EmptyState = ({ icon, title, description }) => {
  return (
    <div className="text-center py-16 px-6">
      <div className="mb-4 flex justify-center">{icon}</div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  );
};

export default MyTasksPage;
