// frontend/src/pages/FeedbackPage.jsx
// Combined admin page for viewing Help Center and Report feedback from clients

import { useState, useEffect } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { getBreadcrumbs } from '../utils/breadcrumbConfig';
import DashboardLayout from '../components/layout/DashboardLayout';
import LoadingSpinner from '../components/LoadingSpinner';
import Pagination from '../components/database/Pagination';
import api from '../utils/api';
import {
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  Search,
  Calendar,
  FileText,
  ChevronDown,
  RefreshCw,
  BookOpen,
  AlertCircle,
  X,
  Star,
  BarChart3,
  TrendingUp,
  Users,
  Filter,
  HelpCircle
} from 'lucide-react';

// ==================== SHARED COMPONENTS ====================

// Stats Card Component
const StatCard = ({ icon: Icon, label, value, color, subValue }) => (
  <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
    <div className="flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-2xl font-bold text-gray-800">{value}</p>
        {subValue && <p className="text-xs text-gray-400">{subValue}</p>}
      </div>
    </div>
  </div>
);

// ==================== HELP CENTER FEEDBACK COMPONENTS ====================

// Article ID to readable name mapping
const ARTICLE_NAMES = {
  'welcome': 'Welcome to A Data',
  'dashboard-overview': 'Understanding Your Dashboard',
  'navigation': 'Navigating the Platform',
  'viewing-reports': 'How to View Your Reports',
  'filtering-data': 'Filtering and Searching Data',
  'exporting-data': 'Exporting Data',
  'visualization-overview': 'Visualization Tools Overview',
  'maps': 'Using the Map Feature',
  'focus-view-intro': 'Introduction to Focus View',
  'focus-view-export': 'Exporting from Focus View',
  'profile-settings': 'Managing Your Profile',
  'notifications': 'Notification Settings',
};

const getArticleName = (articleId) => {
  return ARTICLE_NAMES[articleId] || articleId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

// Feedback Badge Component
const FeedbackBadge = ({ isHelpful }) => (
  <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
    isHelpful 
      ? 'bg-green-100 text-green-700 border border-green-200' 
      : 'bg-red-100 text-red-700 border border-red-200'
  }`}>
    {isHelpful ? <ThumbsUp className="w-3.5 h-3.5" /> : <ThumbsDown className="w-3.5 h-3.5" />}
    {isHelpful ? 'Helpful' : 'Not Helpful'}
  </span>
);

// Help Feedback Detail Modal
const HelpFeedbackDetailModal = ({ feedback, onClose }) => {
  if (!feedback) return null;

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day}.${month}.${year} ${hours}:${minutes}`;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
        <div className={`px-6 py-4 ${feedback.is_helpful ? 'bg-green-50' : 'bg-red-50'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {feedback.is_helpful ? (
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <ThumbsUp className="w-5 h-5 text-green-600" />
                </div>
              ) : (
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <ThumbsDown className="w-5 h-5 text-red-600" />
                </div>
              )}
              <div>
                <h3 className="font-semibold text-gray-800">Feedback Details</h3>
                <FeedbackBadge isHelpful={feedback.is_helpful} />
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-lg transition-colors">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-5">
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">User</label>
            <div className="flex items-center gap-3 mt-2">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-medium">
                {feedback.user?.full_name?.charAt(0)?.toUpperCase() || '?'}
              </div>
              <div>
                <p className="font-medium text-gray-800">{feedback.user?.full_name || 'Unknown'}</p>
                <p className="text-sm text-gray-500">{feedback.user?.email || ''}</p>
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Article</label>
            <p className="mt-1 text-gray-800 font-medium">{getArticleName(feedback.article_id)}</p>
            <p className="text-sm text-gray-400">ID: {feedback.article_id}</p>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Comment</label>
            {feedback.comment ? (
              <div className="mt-2 p-4 bg-gray-50 rounded-xl border border-gray-200">
                <p className="text-gray-700">{feedback.comment}</p>
              </div>
            ) : (
              <p className="mt-1 text-gray-400 italic">No comment provided</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Submitted</label>
              <p className="mt-1 text-gray-800">{formatDate(feedback.created_at)}</p>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
          <button onClick={onClose} className="w-full px-4 py-2.5 bg-gray-800 text-white rounded-xl font-medium hover:bg-gray-900 transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// ==================== REPORT FEEDBACK COMPONENTS ====================

// Star Rating Display Component
const StarDisplay = ({ rating, size = 'sm' }) => {
  const sizeClasses = { sm: 'w-4 h-4', md: 'w-5 h-5', lg: 'w-6 h-6' };
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`${sizeClasses[size]} ${star <= rating ? 'fill-yellow-400 text-yellow-400' : 'fill-gray-200 text-gray-200'}`}
        />
      ))}
    </div>
  );
};

// Rating Badge Component
const RatingBadge = ({ rating }) => {
  const colors = {
    1: 'bg-red-100 text-red-700 border-red-200',
    2: 'bg-orange-100 text-orange-700 border-orange-200',
    3: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    4: 'bg-green-100 text-green-700 border-green-200',
    5: 'bg-emerald-100 text-emerald-700 border-emerald-200'
  };
  const labels = { 1: 'Poor', 2: 'Fair', 3: 'Good', 4: 'Very Good', 5: 'Excellent' };

  return (
    <div className="flex items-center gap-2">
      <StarDisplay rating={rating} size="sm" />
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${colors[rating]}`}>
        {labels[rating]}
      </span>
    </div>
  );
};

