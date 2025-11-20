import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Loader2, Sparkles } from 'lucide-react';
import api from '../../utils/api';

const UsernameInput = ({
  value,
  onChange,
  firstName = '',
  lastName = '',
  email = '',
  disabled = false,
  required = true,
  existingUserId = null,
  onValidationChange // Callback to notify parent of validation state
}) => {
  const [validation, setValidation] = useState({
    isValid: false,
    message: '',
    isChecking: false,
    suggestions: []
  });
  const [touched, setTouched] = useState(false);
  const [checkTimer, setCheckTimer] = useState(null);

  // Check username availability
  const checkUsername = async (username) => {
    if (!username || username.length < 3) {
      setValidation({
        isValid: false,
        message: username.length > 0 ? 'Username must be at least 3 characters' : '',
        isChecking: false,
        suggestions: []
      });
      // Notify parent
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
      const response = await api.post('/api/auth/check-username/', {
        username: username,
        first_name: firstName,
        last_name: lastName,
        email: email
      });

      setValidation({
        isValid: response.data.available,
        message: response.data.message,
        isChecking: false,
        suggestions: response.data.suggestions || []
      });

      // Notify parent
      if (onValidationChange) {
        onValidationChange(response.data.available);
      }
    } catch (err) {
      console.error('Username check error:', err);
      setValidation({
        isValid: false,
        message: 'Could not verify username availability',
        isChecking: false,
        suggestions: []
      });

      // Notify parent
      if (onValidationChange) {
        onValidationChange(false);
      }
    }
  };

  // Generate username suggestions
  const generateUsername = async () => {
    if (!firstName && !lastName && !email) {
      return;
    }

    try {
      const response = await api.post('/api/auth/generate-username/', {
        first_name: firstName,
        last_name: lastName,
        email: email
      });

      if (response.data.suggestions && response.data.suggestions.length > 0) {
        setValidation(prev => ({
          ...prev,
          suggestions: response.data.suggestions
        }));
      }
    } catch (err) {
      console.error('Username generation error:', err);
    }
  };

  // Handle input change with debouncing
  useEffect(() => {
    if (!value || disabled) {
      // Notify parent when value is empty
      if (onValidationChange) {
        onValidationChange(false);
      }
      return;
    }

    if (checkTimer) clearTimeout(checkTimer);

    const timer = setTimeout(() => {
      checkUsername(value);
    }, 500);

    setCheckTimer(timer);

    return () => {
      if (checkTimer) clearTimeout(checkTimer);
    };
  }, [value, firstName, lastName, email]);

  const handleChange = (e) => {
    const newValue = e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, '');
    onChange({
      target: {
        name: 'username',
        value: newValue
      }
    });
  };

  const handleSuggestionClick = (suggestion) => {
    onChange({
      target: {
        name: 'username',
        value: suggestion
      }
    });
    setTouched(true);
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Username {required && <span className="text-red-500">*</span>}
      </label>

      <div className="relative">
        <input
          type="text"
          name="username"
          value={value}
          onChange={handleChange}
          onBlur={() => setTouched(true)}
          disabled={disabled}
          className={`w-full px-3 py-2 pr-10 border rounded-lg focus:ring-2 transition ${
            disabled
              ? 'bg-gray-100 cursor-not-allowed'
              : touched
              ? validation.isValid
                ? 'border-green-300 focus:ring-green-500'
                : validation.message && !validation.isChecking
                ? 'border-red-300 focus:ring-red-500'
                : 'border-gray-300 focus:ring-indigo-500'
              : 'border-gray-300 focus:ring-indigo-500'
          }`}
          placeholder="Enter username"
          required={required}
          minLength={3}
          maxLength={30}
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
        <p className={`text-xs mt-1 flex items-center gap-1 ${
          validation.isValid ? 'text-green-600' : 'text-red-600'
        }`}>
          {validation.message}
        </p>
      )}

      {/* Username Suggestions */}
      {!disabled && validation.suggestions && validation.suggestions.length > 0 && !validation.isValid && (
        <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-blue-600" />
            <p className="text-sm font-medium text-blue-900">Suggestions:</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {validation.suggestions.map((suggestion, index) => (
              <button
                key={index}
                type="button"
                onClick={() => handleSuggestionClick(suggestion)}
                className="px-3 py-1.5 bg-white border border-blue-300 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors text-sm font-mono"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Generate Username Button */}
      {!disabled && !value && (firstName || lastName || email) && (
        <button
          type="button"
          onClick={generateUsername}
          className="mt-2 text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
        >
          <Sparkles className="w-4 h-4" />
          Generate username suggestions
        </button>
      )}

      {/* Helper Text */}
      <p className="text-xs text-gray-500 mt-1">
        Only lowercase letters, numbers, dots, underscores, and hyphens. Min 3 characters.
      </p>
    </div>
  );
};

export default UsernameInput;