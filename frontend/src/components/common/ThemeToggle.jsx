// frontend/src/components/common/ThemeToggle.jsx
// Simple Dark Mode Toggle - Uses UserSettingsContext as single source of truth

import { useUserSettings } from '../../contexts/UserSettingsContext';

const ThemeToggle = ({ className = '' }) => {
  const { isDarkMode, toggleDarkMode } = useUserSettings();

  return (
    <button
      onClick={(e) => toggleDarkMode(e)}
      className={`
        relative w-9 h-9 rounded-lg flex items-center justify-center
        transition-all duration-200 ease-out
        hover:bg-white/20
        focus:outline-none
        ${className}
      `}
      title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {/* Sun Icon */}
      <svg 
        className={`w-5 h-5 absolute transition-all duration-500 ease-out ${
          isDarkMode 
            ? 'opacity-0 rotate-[360deg] scale-0' 
            : 'opacity-100 rotate-0 scale-100'
        }`}
        style={{ color: '#FCD34D' }}
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24"
      >
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth={2} 
          d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" 
        />
      </svg>
      
      {/* Moon Icon */}
      <svg 
        className={`w-5 h-5 absolute transition-all duration-500 ease-out ${
          isDarkMode 
            ? 'opacity-100 rotate-0 scale-100' 
            : 'opacity-0 -rotate-[360deg] scale-0'
        }`}
        style={{ color: '#93C5FD' }}
        fill="currentColor" 
        viewBox="0 0 24 24"
      >
        <path 
          fillRule="evenodd" 
          d="M9.528 1.718a.75.75 0 01.162.819A8.97 8.97 0 009 6a9 9 0 009 9 8.97 8.97 0 003.463-.69.75.75 0 01.981.98 10.503 10.503 0 01-9.694 6.46c-5.799 0-10.5-4.701-10.5-10.5 0-4.368 2.667-8.112 6.46-9.694a.75.75 0 01.818.162z" 
          clipRule="evenodd" 
        />
      </svg>
    </button>
  );
};

export default ThemeToggle;
