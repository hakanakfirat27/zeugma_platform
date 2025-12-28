// frontend/src/components/client/ReportFeedbackSection.jsx
// Client component for submitting feedback on reports

import { useState, useEffect } from 'react';
import { 
  Star, 
  MessageSquare, 
  Send, 
  Check, 
  ChevronDown, 
  ChevronUp,
  Edit2,
  Sparkles
} from 'lucide-react';
import api from '../../utils/api';

// Star Rating Component
const StarRating = ({ rating, onRate, readonly = false, size = 'md' }) => {
  const [hovered, setHovered] = useState(0);
  
  const sizeClasses = {
    sm: 'w-5 h-5',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };

  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          onClick={() => !readonly && onRate(star)}
          onMouseEnter={() => !readonly && setHovered(star)}
          onMouseLeave={() => !readonly && setHovered(0)}
          className={`transition-all duration-150 ${readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110'}`}
        >
          <Star
            className={`${sizeClasses[size]} ${
              star <= (hovered || rating)
                ? 'fill-yellow-400 text-yellow-400'
                : 'fill-gray-200 text-gray-200'
            } transition-colors`}
          />
        </button>
      ))}
    </div>
  );
};

// Rating Labels
const getRatingLabel = (rating) => {
  const labels = {
    1: 'Poor',
    2: 'Fair',
    3: 'Good',
    4: 'Very Good',
    5: 'Excellent'
  };
  return labels[rating] || '';
};

