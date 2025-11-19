import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useToast } from '../../contexts/ToastContext';

const ThankYouEmailModal = ({ isOpen, onClose, siteId, companyName, onEmailSent }) => {
  const [formData, setFormData] = useState({
    company_name: companyName || '',
    recipient_email: '',
    additional_message: '',
  });
  const [isSending, setIsSending] = useState(false);
  const [emailStatus, setEmailStatus] = useState(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(false);
  const { success, error, warning } = useToast();

  // Check email status when modal opens
  useEffect(() => {
    if (isOpen && siteId) {
      checkEmailStatus();
    }
  }, [isOpen, siteId]);

  // Auto-refresh countdown every minute when in cooldown
  useEffect(() => {
    if (emailStatus && !emailStatus.can_send) {
      const interval = setInterval(() => {
        checkEmailStatus();
      }, 60000); // Refresh every minute

      return () => clearInterval(interval);
    }
  }, [emailStatus]);

  const checkEmailStatus = async () => {
    setIsLoadingStatus(true);
    try {
      const token = localStorage.getItem('access_token');
      const response = await axios.get(
        `/api/sites/${siteId}/check-email-status/`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );
      setEmailStatus(response.data);
    } catch (err) {
      console.error('Error checking email status:', err);
    } finally {
      setIsLoadingStatus(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const formatCountdown = (cooldownInfo) => {
    if (!cooldownInfo) return '';
    
    const hours = Math.floor(cooldownInfo.hours_remaining);
    const minutes = cooldownInfo.minutes_remaining || 0;
    
    if (hours > 0) {
      return `${hours} hour${hours !== 1 ? 's' : ''} and ${minutes} minute${minutes !== 1 ? 's' : ''}`;
    } else {
      return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!formData.recipient_email || !formData.company_name) {
      error('Please fill in all required fields');
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.recipient_email)) {
      error('Please enter a valid email address');
      return;
    }

    // Check if in cooldown (double-check on frontend)
    if (emailStatus && !emailStatus.can_send) {
      const countdown = formatCountdown(emailStatus.cooldown_info);
      warning(`Please wait ${countdown} before sending another email for this site.`);
      return;
    }

    setIsSending(true);

    try {
      const token = localStorage.getItem('access_token');
      const response = await axios.post(
        `/api/sites/${siteId}/send-thank-you-email/`,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.data.success) {
        success(`Thank you email sent successfully to ${formData.recipient_email}`);
        
        // Call callback if provided
        if (onEmailSent) {
          onEmailSent(response.data.details);
        }
        
        // Reset form and close modal
        setFormData({
          company_name: companyName || '',
          recipient_email: '',
          additional_message: '',
        });
        onClose();
      }
    } catch (err) {
      console.error('Error sending thank you email:', err);
      
      // Handle cooldown errors
      if (err.response?.status === 429) {
        const data = err.response.data;
        if (data.cooldown_info) {
          const countdown = formatCountdown(data.cooldown_info);
          error(`Cooldown active: Please wait ${countdown} before sending another email.`);
          // Refresh status
          checkEmailStatus();
        } else {
          error(data.details || 'Please wait before sending another email.');
        }
      } else {
        const errorMessage = err.response?.data?.error || 
                            err.response?.data?.details || 
                            'Failed to send email. Please try again.';
        error(errorMessage);
      }
    } finally {
      setIsSending(false);
    }
  };

  if (!isOpen) return null;

  const canSend = emailStatus?.can_send !== false;
  const cooldownInfo = emailStatus?.cooldown_info;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-lg w-full">
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-4 rounded-t-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="bg-white bg-opacity-20 p-2 rounded-lg">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-white">
                  Send Thank You Email
                </h3>
              </div>
              <button
                onClick={onClose}
                className="text-white hover:text-gray-200 transition-colors"
                disabled={isSending}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Cooldown Warning */}
          {cooldownInfo && !canSend && (
            <div className="px-6 py-4 bg-yellow-50 border-b border-yellow-200">
              <div className="flex items-start space-x-3">
                <svg className="w-6 h-6 text-yellow-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <div className="flex-1">
                  <p className="font-semibold text-yellow-800 mb-1">
                    ⏱️ Cooldown Period Active
                  </p>
                  <p className="text-sm text-yellow-700 mb-2">
                    Last email sent {cooldownInfo.hours_since_last.toFixed(1)} hours ago
                    to <strong>{cooldownInfo.previous_recipient}</strong>
                    by {cooldownInfo.last_sent_by}
                  </p>
                  <p className="text-sm text-yellow-800 font-medium">
                    Please wait <strong>{formatCountdown(cooldownInfo)}</strong> before sending another email for this site.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Success - Can Send */}
          {cooldownInfo && canSend && cooldownInfo.cooldown_expired && (
            <div className="px-6 py-3 bg-green-50 border-b border-green-200">
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-sm font-medium text-green-800">
                  ✅ Ready to send! Last email was {cooldownInfo.hours_since_last.toFixed(1)} hours ago.
                </span>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Company Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Company Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="company_name"
                value={formData.company_name}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Enter company name"
                required
                disabled={isSending || !canSend}
              />
            </div>

            {/* Recipient Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Recipient Email Address <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                name="recipient_email"
                value={formData.recipient_email}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="example@company.com"
                required
                disabled={isSending || !canSend}
              />
            </div>

            {/* Additional Message (Optional) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Additional Message (Optional)
              </label>
              <textarea
                name="additional_message"
                value={formData.additional_message}
                onChange={handleChange}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                placeholder="Add any additional notes or message..."
                disabled={isSending || !canSend}
              />
              <p className="mt-1 text-xs text-gray-500">
                This message will be included in the email (optional)
              </p>
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <div className="text-sm text-blue-700">
                  <p className="font-medium mb-1">Email Preview</p>
                  <p className="mb-2">A professional thank you email will be sent using our branded template.</p>
                  <p className="text-xs text-blue-600">
                    ⏱️ You can send one thank you email every 12 hours per site.
                  </p>
                </div>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                disabled={isSending}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSending || !canSend}
                className="px-6 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                title={!canSend ? 'Cooldown period active' : 'Send email'}
              >
                {isSending ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Sending...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <span>Send Email</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ThankYouEmailModal;