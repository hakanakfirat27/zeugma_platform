import { useState, useEffect } from 'react';
import { Eye, EyeOff, Check, X, Loader2 } from 'lucide-react';
import api from '../../utils/api';

const PasswordStrengthInput = ({ 
  value, 
  onChange, 
  required = true, 
  label = 'Password',
  userId = null  // For password history check
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);
  const [numLockOn, setNumLockOn] = useState(true);
  const [touched, setTouched] = useState(false);
  const [policy, setPolicy] = useState(null);
  const [requirements, setRequirements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [strength, setStrength] = useState({ score: 0, label: 'None', color: 'gray' });

  // Fetch password policy on mount
  useEffect(() => {
    fetchPasswordPolicy();
  }, []);

  const fetchPasswordPolicy = async () => {
    try {
      const { data } = await api.get('/accounts/password-policy/');
      setPolicy(data.policy);
      setRequirements(data.requirements);
    } catch (err) {
      console.error('Failed to fetch password policy:', err);
      // Fallback to default requirements
      setRequirements([
        'At least 8 characters',
        'One uppercase letter',
        'One lowercase letter',
        'One number'
      ]);
      setPolicy({
        min_length: 8,
        require_uppercase: true,
        require_lowercase: true,
        require_numbers: true,
        require_special_chars: false
      });
    } finally {
      setLoading(false);
    }
  };

  // Generate rules based on policy
  const getRules = () => {
    if (!policy) return [];
    
    const rules = [];
    
    rules.push({
      id: 'length',
      label: `At least ${policy.min_length} characters`,
      test: (pwd) => pwd.length >= policy.min_length,
    });
    
    if (policy.require_uppercase) {
      rules.push({
        id: 'uppercase',
        label: 'One uppercase letter',
        test: (pwd) => /[A-Z]/.test(pwd),
      });
    }
    
    if (policy.require_lowercase) {
      rules.push({
        id: 'lowercase',
        label: 'One lowercase letter',
        test: (pwd) => /[a-z]/.test(pwd),
      });
    }
    
    if (policy.require_numbers) {
      rules.push({
        id: 'number',
        label: 'One number',
        test: (pwd) => /[0-9]/.test(pwd),
      });
    }
    
    if (policy.require_special_chars) {
      rules.push({
        id: 'special',
        label: 'One special character (!@#$%^&*...)',
        test: (pwd) => /[!@#$%^&*()_+\-=\[\]{}|;:',.<>?/~`"\\]/.test(pwd),
      });
    }
    
    return rules;
  };

  const rules = getRules();

  // Check Caps Lock
  const handleKeyDown = (e) => {
    setCapsLockOn(e.getModifierState('CapsLock'));
  };

  const handleKeyUp = (e) => {
    setCapsLockOn(e.getModifierState('CapsLock'));
  };

  // Check Num Lock on mount and key press
  useEffect(() => {
    const checkNumLock = (e) => {
      if (e.getModifierState) {
        setNumLockOn(e.getModifierState('NumLock'));
      }
    };

    window.addEventListener('keydown', checkNumLock);
    window.addEventListener('keyup', checkNumLock);

    return () => {
      window.removeEventListener('keydown', checkNumLock);
      window.removeEventListener('keyup', checkNumLock);
    };
  }, []);

  // Calculate password strength locally
  useEffect(() => {
    if (!value) {
      setStrength({ score: 0, label: 'None', color: 'gray' });
      return;
    }

    let score = 0;
    
    // Length scoring
    if (value.length >= 8) score += 20;
    if (value.length >= 12) score += 10;
    if (value.length >= 16) score += 10;
    
    // Character variety scoring
    if (/[A-Z]/.test(value)) score += 15;
    if (/[a-z]/.test(value)) score += 15;
    if (/[0-9]/.test(value)) score += 15;
    if (/[!@#$%^&*()_+\-=\[\]{}|;:',.<>?/~`"\\]/.test(value)) score += 15;
    
    // Determine label
    let label, color;
    if (score < 30) {
      label = 'Weak';
      color = 'red';
    } else if (score < 50) {
      label = 'Fair';
      color = 'orange';
    } else if (score < 70) {
      label = 'Good';
      color = 'yellow';
    } else if (score < 90) {
      label = 'Strong';
      color = 'green';
    } else {
      label = 'Very Strong';
      color = 'green';
    }
    
    setStrength({ score: Math.min(100, score), label, color });
  }, [value]);

  const getValidation = (rule) => {
    if (!touched || !value) return null;
    return rule.test(value);
  };

  const allRulesPassed = rules.length > 0 && rules.every(rule => rule.test(value));

  // Get color classes for strength bar
  const getStrengthColorClass = () => {
    switch (strength.color) {
      case 'red': return 'bg-red-500';
      case 'orange': return 'bg-orange-500';
      case 'yellow': return 'bg-yellow-500';
      case 'green': return 'bg-green-500';
      default: return 'bg-gray-300';
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-700">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        <div className="flex items-center justify-center p-4 bg-gray-50 rounded-lg">
          <Loader2 className="w-5 h-5 animate-spin text-gray-400 mr-2" />
          <span className="text-sm text-gray-500">Loading password requirements...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>

      {/* Password Input */}
      <div className="relative">
        <input
          type={showPassword ? 'text' : 'password'}
          name="password"
          value={value}
          onChange={(e) => {
            onChange(e);
            setTouched(true);
          }}
          onKeyDown={handleKeyDown}
          onKeyUp={handleKeyUp}
          onFocus={() => setTouched(true)}
          className="w-full px-3 py-2 pr-24 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          placeholder="Enter password"
          required={required}
        />

        {/* Show/Hide Password Toggle */}
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
          title={showPassword ? 'Hide password' : 'Show password'}
        >
          {showPassword ? (
            <EyeOff className="w-5 h-5" />
          ) : (
            <Eye className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* Password Strength Bar */}
      {touched && value && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">Password strength:</span>
            <span className={`font-medium ${
              strength.color === 'red' ? 'text-red-600' :
              strength.color === 'orange' ? 'text-orange-600' :
              strength.color === 'yellow' ? 'text-yellow-600' :
              'text-green-600'
            }`}>
              {strength.label}
            </span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-300 ${getStrengthColorClass()}`}
              style={{ width: `${strength.score}%` }}
            />
          </div>
        </div>
      )}

      {/* Caps Lock and Num Lock Indicators */}
      <div className="flex gap-3">
        {capsLockOn && (
          <div className="flex items-center gap-1.5 px-2 py-1 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
            <span className="font-semibold">⇪ Caps Lock</span> is on
          </div>
        )}
        {!numLockOn && (
          <div className="flex items-center gap-1.5 px-2 py-1 bg-blue-50 border border-blue-200 rounded text-xs text-blue-800">
            <span className="font-semibold">Num Lock</span> is off
          </div>
        )}
      </div>

      {/* Password Requirements */}
      <div className="space-y-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
        <p className="text-xs font-semibold text-gray-700 mb-2">Password requirements:</p>
        {rules.map((rule) => {
          const isValid = getValidation(rule);
          return (
            <div
              key={rule.id}
              className={`flex items-center gap-2 text-sm transition-colors ${
                isValid === null ? 'text-gray-600' :
                isValid ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {isValid === null ? (
                <X className="w-4 h-4 text-gray-400" />
              ) : isValid ? (
                <Check className="w-4 h-4 text-green-600" />
              ) : (
                <X className="w-4 h-4 text-red-600" />
              )}
              <span className={isValid ? 'font-medium' : ''}>{rule.label}</span>
            </div>
          );
        })}
      </div>

      {/* Overall Status */}
      {touched && value && (
        <div className={`text-sm font-medium ${allRulesPassed ? 'text-green-600' : 'text-gray-600'}`}>
          {allRulesPassed ? (
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4" />
              Password meets all requirements
            </div>
          ) : (
            'Please meet all password requirements'
          )}
        </div>
      )}
    </div>
  );
};

export default PasswordStrengthInput;
