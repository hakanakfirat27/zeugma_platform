import { useState, useEffect } from 'react';
import { Check, X, Loader2, Mail } from 'lucide-react';
import api from '../utils/api';

const EmailInput = ({ value, onChange, disabled = false, required = true, existingUserId = null }) => {
  const [checking, setChecking] = useState(false);
  const [available, setAvailable] = useState(null);
  const [message, setMessage] = useState('');
  const [touched, setTouched] = useState(false);

  // Debounced email check
  useEffect(() => {
    if (!value || !touched || !value.includes('@')) {
      setAvailable(null);
      setMessage('');
      return;
    }

    const timer = setTimeout(() => {
      checkEmail();
    }, 500);

    return () => clearTimeout(timer);
  }, [value, touched]);

  const checkEmail = async () => {
    if (!value || !value.includes('@')) return;

    setChecking(true);
    try {
      const { data } = await api.post('/api/auth/check-email/', {
        email: value,
        user_id: existingUserId, // For edit mode, exclude current user
      });

      setAvailable(data.available);
      setMessage(data.message);
    } catch (error) {
      console.error('Error checking email:', error);
    } finally {
      setChecking(false);
    }
  };

  const handleBlur = () => {
    setTouched(true);
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        Email {required && <span className="text-red-500">*</span>}
      </label>

      <div className="relative">
        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="email"
          name="email"
          value={value}
          onChange={(e) => {
            onChange(e);
            setTouched(true);
          }}
          onBlur={handleBlur}
          disabled={disabled}
          className={`w-full pl-10 pr-10 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
            disabled ? 'bg-gray-100 cursor-not-allowed' : ''
          } ${
            touched && available === true ? 'border-green-500' :
            touched && available === false ? 'border-red-500' :
            'border-gray-300'
          }`}
          placeholder="user@example.com"
          required={required}
        />

        {/* Status Icon */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          {checking && (
            <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
          )}
          {!checking && touched && available === true && (
            <Check className="w-5 h-5 text-green-600" />
          )}
          {!checking && touched && available === false && (
            <X className="w-5 h-5 text-red-600" />
          )}
        </div>
      </div>

      {/* Message */}
      {touched && message && (
        <div className={`text-sm flex items-start gap-2 ${available ? 'text-green-600' : 'text-red-600'}`}>
          {!available && <X className="w-4 h-4 flex-shrink-0 mt-0.5" />}
          <p>{message}</p>
        </div>
      )}
    </div>
  );
};

export default EmailInput;