import { useState, useEffect } from 'react';
import { Eye, EyeOff, Check, X } from 'lucide-react';

const PasswordStrengthInput = ({ value, onChange, required = true, label = 'Password' }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);
  const [numLockOn, setNumLockOn] = useState(true); // Default to true
  const [touched, setTouched] = useState(false);

  // Password validation rules
  const rules = [
    {
      id: 'length',
      label: 'At least 8 characters',
      test: (pwd) => pwd.length >= 8,
    },
    {
      id: 'uppercase',
      label: 'One uppercase letter',
      test: (pwd) => /[A-Z]/.test(pwd),
    },
    {
      id: 'lowercase',
      label: 'One lowercase letter',
      test: (pwd) => /[a-z]/.test(pwd),
    },
    {
      id: 'number',
      label: 'One number',
      test: (pwd) => /[0-9]/.test(pwd),
    },
  ];

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

  const getValidation = (rule) => {
    if (!touched || !value) return null;
    return rule.test(value);
  };

  const allRulesPassed = rules.every(rule => rule.test(value));

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
      {touched && (
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
      )}

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