// Rating Distribution Bar
const RatingDistribution = ({ distribution }) => {
  const maxCount = Math.max(...distribution.map(d => d.count), 1);
  return (
    <div className="space-y-2">
      {distribution.slice().reverse().map((item) => (
        <div key={item.rating} className="flex items-center gap-3">
          <span className="text-sm text-gray-600 w-8">{item.rating}★</span>
          <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-yellow-400 rounded-full transition-all duration-500" style={{ width: `${(item.count / maxCount) * 100}%` }} />
          </div>
          <span className="text-sm text-gray-500 w-16 text-right">{item.count} ({item.percentage}%)</span>
        </div>
      ))}
    </div>
  );
};

// Report Feedback Detail Modal
const ReportFeedbackDetailModal = ({ feedback, onClose }) => {
  if (!feedback) return null;

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day}.${month}.${year} ${hours}:${minutes}`;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
        <div className="px-6 py-4 bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-indigo-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                <Star className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-800">Feedback Details</h3>
                <RatingBadge rating={feedback.rating} />
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-lg transition-colors">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-5">
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">User</label>
            <div className="flex items-center gap-3 mt-2">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-medium">
                {feedback.user?.full_name?.charAt(0)?.toUpperCase() || '?'}
              </div>
              <div>
                <p className="font-medium text-gray-800">{feedback.user?.full_name || 'Unknown'}</p>
                <p className="text-sm text-gray-500">{feedback.user?.email || ''}</p>
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Report</label>
            <p className="mt-1 text-gray-800 font-medium">{feedback.report?.title || 'Unknown Report'}</p>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Overall Rating</label>
            <div className="mt-2"><StarDisplay rating={feedback.rating} size="lg" /></div>
          </div>

          {(feedback.data_quality_rating || feedback.data_completeness_rating || feedback.ease_of_use_rating) && (
            <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-xl">
              {feedback.data_quality_rating && (
                <div>
                  <label className="text-xs text-gray-500">Data Quality</label>
                  <div className="mt-1"><StarDisplay rating={feedback.data_quality_rating} size="sm" /></div>
                </div>
              )}
              {feedback.data_completeness_rating && (
                <div>
                  <label className="text-xs text-gray-500">Completeness</label>
                  <div className="mt-1"><StarDisplay rating={feedback.data_completeness_rating} size="sm" /></div>
                </div>
              )}
              {feedback.ease_of_use_rating && (
                <div>
                  <label className="text-xs text-gray-500">Ease of Use</label>
                  <div className="mt-1"><StarDisplay rating={feedback.ease_of_use_rating} size="sm" /></div>
                </div>
              )}
            </div>
          )}

          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Comment</label>
            {feedback.comment ? (
              <div className="mt-2 p-4 bg-gray-50 rounded-xl border border-gray-200">
                <p className="text-gray-700">{feedback.comment}</p>
              </div>
            ) : (
              <p className="mt-1 text-gray-400 italic">No comment provided</p>
            )}
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Submitted</label>
            <p className="mt-1 text-gray-800">{formatDate(feedback.created_at)}</p>
          </div>
        </div>

        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
          <button onClick={onClose} className="w-full px-4 py-2.5 bg-gray-800 text-white rounded-xl font-medium hover:bg-gray-900 transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// ==================== ARTICLE DETAIL MODAL ====================

// Modal showing all feedback for a specific article
const ArticleDetailModal = ({ article, allFeedback, onClose }) => {
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  
  if (!article) return null;

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}.${date.getFullYear()}`;
  };

  // Filter feedback for this specific article
  const articleFeedback = allFeedback?.filter(fb => fb.article_id === article.article_id) || [];
  
  // Calculate stats
  const helpfulCount = articleFeedback.filter(fb => fb.is_helpful).length;
  const notHelpfulCount = articleFeedback.filter(fb => !fb.is_helpful).length;
  const helpfulPercentage = articleFeedback.length > 0 ? Math.round((helpfulCount / articleFeedback.length) * 100) : 0;
  const notHelpfulPercentage = articleFeedback.length > 0 ? Math.round((notHelpfulCount / articleFeedback.length) * 100) : 0;
  const commentsCount = articleFeedback.filter(fb => fb.comment).length;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-cyan-50 to-blue-50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-cyan-100 rounded-xl flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-cyan-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">{getArticleName(article.article_id)}</h3>
                <p className="text-sm text-gray-500">Article Feedback Details</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-lg transition-colors">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Content - Two Column Layout */}
          <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12">
            {/* Left Side - Summary */}
            <div className="lg:col-span-5 bg-gradient-to-br from-slate-50 to-gray-100 p-6 border-r border-gray-100 overflow-y-auto">
              {/* Big Stats Display */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-white rounded-xl p-4 border border-gray-200 text-center">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <ThumbsUp className="w-5 h-5 text-green-500" />
                    <span className="text-3xl font-bold text-gray-900">{helpfulPercentage}%</span>
                  </div>
                  <p className="text-sm text-gray-500">Helpful</p>
                  <p className="text-xs text-gray-400 mt-1">{helpfulCount} votes</p>
                </div>
                <div className="bg-white rounded-xl p-4 border border-gray-200 text-center">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <ThumbsDown className="w-5 h-5 text-red-500" />
                    <span className="text-3xl font-bold text-gray-900">{notHelpfulPercentage}%</span>
                  </div>
                  <p className="text-sm text-gray-500">Not Helpful</p>
                  <p className="text-xs text-gray-400 mt-1">{notHelpfulCount} votes</p>
                </div>
              </div>

              {/* Satisfaction Bar */}
              <div className="mb-6">
                <p className="text-sm font-medium text-gray-700 mb-2">User Satisfaction</p>
                <div className="h-4 bg-gray-200 rounded-full overflow-hidden flex">
                  <div 
                    className="h-full bg-gradient-to-r from-green-400 to-green-500 transition-all duration-500"
                    style={{ width: `${helpfulPercentage}%` }}
                  />
                  <div 
                    className="h-full bg-gradient-to-r from-red-400 to-red-500 transition-all duration-500"
                    style={{ width: `${notHelpfulPercentage}%` }}
                  />
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-xs text-green-600">{helpfulPercentage}% Helpful</span>
                  <span className="text-xs text-red-600">{notHelpfulPercentage}% Not Helpful</span>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="pt-6 border-t border-gray-200">
                <p className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">Quick Stats</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white rounded-xl p-3 border border-gray-200">
                    <p className="text-2xl font-bold text-gray-900">{articleFeedback.length}</p>
                    <p className="text-xs text-gray-500">Total Feedback</p>
                  </div>
                  <div className="bg-white rounded-xl p-3 border border-gray-200">
                    <p className="text-2xl font-bold text-gray-900">{commentsCount}</p>
                    <p className="text-xs text-gray-500">With Comments</p>
                  </div>
                </div>
              </div>

              {/* Article Info */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <p className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">Article Info</p>
                <div className="bg-white rounded-xl p-4 border border-gray-200">
                  <p className="font-medium text-gray-900">{getArticleName(article.article_id)}</p>
                  <p className="text-xs text-gray-400 mt-1">ID: {article.article_id}</p>
                </div>
              </div>
            </div>

            {/* Right Side - Feedback List */}
            <div className="lg:col-span-7 flex flex-col max-h-[70vh]">
              {/* Header */}
              <div className="px-6 py-3 border-b border-gray-100 flex items-center justify-between bg-white">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-900">Feedback</span>
                  <span className="px-2 py-0.5 bg-gray-100 rounded-full text-sm text-gray-600">
                    {articleFeedback.length}
                  </span>
                </div>
              </div>

              {/* Feedback List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/50">
                {articleFeedback.map((fb) => (
                  <div 
                    key={fb.feedback_id} 
                    className={`bg-white rounded-xl p-4 border shadow-sm hover:shadow-md transition-shadow cursor-pointer ${
                      fb.is_helpful ? 'border-green-100' : 'border-red-100'
                    }`}
                    onClick={() => setSelectedFeedback(fb)}
                  >
                    {/* User Info Row */}
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                          {fb.user?.full_name?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 text-sm">{fb.user?.full_name || 'Anonymous'}</p>
                          <FeedbackBadge isHelpful={fb.is_helpful} />
                        </div>
                      </div>
                      <span className="text-xs text-gray-400">{formatDate(fb.created_at)}</span>
                    </div>

                    {/* Comment */}
                    {fb.comment ? (
                      <p className="text-gray-600 text-sm leading-relaxed mt-2">
                        {fb.comment.length > 150 ? fb.comment.substring(0, 150) + '...' : fb.comment}
                      </p>
                    ) : (
                      <p className="text-gray-400 text-sm italic mt-2">No comment provided</p>
                    )}
                  </div>
                ))}

                {/* Empty State */}
                {articleFeedback.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                      <MessageSquare className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className="text-gray-500">No feedback found for this article</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
            <button onClick={onClose} className="w-full px-4 py-2.5 bg-gray-800 text-white rounded-xl font-medium hover:bg-gray-900 transition-colors">
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Individual Feedback Detail Modal */}
      {selectedFeedback && <HelpFeedbackDetailModal feedback={selectedFeedback} onClose={() => setSelectedFeedback(null)} />}
    </>
  );
};