const ReportFeedbackSection = ({ reportId, reportTitle, onSuccess }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [existingFeedback, setExistingFeedback] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);
  
  // Form state
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [dataQualityRating, setDataQualityRating] = useState(0);
  const [dataCompletenessRating, setDataCompletenessRating] = useState(0);
  const [easeOfUseRating, setEaseOfUseRating] = useState(0);
  const [showDetailedRatings, setShowDetailedRatings] = useState(true);

  // Fetch existing feedback
  useEffect(() => {
    const fetchFeedback = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/api/client/report-feedback/?report_id=${reportId}`);
        if (response.data.has_feedback && response.data.feedback) {
          setExistingFeedback(response.data.feedback);
          // Pre-fill form with existing data
          setRating(response.data.feedback.rating);
          setComment(response.data.feedback.comment || '');
          setDataQualityRating(response.data.feedback.data_quality_rating || 0);
          setDataCompletenessRating(response.data.feedback.data_completeness_rating || 0);
          setEaseOfUseRating(response.data.feedback.ease_of_use_rating || 0);
        }
      } catch (error) {
        console.error('Failed to fetch feedback:', error);
      } finally {
        setLoading(false);
      }
    };

    if (reportId) {
      fetchFeedback();
    }
  }, [reportId]);

  const handleSubmit = async () => {
    if (rating === 0) return;

    try {
      setSubmitting(true);
      const payload = {
        report_id: reportId,
        rating,
        comment: comment.trim(),
      };

      // Add optional ratings if set
      if (dataQualityRating > 0) payload.data_quality_rating = dataQualityRating;
      if (dataCompletenessRating > 0) payload.data_completeness_rating = dataCompletenessRating;
      if (easeOfUseRating > 0) payload.ease_of_use_rating = easeOfUseRating;

      const response = await api.post('/api/client/report-feedback/', payload);
      
      if (response.data.success) {
        setExistingFeedback(response.data.data);
        setIsEditing(false);
        setIsExpanded(false);
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
        if (onSuccess) onSuccess();
      }
    } catch (error) {
      console.error('Failed to submit feedback:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
    setIsExpanded(true);
    setShowDetailedRatings(true);
  };

  const handleCancel = () => {
    // Reset to existing values
    if (existingFeedback) {
      setRating(existingFeedback.rating);
      setComment(existingFeedback.comment || '');
      setDataQualityRating(existingFeedback.data_quality_rating || 0);
      setDataCompletenessRating(existingFeedback.data_completeness_rating || 0);
      setEaseOfUseRating(existingFeedback.ease_of_use_rating || 0);
    } else {
      setRating(0);
      setComment('');
      setDataQualityRating(0);
      setDataCompletenessRating(0);
      setEaseOfUseRating(0);
    }
    setIsEditing(false);
    setIsExpanded(false);
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-6 bg-gray-200 rounded w-1/3"></div>
        <div className="h-4 bg-gray-100 rounded w-1/2"></div>
        <div className="flex gap-1">
          {[1,2,3,4,5].map(i => (
            <div key={i} className="w-8 h-8 bg-gray-200 rounded-full"></div>
          ))}
        </div>
      </div>
    );
  }

  // Show existing feedback in compact view (default view like screenshot)
  if (existingFeedback && !isEditing) {
    return (
      <div className="space-y-4">
        {/* Success Message */}
        {showSuccess && (
          <div className="bg-green-100 border border-green-300 rounded-lg p-3 flex items-center gap-2 text-green-700">
            <Check className="w-5 h-5" />
            <span className="font-medium">Feedback updated successfully!</span>
          </div>
        )}

        {/* Header with expand toggle */}
        <div 
          className="flex items-center justify-between cursor-pointer"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <Check className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-800">Your Feedback</h3>
              <p className="text-sm text-green-600">
                Rated {existingFeedback.rating}/5 - Click to expand
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleEdit();
              }}
              className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
              title="Edit feedback"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            {isExpanded ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </div>
        </div>

        {/* Compact view - always visible */}
        <div className="space-y-4">
          {/* Overall Rating */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Overall Rating <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-4">
              <StarRating rating={existingFeedback.rating} readonly size="lg" />
              <span className="text-sm font-medium text-gray-600">
                {getRatingLabel(existingFeedback.rating)}
              </span>
            </div>
          </div>

          {/* Detailed Ratings - Horizontal Layout */}
          {(existingFeedback.data_quality_rating || existingFeedback.data_completeness_rating || existingFeedback.ease_of_use_rating) && (
            <div className="grid grid-cols-3 gap-4 py-3">
              {/* Data Quality */}
              <div className="text-center">
                <label className="block text-xs font-medium text-gray-500 mb-1.5">
                  Data Quality
                </label>
                <div className="flex justify-center">
                  <StarRating 
                    rating={existingFeedback.data_quality_rating || 0} 
                    readonly
                    size="sm"
                  />
                </div>
              </div>

              {/* Data Completeness */}
              <div className="text-center">
                <label className="block text-xs font-medium text-gray-500 mb-1.5">
                  Data Completeness
                </label>
                <div className="flex justify-center">
                  <StarRating 
                    rating={existingFeedback.data_completeness_rating || 0} 
                    readonly
                    size="sm"
                  />
                </div>
              </div>

              {/* Ease of Use */}
              <div className="text-center">
                <label className="block text-xs font-medium text-gray-500 mb-1.5">
                  Ease of Use
                </label>
                <div className="flex justify-center">
                  <StarRating 
                    rating={existingFeedback.ease_of_use_rating || 0} 
                    readonly
                    size="sm"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Comment */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1.5">
              <MessageSquare className="w-4 h-4" />
              Comments (Optional)
            </label>
            {existingFeedback.comment ? (
              <div className="text-gray-700 text-sm">
                {existingFeedback.comment}
              </div>
            ) : (
              <p className="text-sm text-gray-400 italic">No comment provided</p>
            )}
          </div>

          {/* Edit Button */}
          <div className="flex justify-end pt-2">
            <button
              onClick={handleEdit}
              className="flex items-center gap-2 px-4 py-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
            >
              <Edit2 className="w-4 h-4" />
              Edit Feedback
            </button>
          </div>
        </div>
      </div>
    );
  }

  // New feedback form or Edit mode
  return (
    <div className="space-y-5">
      {/* Success Message */}
      {showSuccess && (
        <div className="bg-green-100 border border-green-300 rounded-lg p-3 flex items-center gap-2 text-green-700">
          <Check className="w-5 h-5" />
          <span className="font-medium">Feedback submitted successfully!</span>
        </div>
      )}

      {/* Header */}
      {!existingFeedback && (
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-800">Rate This Report</h3>
            <p className="text-sm text-gray-500">Help us improve by sharing your experience</p>
          </div>
        </div>
      )}

      {isEditing && (
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
            <Edit2 className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-800">Update Your Feedback</h3>
            <p className="text-sm text-gray-500">Make changes to your feedback</p>
          </div>
        </div>
      )}

      {/* Main Rating */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Overall Rating <span className="text-red-500">*</span>
        </label>
        <div className="flex items-center gap-4">
          <StarRating 
            rating={rating} 
            onRate={setRating} 
            size="lg"
          />
          {rating > 0 && (
            <span className="text-sm font-medium text-gray-600">
              {getRatingLabel(rating)}
            </span>
          )}
        </div>
      </div>

      {/* Detailed Ratings Toggle */}
      <button
        type="button"
        onClick={() => setShowDetailedRatings(!showDetailedRatings)}
        className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-700"
      >
        {showDetailedRatings ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        {showDetailedRatings ? 'Hide detailed ratings (optional)' : 'Show detailed ratings (optional)'}
      </button>

      {/* Detailed Ratings */}
      {showDetailedRatings && (
        <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-xl">
          {/* Data Quality */}
          <div className="text-center">
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Data Quality
            </label>
            <div className="flex justify-center">
              <StarRating 
                rating={dataQualityRating} 
                onRate={setDataQualityRating} 
                size="sm"
              />
            </div>
          </div>

          {/* Data Completeness */}
          <div className="text-center">
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Data Completeness
            </label>
            <div className="flex justify-center">
              <StarRating 
                rating={dataCompletenessRating} 
                onRate={setDataCompletenessRating} 
                size="sm"
              />
            </div>
          </div>

          {/* Ease of Use */}
          <div className="text-center">
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Ease of Use
            </label>
            <div className="flex justify-center">
              <StarRating 
                rating={easeOfUseRating} 
                onRate={setEaseOfUseRating} 
                size="sm"
              />
            </div>
          </div>
        </div>
      )}

      {/* Comment */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <MessageSquare className="w-4 h-4 inline mr-1.5" />
          Comments (Optional)
        </label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Tell us what you think about this report..."
          rows={3}
          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none text-sm"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-2">
        {isEditing && (
          <button
            type="button"
            onClick={handleCancel}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
        )}
        <button
          onClick={handleSubmit}
          disabled={rating === 0 || submitting}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all ${
            rating === 0
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm hover:shadow'
          }`}
        >
          {submitting ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              {existingFeedback ? 'Update Feedback' : 'Submit Feedback'}
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default ReportFeedbackSection;
