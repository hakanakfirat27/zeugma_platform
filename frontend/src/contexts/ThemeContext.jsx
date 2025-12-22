// frontend/src/contexts/ThemeContext.jsx
// Global theme context for dark/light mode - reusable across all layouts
// Now fetches settings from backend API and respects admin configuration
// Auto-detects layout type from URL if not explicitly provided

import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../utils/api';

const ThemeContext = createContext(null);

// Default settings if API fails
const DEFAULT_SETTINGS = {
  layout_type: 'client',
  default_theme: 'system',
  allow_user_toggle: true,
  show_toggle_in_header: true,
  toggle_variant: 'scene',
  sidebar_variant: 'default',
  remember_user_preference: true,
};

// Detect layout type from URL path
const detectLayoutFromPath = (pathname) => {
  if (pathname.startsWith('/client/') || pathname === '/client-dashboard') {
    return 'client';
  }
  if (pathname.startsWith('/data-collector') || pathname.includes('data-collector')) {
    return 'data_collector';
  }
  if (pathname.startsWith('/guest') || pathname === '/guest-dashboard') {
    return 'guest';
  }
  // Default to admin for staff routes
  return 'admin';
};

export const ThemeProvider = ({ children, layoutType: propLayoutType }) => {
  const location = useLocation();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [themeSettings, setThemeSettings] = useState(DEFAULT_SETTINGS);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [allSettings, setAllSettings] = useState(null);

  // Determine layout type from prop or URL
  const layoutType = useMemo(() => {
    if (propLayoutType) return propLayoutType;
    return detectLayoutFromPath(location.pathname);
  }, [propLayoutType, location.pathname]);

  // Fetch all theme settings once on mount
  const fetchAllSettings = useCallback(async () => {
    try {
      const response = await api.get('/dashboard/api/theme-settings/all/');
      setAllSettings(response.data);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch theme settings, using defaults:', error);
      return null;
    }
  }, []);

  // Get settings for current layout from cached settings
  const getSettingsForLayout = useCallback((settings, layout) => {
    if (settings && settings[layout]) {
      return settings[layout];
    }
    return DEFAULT_SETTINGS;
  }, []);

  // Initialize theme based on settings
  const initializeTheme = useCallback((settings, layout) => {
    const layoutSettings = getSettingsForLayout(settings, layout);
    setThemeSettings(layoutSettings);

    // Check if we should remember user preference
    if (layoutSettings.remember_user_preference) {
      const savedTheme = localStorage.getItem(`theme_${layout}`);
      if (savedTheme) {
        setIsDarkMode(savedTheme === 'dark');
        return;
      }
    }

    // Apply default theme from settings
    switch (layoutSettings.default_theme) {
      case 'dark':
        setIsDarkMode(true);
        break;
      case 'light':
        setIsDarkMode(false);
        break;
      case 'system':
      default:
        setIsDarkMode(window.matchMedia('(prefers-color-scheme: dark)').matches);
        break;
    }
  }, [getSettingsForLayout]);

  // Fetch settings on mount
  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      const settings = await fetchAllSettings();
      if (settings) {
        initializeTheme(settings, layoutType);
      }
      setSettingsLoaded(true);
      setIsLoading(false);
    };
    init();
  }, [fetchAllSettings]); // Only run on mount

  // Update theme when layout changes (for SPA navigation)
  useEffect(() => {
    if (allSettings && settingsLoaded) {
      const layoutSettings = getSettingsForLayout(allSettings, layoutType);
      setThemeSettings(layoutSettings);
      
      // Re-check saved preference for new layout
      if (layoutSettings.remember_user_preference) {
        const savedTheme = localStorage.getItem(`theme_${layoutType}`);
        if (savedTheme) {
          setIsDarkMode(savedTheme === 'dark');
        }
      }
    }
  }, [layoutType, allSettings, settingsLoaded, getSettingsForLayout]);

  // Update document class when theme changes
  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    // Save to localStorage if allowed
    if (themeSettings.remember_user_preference) {
      localStorage.setItem(`theme_${layoutType}`, isDarkMode ? 'dark' : 'light');
    }
  }, [isDarkMode, layoutType, themeSettings.remember_user_preference]);

  // Listen for system preference changes
  useEffect(() => {
    if (themeSettings.default_theme !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e) => {
      // Only update if user hasn't set a preference
      const savedTheme = localStorage.getItem(`theme_${layoutType}`);
      if (!savedTheme && themeSettings.remember_user_preference) {
        setIsDarkMode(e.matches);
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [layoutType, themeSettings.default_theme, themeSettings.remember_user_preference]);

  // Toggle theme with View Transitions API animation
  const toggleTheme = (event) => {
    // Check if user is allowed to toggle
    if (!themeSettings.allow_user_toggle) {
      console.log('Theme toggle is disabled by admin');
      return;
    }

    // The actual theme switch function
    const switchTheme = () => {
      setIsDarkMode(prev => !prev);
    };

    // Check if View Transitions API is supported
    if (!document.startViewTransition) {
      switchTheme();
      return;
    }

    // Get the click position for the animation origin
    let x = window.innerWidth / 2;
    let y = window.innerHeight / 2;

    if (event) {
      if (typeof event.clientX === 'number' && typeof event.clientY === 'number') {
        x = event.clientX;
        y = event.clientY;
      } else if (event.currentTarget) {
        const rect = event.currentTarget.getBoundingClientRect();
        x = rect.left + rect.width / 2;
        y = rect.top + rect.height / 2;
      }
    }

    // Calculate the maximum radius needed to cover the entire screen
    const endRadius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y)
    );

    // Start the view transition
    const transition = document.startViewTransition(() => {
      switchTheme();
    });

    // Apply the clip-path animation
    transition.ready.then(() => {
      document.documentElement.animate(
        {
          clipPath: [
            `circle(0px at ${x}px ${y}px)`,
            `circle(${endRadius}px at ${x}px ${y}px)`
          ]
        },
        {
          duration: 600,
          easing: 'ease-out',
          pseudoElement: '::view-transition-new(root)'
        }
      );
    }).catch(() => {
      console.log('View transition animation failed, but theme was changed');
    });
  };

  // Force set theme (ignores admin restrictions - for testing)
  const setTheme = (dark) => {
    setIsDarkMode(dark);
  };

  // Refresh settings from API
  const refreshSettings = async () => {
    const settings = await fetchAllSettings();
    if (settings) {
      initializeTheme(settings, layoutType);
    }
  };

  return (
    <ThemeContext.Provider value={{ 
      isDarkMode, 
      toggleTheme, 
      setTheme,
      themeSettings,
      settingsLoaded,
      isLoading,
      refreshSettings,
      layoutType,
      // Convenience getters
      canToggle: themeSettings.allow_user_toggle,
      showToggle: themeSettings.show_toggle_in_header,
      toggleVariant: themeSettings.toggle_variant,
      sidebarVariant: themeSettings.sidebar_variant,
    }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export default ThemeContext;