// ==================== HELP CENTER TAB CONTENT ====================

const HelpCenterFeedbackTab = () => {
  const [loading, setLoading] = useState(true);
  const [feedbackData, setFeedbackData] = useState(null);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const fetchFeedback = async () => {
    setLoading(true);
    setError(null);
    try {
      const url = `/api/help-center-feedback/`;
      const response = await api.get(url);
      setFeedbackData(response.data);
    } catch (err) {
      console.error('Failed to fetch feedback:', err);
      setError(err.response?.data?.error || err.response?.data?.detail || err.message || 'Failed to load feedback');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedback();
  }, []);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}.${date.getFullYear()}`;
  };

  // Filter articles by search query
  const filteredArticles = feedbackData?.by_article?.filter(article => {
    const articleName = getArticleName(article.article_id).toLowerCase();
    return !searchQuery || articleName.includes(searchQuery.toLowerCase());
  }) || [];

  // Get last feedback date for each article
  const getLastFeedbackDate = (articleId) => {
    const articleFeedback = feedbackData?.feedback?.filter(fb => fb.article_id === articleId) || [];
    if (articleFeedback.length === 0) return null;
    const sorted = articleFeedback.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    return sorted[0]?.created_at;
  };

  // Get comment count for each article
  const getCommentCount = (articleId) => {
    const articleFeedback = feedbackData?.feedback?.filter(fb => fb.article_id === articleId) || [];
    return articleFeedback.filter(fb => fb.comment).length;
  };

  // Get helpful/not helpful counts
  const getHelpfulStats = (articleId) => {
    const articleFeedback = feedbackData?.feedback?.filter(fb => fb.article_id === articleId) || [];
    const helpful = articleFeedback.filter(fb => fb.is_helpful).length;
    const notHelpful = articleFeedback.filter(fb => !fb.is_helpful).length;
    const total = articleFeedback.length;
    return {
      helpful,
      notHelpful,
      total,
      helpfulPct: total > 0 ? Math.round((helpful / total) * 100) : 0,
      notHelpfulPct: total > 0 ? Math.round((notHelpful / total) * 100) : 0
    };
  };

  // Pagination
  const totalItems = filteredArticles.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedArticles = filteredArticles.slice(startIndex, startIndex + pageSize);
  const notHelpfulPercentage = feedbackData?.summary?.total > 0 ? Math.round((feedbackData?.summary?.not_helpful / feedbackData?.summary?.total) * 100) : 0;

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
        <div>
          <h3 className="font-medium text-red-800">Error Loading Feedback</h3>
          <p className="text-red-600 text-sm mt-1">{error}</p>
          <button onClick={fetchFeedback} className="mt-2 text-sm text-red-700 underline hover:no-underline">Try again</button>
        </div>
      </div>
    );
  }

  if (loading && !feedbackData) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      {/* Refresh Button */}
      <div className="flex justify-end">
        <button onClick={fetchFeedback} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard icon={MessageSquare} label="Total Feedback" value={feedbackData?.summary?.total || 0} color="bg-blue-100 text-blue-600" />
        <StatCard icon={ThumbsUp} label="Helpful" value={feedbackData?.summary?.helpful || 0} color="bg-green-100 text-green-600" subValue={`${feedbackData?.summary?.helpful_percentage || 0}% of total`} />
        <StatCard icon={ThumbsDown} label="Not Helpful" value={feedbackData?.summary?.not_helpful || 0} color="bg-red-100 text-red-600" subValue={`${notHelpfulPercentage}% of total`} />
        <StatCard icon={BookOpen} label="Articles Reviewed" value={feedbackData?.by_article?.length || 0} color="bg-purple-100 text-purple-600" />
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search articles by name..." 
              value={searchQuery} 
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }} 
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" 
            />
          </div>
          {searchQuery && (
            <button 
              onClick={() => { setSearchQuery(''); setCurrentPage(1); }} 
              className="px-4 py-2.5 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-2"
            >
              <Filter className="w-4 h-4" />Clear
            </button>
          )}
        </div>
      </div>

      {/* Articles Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-cyan-600" />
            Articles Feedback Summary
            <span className="text-sm font-normal text-gray-500">({totalItems} articles)</span>
          </h2>
        </div>

        {paginatedArticles.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <BookOpen className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-800 mb-2">No Articles Found</h3>
            <p className="text-gray-500">{searchQuery ? 'No articles match your search.' : 'No articles have been rated yet.'}</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Article Name</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Helpful</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Not Helpful</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Total</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Comments</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Last Feedback</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {paginatedArticles.map((article) => {
                    const lastDate = getLastFeedbackDate(article.article_id);
                    const commentCount = getCommentCount(article.article_id);
                    const stats = getHelpfulStats(article.article_id);
                    
                    return (
                      <tr 
                        key={article.article_id} 
                        onClick={() => setSelectedArticle(article)} 
                        className="hover:bg-cyan-50 transition-colors cursor-pointer group"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-cyan-100 to-blue-100 rounded-xl flex items-center justify-center group-hover:from-cyan-200 group-hover:to-blue-200 transition-colors">
                              <BookOpen className="w-5 h-5 text-cyan-600" />
                            </div>
                            <p className="font-medium text-gray-900 group-hover:text-cyan-600 transition-colors">{getArticleName(article.article_id)}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-700 rounded-full text-sm font-medium">
                            <ThumbsUp className="w-3.5 h-3.5" />
                            {stats.helpfulPct}%
                            <span className="text-green-500 text-xs">({stats.helpful})</span>
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-50 text-red-700 rounded-full text-sm font-medium">
                            <ThumbsDown className="w-3.5 h-3.5" />
                            {stats.notHelpfulPct}%
                            <span className="text-red-500 text-xs">({stats.notHelpful})</span>
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">
                            <MessageSquare className="w-3.5 h-3.5" />
                            {stats.total}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-gray-600">{commentCount}</span>
                        </td>
                        <td className="px-6 py-4">
                          {lastDate ? (
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                              <Calendar className="w-4 h-4" />
                              {formatDate(lastDate)}
                            </div>
                          ) : (
                            <span className="text-gray-400 text-sm">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {totalItems > 0 && (
              <Pagination 
                currentPage={currentPage} 
                totalPages={totalPages} 
                totalCount={totalItems} 
                pageSize={pageSize} 
                onPageChange={setCurrentPage} 
                onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1); }} 
                showFirstLast={true} 
              />
            )}
          </>
        )}
      </div>

      {/* Article Detail Modal */}
      {selectedArticle && (
        <ArticleDetailModal 
          article={selectedArticle} 
          allFeedback={feedbackData?.feedback} 
          onClose={() => setSelectedArticle(null)} 
        />
      )}
    </div>
  );
};

// ==================== REPORT DETAIL MODAL ====================

// Modal showing all feedback for a specific report
const ReportDetailModal = ({ report, allFeedback, onClose }) => {
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  
  if (!report) return null;

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}.${date.getFullYear()}`;
  };

  // Filter feedback for this specific report
  const reportFeedback = allFeedback?.filter(fb => fb.report?.report_id === report.report__report_id) || [];
  
  // Calculate detailed stats from feedback
  const avgDataQuality = reportFeedback.length > 0 
    ? reportFeedback.reduce((sum, fb) => sum + (fb.data_quality_rating || 0), 0) / reportFeedback.filter(fb => fb.data_quality_rating).length || 0
    : 0;
  const avgDataCompleteness = reportFeedback.length > 0 
    ? reportFeedback.reduce((sum, fb) => sum + (fb.data_completeness_rating || 0), 0) / reportFeedback.filter(fb => fb.data_completeness_rating).length || 0
    : 0;
  const avgEaseOfUse = reportFeedback.length > 0 
    ? reportFeedback.reduce((sum, fb) => sum + (fb.ease_of_use_rating || 0), 0) / reportFeedback.filter(fb => fb.ease_of_use_rating).length || 0
    : 0;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-purple-50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                <FileText className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">{report.report__title}</h3>
                <p className="text-sm text-gray-500">Report Feedback Details</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-lg transition-colors">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Content - Two Column Layout */}
          <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12">
            {/* Left Side - Summary */}
            <div className="lg:col-span-5 bg-gradient-to-br from-slate-50 to-gray-100 p-6 border-r border-gray-100 overflow-y-auto">
              {/* Big Rating Display */}
              <div className="flex items-baseline gap-3 mb-2">
                <span className="text-5xl font-bold text-gray-900">
                  {report.avg_rating?.toFixed(1) || '0.0'}
                </span>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-5 h-5 ${
                        star <= Math.round(report.avg_rating || 0)
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'fill-gray-200 text-gray-200'
                      }`}
                    />
                  ))}
                </div>
              </div>
              <p className="text-gray-500 mb-6">
                Based on {report.total || 0} ratings
              </p>

              {/* Rating Categories */}
              <div className="space-y-4">
                {/* Data Quality */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-gray-700 font-medium text-sm">Data Quality</span>
                    <span className="text-gray-900 font-bold text-sm">{avgDataQuality?.toFixed(1) || '0.0'}</span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full transition-all duration-500"
                      style={{ width: `${((avgDataQuality || 0) / 5) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Completeness */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-gray-700 font-medium text-sm">Data Completeness</span>
                    <span className="text-gray-900 font-bold text-sm">{avgDataCompleteness?.toFixed(1) || '0.0'}</span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-cyan-400 to-cyan-500 rounded-full transition-all duration-500"
                      style={{ width: `${((avgDataCompleteness || 0) / 5) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Ease of Use */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-gray-700 font-medium text-sm">Ease of Use</span>
                    <span className="text-gray-900 font-bold text-sm">{avgEaseOfUse?.toFixed(1) || '0.0'}</span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full transition-all duration-500"
                      style={{ width: `${((avgEaseOfUse || 0) / 5) * 100}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <p className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">Quick Stats</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white rounded-xl p-3 border border-gray-200">
                    <p className="text-2xl font-bold text-gray-900">{report.total || 0}</p>
                    <p className="text-xs text-gray-500">Total Reviews</p>
                  </div>
                  <div className="bg-white rounded-xl p-3 border border-gray-200">
                    <p className="text-2xl font-bold text-gray-900">{reportFeedback.filter(fb => fb.comment).length}</p>
                    <p className="text-xs text-gray-500">With Comments</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Side - Reviews List */}
            <div className="lg:col-span-7 flex flex-col max-h-[70vh]">
              {/* Header */}
              <div className="px-6 py-3 border-b border-gray-100 flex items-center justify-between bg-white">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-900">Reviews</span>
                  <span className="px-2 py-0.5 bg-gray-100 rounded-full text-sm text-gray-600">
                    {reportFeedback.length}
                  </span>
                </div>
              </div>

              {/* Reviews List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/50">
                {reportFeedback.map((fb) => (
                  <div 
                    key={fb.feedback_id} 
                    className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => setSelectedFeedback(fb)}
                  >
                    {/* User Info Row */}
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                          {fb.user?.full_name?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 text-sm">{fb.user?.full_name || 'Anonymous'}</p>
                          <div className="flex items-center gap-1 mt-0.5">
                            {[1,2,3,4,5].map((star) => (
                              <Star key={star} className={`w-3 h-3 ${star <= fb.rating ? 'fill-yellow-400 text-yellow-400' : 'fill-gray-200 text-gray-200'}`} />
                            ))}
                          </div>
                        </div>
                      </div>
                      <span className="text-xs text-gray-400">{formatDate(fb.created_at)}</span>
                    </div>

                    {/* Comment */}
                    {fb.comment ? (
                      <p className="text-gray-600 text-sm leading-relaxed">
                        {fb.comment.length > 150 ? fb.comment.substring(0, 150) + '...' : fb.comment}
                      </p>
                    ) : (
                      <p className="text-gray-400 text-sm italic">No comment provided</p>
                    )}

                    {/* Rating Details */}
                    {(fb.data_quality_rating || fb.data_completeness_rating || fb.ease_of_use_rating) && (
                      <div className="flex gap-3 mt-3 pt-2 border-t border-gray-100">
                        {fb.data_quality_rating && (
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-gray-500">Quality:</span>
                            <span className="text-xs font-medium text-gray-700">{fb.data_quality_rating}/5</span>
                          </div>
                        )}
                        {fb.data_completeness_rating && (
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-gray-500">Completeness:</span>
                            <span className="text-xs font-medium text-gray-700">{fb.data_completeness_rating}/5</span>
                          </div>
                        )}
                        {fb.ease_of_use_rating && (
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-gray-500">Ease:</span>
                            <span className="text-xs font-medium text-gray-700">{fb.ease_of_use_rating}/5</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}

                {/* Empty State */}
                {reportFeedback.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                      <MessageSquare className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className="text-gray-500">No reviews found for this report</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
            <button onClick={onClose} className="w-full px-4 py-2.5 bg-gray-800 text-white rounded-xl font-medium hover:bg-gray-900 transition-colors">
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Individual Feedback Detail Modal */}
      {selectedFeedback && <ReportFeedbackDetailModal feedback={selectedFeedback} onClose={() => setSelectedFeedback(null)} />}
    </>
  );
};

// ==================== REPORT FEEDBACK TAB CONTENT ====================

const ReportFeedbackTab = () => {
  const [loading, setLoading] = useState(true);
  const [feedbackData, setFeedbackData] = useState(null);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReport, setSelectedReport] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const fetchFeedback = async () => {
    setLoading(true);
    setError(null);
    try {
      const url = `/api/report-feedback/`;
      const response = await api.get(url);
      setFeedbackData(response.data);
    } catch (err) {
      console.error('Failed to fetch feedback:', err);
      setError(err.response?.data?.error || err.response?.data?.detail || err.message || 'Failed to load feedback');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedback();
  }, []);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}.${date.getFullYear()}`;
  };

  // Filter reports by search query
  const filteredReports = feedbackData?.by_report?.filter(report => 
    !searchQuery || report.report__title?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  // Get last feedback date for each report
  const getLastFeedbackDate = (reportId) => {
    const reportFeedback = feedbackData?.feedback?.filter(fb => fb.report?.report_id === reportId) || [];
    if (reportFeedback.length === 0) return null;
    const sorted = reportFeedback.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    return sorted[0]?.created_at;
  };

  // Get comment count for each report
  const getCommentCount = (reportId) => {
    const reportFeedback = feedbackData?.feedback?.filter(fb => fb.report?.report_id === reportId) || [];
    return reportFeedback.filter(fb => fb.comment).length;
  };

  // Pagination
  const totalItems = filteredReports.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedReports = filteredReports.slice(startIndex, startIndex + pageSize);

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
        <div>
          <h3 className="font-medium text-red-800">Error Loading Feedback</h3>
          <p className="text-red-600 text-sm mt-1">{error}</p>
          <button onClick={fetchFeedback} className="mt-2 text-sm text-red-700 underline hover:no-underline">Try again</button>
        </div>
      </div>
    );
  }

  if (loading && !feedbackData) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      {/* Refresh Button */}
      <div className="flex justify-end">
        <button onClick={fetchFeedback} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard icon={MessageSquare} label="Total Feedback" value={feedbackData?.summary?.total_feedback || 0} color="bg-blue-100 text-blue-600" />
        <StatCard icon={Star} label="Average Rating" value={feedbackData?.summary?.average_rating?.toFixed(1) || '0.0'} color="bg-yellow-100 text-yellow-600" subValue="out of 5.0" />
        <StatCard icon={TrendingUp} label="Data Quality Avg" value={feedbackData?.summary?.average_data_quality?.toFixed(1) || '0.0'} color="bg-green-100 text-green-600" subValue="out of 5.0" />
        <StatCard icon={Users} label="Reports Reviewed" value={feedbackData?.by_report?.length || 0} color="bg-purple-100 text-purple-600" />
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search reports by name..." 
              value={searchQuery} 
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }} 
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" 
            />
          </div>
          {searchQuery && (
            <button 
              onClick={() => { setSearchQuery(''); setCurrentPage(1); }} 
              className="px-4 py-2.5 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-2"
            >
              <Filter className="w-4 h-4" />Clear
            </button>
          )}
        </div>
      </div>

      {/* Reports Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-600" />
            Reports Feedback Summary
            <span className="text-sm font-normal text-gray-500">({totalItems} reports)</span>
          </h2>
        </div>

        {paginatedReports.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-800 mb-2">No Reports Found</h3>
            <p className="text-gray-500">{searchQuery ? 'No reports match your search.' : 'No reports have been rated yet.'}</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Report Name</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Average Rating</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Total Reviews</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Comments</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Last Feedback</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {paginatedReports.map((report) => {
                    const lastDate = getLastFeedbackDate(report.report__report_id);
                    const commentCount = getCommentCount(report.report__report_id);
                    
                    return (
                      <tr 
                        key={report.report__report_id} 
                        onClick={() => setSelectedReport(report)} 
                        className="hover:bg-indigo-50 transition-colors cursor-pointer group"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-xl flex items-center justify-center group-hover:from-indigo-200 group-hover:to-purple-200 transition-colors">
                              <FileText className="w-5 h-5 text-indigo-600" />
                            </div>
                            <p className="font-medium text-gray-900 group-hover:text-indigo-600 transition-colors">{report.report__title}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="flex gap-0.5">
                              {[1,2,3,4,5].map((star) => (
                                <Star 
                                  key={star} 
                                  className={`w-4 h-4 ${star <= Math.round(report.avg_rating || 0) ? 'fill-yellow-400 text-yellow-400' : 'fill-gray-200 text-gray-200'}`} 
                                />
                              ))}
                            </div>
                            <span className="font-semibold text-gray-900">{report.avg_rating?.toFixed(1) || '0.0'}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">
                            <MessageSquare className="w-3.5 h-3.5" />
                            {report.total || 0}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-gray-600">{commentCount}</span>
                        </td>
                        <td className="px-6 py-4">
                          {lastDate ? (
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                              <Calendar className="w-4 h-4" />
                              {formatDate(lastDate)}
                            </div>
                          ) : (
                            <span className="text-gray-400 text-sm">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {totalItems > 0 && (
              <Pagination 
                currentPage={currentPage} 
                totalPages={totalPages} 
                totalCount={totalItems} 
                pageSize={pageSize} 
                onPageChange={setCurrentPage} 
                onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1); }} 
                showFirstLast={true} 
              />
            )}
          </>
        )}
      </div>

      {/* Report Detail Modal */}
      {selectedReport && (
        <ReportDetailModal 
          report={selectedReport} 
          allFeedback={feedbackData?.feedback} 
          onClose={() => setSelectedReport(null)} 
        />
      )}
    </div>
  );
};

// ==================== PREMIUM ANIMATED TAB COMPONENT ====================

const AnimatedTabs = ({ activeTab, onTabChange, helpCount, reportCount }) => {
  const [hoveredTab, setHoveredTab] = useState(null);
  
  const tabs = [
    { 
      id: 'help', 
      label: 'Help Center', 
      description: 'Article feedback & ratings',
      icon: HelpCircle,
      count: helpCount,
      accentColor: '#0ea5e9',
      gradientFrom: '#0ea5e9',
      gradientTo: '#6366f1',
    },
    { 
      id: 'report', 
      label: 'Reports', 
      description: 'Client report ratings',
      icon: Star,
      count: reportCount,
      accentColor: '#f59e0b',
      gradientFrom: '#f59e0b',
      gradientTo: '#ef4444',
    },
  ];

  return (
    <div className="mb-8">
      <div className="grid grid-cols-2 gap-4">
        {tabs.map((tab, index) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          const isHovered = hoveredTab === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              onMouseEnter={() => setHoveredTab(tab.id)}
              onMouseLeave={() => setHoveredTab(null)}
              className="relative group text-left focus:outline-none"
              style={{ perspective: '1000px' }}
            >
              {/* Main Card */}
              <div 
                className={`relative overflow-hidden rounded-2xl transition-all duration-500 ease-out ${
                  isActive 
                    ? 'shadow-2xl scale-[1.02]' 
                    : 'shadow-lg hover:shadow-xl hover:scale-[1.01]'
                }`}
                style={{
                  background: isActive 
                    ? `linear-gradient(135deg, ${tab.gradientFrom}, ${tab.gradientTo})`
                    : 'white',
                  transform: isHovered && !isActive ? 'translateY(-2px)' : 'translateY(0)',
                }}
              >
                {/* Animated Background Pattern for Active */}
                {isActive && (
                  <div className="absolute inset-0 opacity-30">
                    <div className="absolute inset-0" style={{
                      backgroundImage: `radial-gradient(circle at 20% 50%, rgba(255,255,255,0.3) 0%, transparent 50%),
                                       radial-gradient(circle at 80% 80%, rgba(255,255,255,0.2) 0%, transparent 40%)`,
                    }} />
                    {/* Floating particles effect */}
                    <div className="absolute top-4 right-8 w-20 h-20 bg-white/20 rounded-full blur-2xl animate-pulse" />
                    <div className="absolute bottom-4 left-12 w-16 h-16 bg-white/15 rounded-full blur-xl animate-pulse" style={{ animationDelay: '1s' }} />
                  </div>
                )}

                {/* Subtle Border Gradient for Inactive */}
                {!isActive && (
                  <div 
                    className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    style={{
                      background: `linear-gradient(135deg, ${tab.gradientFrom}20, ${tab.gradientTo}20)`,
                    }}
                  />
                )}

                {/* Card Content */}
                <div className="relative p-6">
                  {/* Top Row: Icon + Count Badge */}
                  <div className="flex items-start justify-between mb-4">
                    {/* Icon Container */}
                    <div 
                      className={`relative w-14 h-14 rounded-xl flex items-center justify-center transition-all duration-300 ${
                        isActive 
                          ? 'bg-white/25 backdrop-blur-sm' 
                          : 'bg-gradient-to-br'
                      }`}
                      style={!isActive ? {
                        background: `linear-gradient(135deg, ${tab.gradientFrom}15, ${tab.gradientTo}15)`,
                      } : {}}
                    >
                      <Icon 
                        className={`w-7 h-7 transition-all duration-300 ${
                          isActive ? 'text-white' : ''
                        }`}
                        style={!isActive ? { color: tab.accentColor } : {}}
                      />
                      
                      {/* Ripple Effect on Active Icon */}
                      {isActive && (
                        <>
                          <div className="absolute inset-0 rounded-xl bg-white/20 animate-ping" style={{ animationDuration: '2s' }} />
                        </>
                      )}
                    </div>

                    {/* Count Badge */}
                    {tab.count > 0 && (
                      <div 
                        className={`px-3 py-1.5 rounded-full text-sm font-bold transition-all duration-300 ${
                          isActive 
                            ? 'bg-white/25 backdrop-blur-sm text-white' 
                            : 'text-white'
                        }`}
                        style={!isActive ? {
                          background: `linear-gradient(135deg, ${tab.gradientFrom}, ${tab.gradientTo})`,
                        } : {}}
                      >
                        {tab.count > 999 ? '999+' : tab.count}
                      </div>
                    )}
                  </div>

                  {/* Title & Description */}
                  <div className="space-y-1">
                    <h3 className={`text-xl font-bold transition-colors duration-300 ${
                      isActive ? 'text-white' : 'text-gray-900'
                    }`}>
                      {tab.label}
                    </h3>
                    <p className={`text-sm transition-colors duration-300 ${
                      isActive ? 'text-white/80' : 'text-gray-500'
                    }`}>
                      {tab.description}
                    </p>
                  </div>

                  {/* Bottom Indicator Bar */}
                  <div className="mt-5 h-1.5 rounded-full overflow-hidden bg-gray-100" style={isActive ? { background: 'rgba(255,255,255,0.2)' } : {}}>
                    <div 
                      className="h-full rounded-full transition-all duration-500 ease-out"
                      style={{
                        width: isActive ? '100%' : isHovered ? '60%' : '30%',
                        background: isActive 
                          ? 'rgba(255,255,255,0.8)'
                          : `linear-gradient(90deg, ${tab.gradientFrom}, ${tab.gradientTo})`,
                      }}
                    />
                  </div>

                  {/* Active Check Mark */}
                  {isActive && (
                    <div className="absolute top-1 right-1 w-6 h-6 bg-white/30 backdrop-blur-sm rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </div>

                {/* Bottom Gradient Line for Active */}
                {isActive && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/40">
                    <div 
                      className="h-full bg-white/60"
                      style={{
                        animation: 'slideRight 2s ease-in-out infinite',
                        width: '40%',
                      }}
                    />
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Keyframe animations */}
      <style>{`
        @keyframes slideRight {
          0%, 100% { transform: translateX(-100%); opacity: 0; }
          50% { transform: translateX(150%); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

// ==================== MAIN COMPONENT ====================

const FeedbackPage = () => {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const breadcrumbs = getBreadcrumbs(location.pathname);
  
  // Counts for tabs
  const [helpCount, setHelpCount] = useState(0);
  const [reportCount, setReportCount] = useState(0);
  
  // Get active tab from URL or default to 'help'
  const activeTab = searchParams.get('tab') || 'help';

  const handleTabChange = (tab) => {
    setSearchParams({ tab });
  };

  // Fetch counts for tab badges
  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const [helpRes, reportRes] = await Promise.all([
          api.get('/api/help-center-feedback/'),
          api.get('/api/report-feedback/')
        ]);
        setHelpCount(helpRes.data?.summary?.total || 0);
        setReportCount(reportRes.data?.summary?.total_feedback || 0);
      } catch (err) {
        console.error('Failed to fetch counts:', err);
      }
    };
    fetchCounts();
  }, []);

  return (
    <DashboardLayout 
      pageTitle="Feedback" 
      breadcrumbs={breadcrumbs} 
      pageSubtitleBottom="View and analyze feedback from clients"
    >
      <div className="p-6">
        {/* Animated Tabs */}
        <AnimatedTabs 
          activeTab={activeTab} 
          onTabChange={handleTabChange}
          helpCount={helpCount}
          reportCount={reportCount}
        />

        {/* Tab Content */}
        {activeTab === 'help' ? (
          <HelpCenterFeedbackTab />
        ) : (
          <ReportFeedbackTab />
        )}
      </div>
    </DashboardLayout>
  );
};

export default FeedbackPage;
