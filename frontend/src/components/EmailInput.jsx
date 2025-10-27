// Updated EmailInput.jsx with validation callback support

import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Loader2, Mail } from 'lucide-react';
import api from '../utils/api';

const EmailInput = ({
  value,
  onChange,
  required = true,
  existingUserId = null,
  onValidationChange // ✅ ADD: Callback to notify parent of validation state
}) => {
  const [validation, setValidation] = useState({
    isValid: false,
    message: '',
    isChecking: false
  });
  const [touched, setTouched] = useState(false);
  const [checkTimer, setCheckTimer] = useState(null);

  // Email format validation
  const isValidEmailFormat = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Check email availability
  const checkEmail = async (email) => {
    if (!email) {
      const newValidation = {
        isValid: false,
        message: '',
        isChecking: false
      };
      setValidation(newValidation);
      // ✅ Notify parent
      if (onValidationChange) {
        onValidationChange(false);
      }
      return;
    }

    // Check format first
    if (!isValidEmailFormat(email)) {
      const newValidation = {
        isValid: false,
        message: 'Please enter a valid email address',
        isChecking: false
      };
      setValidation(newValidation);
      // ✅ Notify parent
      if (onValidationChange) {
        onValidationChange(false);
      }
      return;
    }

    setValidation(prev => ({
      ...prev,
      isChecking: true
    }));

    try {
      const response = await api.post('/api/auth/check-email/', {
        email: email,
        user_id: existingUserId
      });

      const newValidation = {
        isValid: response.data.available,
        message: response.data.message,
        isChecking: false
      };
      setValidation(newValidation);

      // ✅ Notify parent
      if (onValidationChange) {
        onValidationChange(response.data.available);
      }
    } catch (err) {
      console.error('Email check error:', err);
      const newValidation = {
        isValid: false,
        message: err.response?.data?.message || 'Could not verify email availability',
        isChecking: false
      };
      setValidation(newValidation);

      // ✅ Notify parent
      if (onValidationChange) {
        onValidationChange(false);
      }
    }
  };

  // Handle input change with debouncing
  useEffect(() => {
    if (!value) {
      // ✅ Notify parent when value is empty
      if (onValidationChange) {
        onValidationChange(false);
      }
      return;
    }

    if (checkTimer) clearTimeout(checkTimer);

    const timer = setTimeout(() => {
      checkEmail(value);
    }, 500);

    setCheckTimer(timer);

    return () => {
      if (checkTimer) clearTimeout(checkTimer);
    };
  }, [value, existingUserId]);

  const handleChange = (e) => {
    const newValue = e.target.value.trim().toLowerCase();
    onChange({
      target: {
        name: 'email',
        value: newValue
      }
    });
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Email {required && <span className="text-red-500">*</span>}
      </label>

      <div className="relative">
        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="email"
          name="email"
          value={value}
          onChange={handleChange}
          onBlur={() => setTouched(true)}
          className={`w-full pl-10 pr-10 py-2 border rounded-lg focus:ring-2 transition ${
            touched
              ? validation.isValid
                ? 'border-green-300 focus:ring-green-500'
                : validation.message && !validation.isChecking
                ? 'border-red-300 focus:ring-red-500'
                : 'border-gray-300 focus:ring-indigo-500'
              : 'border-gray-300 focus:ring-indigo-500'
          }`}
          placeholder="user@example.com"
          required={required}
        />

        {/* Status Icons */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          {validation.isChecking && (
            <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />
          )}
          {!validation.isChecking && touched && value && validation.isValid && (
            <CheckCircle className="w-5 h-5 text-green-500" />
          )}
          {!validation.isChecking && touched && value && validation.message && !validation.isValid && (
            <XCircle className="w-5 h-5 text-red-500" />
          )}
        </div>
      </div>

      {/* Validation Message */}
      {touched && validation.message && (
        <p className={`text-xs mt-1 flex items-start gap-1 ${
          validation.isValid ? 'text-green-600' : 'text-red-600'
        }`}>
          {validation.message}
        </p>
      )}

      {/* Helper Text */}
      {!touched && (
        <p className="text-xs text-gray-500 mt-1">
          A password creation link will be sent to this email address
        </p>
      )}
    </div>
  );
};

export default EmailInput;