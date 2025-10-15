import { useState, useEffect, useCallback } from 'react';
import { Check, X, Loader2 } from 'lucide-react';
import api from '../utils/api';

const UsernameInput = ({ value, onChange, firstName = '', lastName = '', email = '', disabled = false, required = true }) => {
  const [checking, setChecking] = useState(false);
  const [available, setAvailable] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [message, setMessage] = useState('');
  const [touched, setTouched] = useState(false);

  // Debounced username check
  useEffect(() => {
    if (!value || !touched || value.length < 3) {
      setAvailable(null);
      setSuggestions([]);
      setMessage('');
      return;
    }

    const timer = setTimeout(() => {
      checkUsername();
    }, 500);

    return () => clearTimeout(timer);
  }, [value, touched]);

  const checkUsername = async () => {
    if (!value) return;

    setChecking(true);
    try {
      const { data } = await api.post('/api/auth/check-username/', {
        username: value,
        first_name: firstName,
        last_name: lastName,
        email: email,
      });

      setAvailable(data.available);
      setMessage(data.message);
      setSuggestions(data.suggestions || []);
    } catch (error) {
      console.error('Error checking username:', error);
    } finally {
      setChecking(false);
    }
  };

  const handleBlur = () => {
    setTouched(true);
  };

  const selectSuggestion = (suggestion) => {
    onChange({ target: { name: 'username', value: suggestion } });
    setTouched(true);
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        Username {required && <span className="text-red-500">*</span>}
      </label>

      <div className="relative">
        <input
          type="text"
          name="username"
          value={value}
          onChange={(e) => {
            onChange(e);
            setTouched(true);
          }}
          onBlur={handleBlur}
          disabled={disabled}
          className={`w-full px-3 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
            disabled ? 'bg-gray-100 cursor-not-allowed' : ''
          } ${
            touched && available === true ? 'border-green-500' :
            touched && available === false ? 'border-red-500' :
            'border-gray-300'
          }`}
          placeholder="Choose your username"
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
        <p className={`text-sm ${available ? 'text-green-600' : 'text-red-600'}`}>
          {message}
        </p>
      )}

      {/* Suggestions */}
      {touched && !available && suggestions.length > 0 && (
        <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-xs text-gray-600 mb-2 font-medium">Available suggestions:</p>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                type="button"
                onClick={() => selectSuggestion(suggestion)}
                className="px-3 py-1 text-sm bg-white border border-indigo-200 text-indigo-700 rounded-md hover:bg-indigo-50 hover:border-indigo-300 transition-colors"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default UsernameInput;