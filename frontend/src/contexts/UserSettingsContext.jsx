// frontend/src/contexts/UserSettingsContext.jsx
// User-specific settings context that persists preferences per user
// Single source of truth for theme (dark/light mode) and user preferences

import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from './AuthContext';
import api from '../utils/api';

const UserSettingsContext = createContext(null);

// Default settings - dark sidebar, purple haze header
const DEFAULT_USER_SETTINGS = {
  // Theme Settings
  theme_mode: 'system',
  header_color_scheme: 'purple_haze',
  sidebar_color_scheme: 'dark',
  sidebar_collapsed: false,
  // Notification Settings
  email_notifications: true,
  push_notifications: true,
  inapp_notifications: true,
  notification_sound: false,
  // UI Settings
  animation_enabled: true,
  compact_mode: false,
  high_contrast: false,
};

// Extended color scheme mappings (matching Architect UI style)
const COLOR_SCHEMES = {
  // Primary solid colors
  default: {
    primary: '#6366F1',
    secondary: '#9333EA',
    gradient: 'linear-gradient(to bottom right, #6366F1, #9333EA)',
  },
  dark: {
    primary: '#000000',
    secondary: '#1F2937',
    gradient: 'linear-gradient(135deg, #000000 0%, #1F2937 100%)',
  },
  slate: {
    primary: '#475569',
    secondary: '#64748B',
    gradient: 'linear-gradient(135deg, #475569 0%, #64748B 100%)',
  },
  midnight: {
    primary: '#1E3A5F',
    secondary: '#2C5282',
    gradient: 'linear-gradient(135deg, #1E3A5F 0%, #2C5282 100%)',
  },
  ocean: {
    primary: '#0EA5E9',
    secondary: '#06B6D4',
    gradient: 'linear-gradient(135deg, #0EA5E9 0%, #06B6D4 100%)',
  },
  forest: {
    primary: '#059669',
    secondary: '#10B981',
    gradient: 'linear-gradient(135deg, #059669 0%, #10B981 100%)',
  },
  sunset: {
    primary: '#F97316',
    secondary: '#EF4444',
    gradient: 'linear-gradient(135deg, #F97316 0%, #EF4444 100%)',
  },
  lavender: {
    primary: '#A78BFA',
    secondary: '#C4B5FD',
    gradient: 'linear-gradient(135deg, #A78BFA 0%, #C4B5FD 100%)',
    isLight: true,
  },
  rose: {
    primary: '#F43F5E',
    secondary: '#FB7185',
    gradient: 'linear-gradient(135deg, #F43F5E 0%, #FB7185 100%)',
  },
  amber: {
    primary: '#F59E0B',
    secondary: '#FBBF24',
    gradient: 'linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%)',
    isLight: true,
  },
  purple: {
    primary: '#8B5CF6',
    secondary: '#A78BFA',
    gradient: 'linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%)',
  },
  teal: {
    primary: '#14B8A6',
    secondary: '#2DD4BF',
    gradient: 'linear-gradient(135deg, #14B8A6 0%, #2DD4BF 100%)',
  },
  pink: {
    primary: '#EC4899',
    secondary: '#F472B6',
    gradient: 'linear-gradient(135deg, #EC4899 0%, #F472B6 100%)',
  },
  lime: {
    primary: '#84CC16',
    secondary: '#A3E635',
    gradient: 'linear-gradient(135deg, #84CC16 0%, #A3E635 100%)',
    isLight: true,
  },
  cyan: {
    primary: '#06B6D4',
    secondary: '#22D3EE',
    gradient: 'linear-gradient(135deg, #06B6D4 0%, #22D3EE 100%)',
  },
  stone: {
    primary: '#78716C',
    secondary: '#A8A29E',
    gradient: 'linear-gradient(135deg, #78716C 0%, #A8A29E 100%)',
  },
  emerald: {
    primary: '#10B981',
    secondary: '#34D399',
    gradient: 'linear-gradient(135deg, #10B981 0%, #34D399 100%)',
  },
  sky: {
    primary: '#38BDF8',
    secondary: '#7DD3FC',
    gradient: 'linear-gradient(135deg, #38BDF8 0%, #7DD3FC 100%)',
    isLight: true,
  },
  violet: {
    primary: '#7C3AED',
    secondary: '#A78BFA',
    gradient: 'linear-gradient(135deg, #7C3AED 0%, #A78BFA 100%)',
  },
  fuchsia: {
    primary: '#D946EF',
    secondary: '#E879F9',
    gradient: 'linear-gradient(135deg, #D946EF 0%, #E879F9 100%)',
  },
  coral: {
    primary: '#FF6B6B',
    secondary: '#FFA07A',
    gradient: 'linear-gradient(135deg, #FF6B6B 0%, #FFA07A 100%)',
  },
  gold: {
    primary: '#EAB308',
    secondary: '#FACC15',
    gradient: 'linear-gradient(135deg, #EAB308 0%, #FACC15 100%)',
    isLight: true,
  },
  navy: {
    primary: '#1E40AF',
    secondary: '#3B82F6',
    gradient: 'linear-gradient(135deg, #1E40AF 0%, #3B82F6 100%)',
  },
  charcoal: {
    primary: '#374151',
    secondary: '#4B5563',
    gradient: 'linear-gradient(135deg, #374151 0%, #4B5563 100%)',
  },
  lightblue: {
    primary: '#93C5FD',
    secondary: '#BFDBFE',
    gradient: 'linear-gradient(135deg, #93C5FD 0%, #BFDBFE 100%)',
    isLight: true,
  },
  lightgreen: {
    primary: '#86EFAC',
    secondary: '#BBF7D0',
    gradient: 'linear-gradient(135deg, #86EFAC 0%, #BBF7D0 100%)',
    isLight: true,
  },
  lightpink: {
    primary: '#FBCFE8',
    secondary: '#FCE7F3',
    gradient: 'linear-gradient(135deg, #FBCFE8 0%, #FCE7F3 100%)',
    isLight: true,
  },
  lightyellow: {
    primary: '#FDE68A',
    secondary: '#FEF3C7',
    gradient: 'linear-gradient(135deg, #FDE68A 0%, #FEF3C7 100%)',
    isLight: true,
  },
  lightpurple: {
    primary: '#DDD6FE',
    secondary: '#EDE9FE',
    gradient: 'linear-gradient(135deg, #DDD6FE 0%, #EDE9FE 100%)',
    isLight: true,
  },
  lightcyan: {
    primary: '#A5F3FC',
    secondary: '#CFFAFE',
    gradient: 'linear-gradient(135deg, #A5F3FC 0%, #CFFAFE 100%)',
    isLight: true,
  },
  lightorange: {
    primary: '#FED7AA',
    secondary: '#FFEDD5',
    gradient: 'linear-gradient(135deg, #FED7AA 0%, #FFEDD5 100%)',
    isLight: true,
  },
  lightgray: {
    primary: '#E5E7EB',
    secondary: '#F3F4F6',
    gradient: 'linear-gradient(135deg, #E5E7EB 0%, #F3F4F6 100%)',
    isLight: true,
  },
  crimson: {
    primary: '#DC2626',
    secondary: '#EF4444',
    gradient: 'linear-gradient(135deg, #DC2626 0%, #EF4444 100%)',
  },
  indigo: {
    primary: '#4F46E5',
    secondary: '#6366F1',
    gradient: 'linear-gradient(135deg, #4F46E5 0%, #6366F1 100%)',
  },
  deepblue: {
    primary: '#1D4ED8',
    secondary: '#3B82F6',
    gradient: 'linear-gradient(135deg, #1D4ED8 0%, #3B82F6 100%)',
  },
  deeppurple: {
    primary: '#7E22CE',
    secondary: '#A855F7',
    gradient: 'linear-gradient(135deg, #7E22CE 0%, #A855F7 100%)',
  },
  deepteal: {
    primary: '#0D9488',
    secondary: '#14B8A6',
    gradient: 'linear-gradient(135deg, #0D9488 0%, #14B8A6 100%)',
  },
  deepgreen: {
    primary: '#15803D',
    secondary: '#22C55E',
    gradient: 'linear-gradient(135deg, #15803D 0%, #22C55E 100%)',
  },
  bronze: {
    primary: '#A16207',
    secondary: '#CA8A04',
    gradient: 'linear-gradient(135deg, #A16207 0%, #CA8A04 100%)',
  },
  maroon: {
    primary: '#881337',
    secondary: '#BE185D',
    gradient: 'linear-gradient(135deg, #881337 0%, #BE185D 100%)',
  },
  royalblue: {
    primary: '#4169E1',
    secondary: '#6495ED',
    gradient: 'linear-gradient(135deg, #4169E1 0%, #6495ED 100%)',
  },
  hotpink: {
    primary: '#FF69B4',
    secondary: '#FFB6C1',
    gradient: 'linear-gradient(135deg, #FF69B4 0%, #FFB6C1 100%)',
    isLight: true,
  },
  turquoise: {
    primary: '#40E0D0',
    secondary: '#7FFFD4',
    gradient: 'linear-gradient(135deg, #40E0D0 0%, #7FFFD4 100%)',
    isLight: true,
  },
  salmon: {
    primary: '#FA8072',
    secondary: '#FFA07A',
    gradient: 'linear-gradient(135deg, #FA8072 0%, #FFA07A 100%)',
    isLight: true,
  },
  orchid: {
    primary: '#DA70D6',
    secondary: '#EE82EE',
    gradient: 'linear-gradient(135deg, #DA70D6 0%, #EE82EE 100%)',
  },
  seagreen: {
    primary: '#2E8B57',
    secondary: '#3CB371',
    gradient: 'linear-gradient(135deg, #2E8B57 0%, #3CB371 100%)',
  },
  steelblue: {
    primary: '#4682B4',
    secondary: '#5F9EA0',
    gradient: 'linear-gradient(135deg, #4682B4 0%, #5F9EA0 100%)',
  },
  tomato: {
    primary: '#FF6347',
    secondary: '#FF7F50',
    gradient: 'linear-gradient(135deg, #FF6347 0%, #FF7F50 100%)',
  },
  aurora: {
    primary: '#667eea',
    secondary: '#f093fb',
    gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
  },
  sunset_glow: {
    primary: '#fa709a',
    secondary: '#fee140',
    gradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  },
  ocean_breeze: {
    primary: '#2193b0',
    secondary: '#6dd5ed',
    gradient: 'linear-gradient(135deg, #2193b0 0%, #6dd5ed 100%)',
  },
  purple_haze: {
    primary: '#7f00ff',
    secondary: '#e100ff',
    gradient: 'linear-gradient(135deg, #7f00ff 0%, #e100ff 100%)',
  },
  fresh_mint: {
    primary: '#00b09b',
    secondary: '#96c93d',
    gradient: 'linear-gradient(135deg, #00b09b 0%, #96c93d 100%)',
  },
  warm_flame: {
    primary: '#ff9a9e',
    secondary: '#fecfef',
    gradient: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
    isLight: true,
  },
  cool_blues: {
    primary: '#2196f3',
    secondary: '#21cbf3',
    gradient: 'linear-gradient(135deg, #2196f3 0%, #21cbf3 100%)',
  },
  night_fade: {
    primary: '#a18cd1',
    secondary: '#fbc2eb',
    gradient: 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
    isLight: true,
  },
};

// Helper function to apply dark mode to document
const applyDarkMode = (shouldBeDark) => {
  if (shouldBeDark) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
};

// Helper function to determine if dark mode should be active
const shouldBeDarkMode = (themeMode) => {
  switch (themeMode) {
    case 'dark':
      return true;
    case 'light':
      return false;
    case 'system':
    default:
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
};

export const UserSettingsProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [settings, setSettings] = useState(DEFAULT_USER_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => shouldBeDarkMode('system'));

  // Fetch user settings from API
  const fetchSettings = useCallback(async () => {
    if (!isAuthenticated || !user) {
      setSettings(DEFAULT_USER_SETTINGS);
      setLoading(false);
      setInitialized(true);
      return;
    }

    try {
      setLoading(true);
      const response = await api.get('/accounts/user/settings/');
      const newSettings = { ...DEFAULT_USER_SETTINGS, ...response.data };
      setSettings(newSettings);
      
      // Apply theme mode from fetched settings
      const dark = shouldBeDarkMode(newSettings.theme_mode);
      setIsDarkMode(dark);
      applyDarkMode(dark);
    } catch (error) {
      console.error('Failed to fetch user settings:', error);
      setSettings(DEFAULT_USER_SETTINGS);
    } finally {
      setLoading(false);
      setInitialized(true);
    }
  }, [isAuthenticated, user]);

  // Apply theme mode - called when theme_mode changes
  const applyThemeMode = useCallback((mode) => {
    const dark = shouldBeDarkMode(mode);
    setIsDarkMode(dark);
    applyDarkMode(dark);
  }, []);

  // Update a single setting
  const updateSetting = useCallback(async (key, value) => {
    // Optimistic update
    setSettings(prev => ({ ...prev, [key]: value }));

    // If updating theme_mode, immediately apply it
    if (key === 'theme_mode') {
      applyThemeMode(value);
    }

    if (!isAuthenticated) return;

    try {
      await api.patch('/accounts/user/settings/', { [key]: value });
    } catch (error) {
      console.error('Failed to update setting:', error);
      fetchSettings();
    }
  }, [fetchSettings, isAuthenticated, applyThemeMode]);

  // Update multiple settings at once
  const updateSettings = useCallback(async (updates) => {
    // Optimistic update
    setSettings(prev => ({ ...prev, ...updates }));

    // If updating theme_mode, immediately apply it
    if (updates.theme_mode !== undefined) {
      applyThemeMode(updates.theme_mode);
    }

    if (!isAuthenticated) return;

    try {
      await api.patch('/accounts/user/settings/', updates);
    } catch (error) {
      console.error('Failed to update settings:', error);
      fetchSettings();
    }
  }, [fetchSettings, isAuthenticated, applyThemeMode]);

  // Reset to defaults
  const resetToDefaults = useCallback(async () => {
    if (!isAuthenticated) {
      setSettings(DEFAULT_USER_SETTINGS);
      applyThemeMode(DEFAULT_USER_SETTINGS.theme_mode);
      return;
    }

    try {
      const response = await api.post('/accounts/user/settings/reset/');
      const newSettings = { ...DEFAULT_USER_SETTINGS, ...response.data };
      setSettings(newSettings);
      applyThemeMode(newSettings.theme_mode);
    } catch (error) {
      console.error('Failed to reset settings:', error);
    }
  }, [isAuthenticated, applyThemeMode]);

  // Listen for system theme changes when in system mode
  useEffect(() => {
    if (settings.theme_mode !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e) => {
      setIsDarkMode(e.matches);
      applyDarkMode(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [settings.theme_mode]);

  // Fetch settings when user changes
  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // Toggle dark mode (used by header toggle button)
  const toggleDarkMode = useCallback((event) => {
    const newMode = isDarkMode ? 'light' : 'dark';
    const newDarkState = newMode === 'dark';
    
    // Function to apply the theme change
    const applyChange = () => {
      setIsDarkMode(newDarkState);
      applyDarkMode(newDarkState);
      // Update settings in background (don't wait for it)
      if (isAuthenticated) {
        api.patch('/accounts/user/settings/', { theme_mode: newMode }).catch(() => {});
      }
      setSettings(prev => ({ ...prev, theme_mode: newMode }));
    };

    // Check if View Transitions API is supported
    if (!document.startViewTransition) {
      applyChange();
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

    // Start the view transition - DOM change happens INSIDE the callback
    const transition = document.startViewTransition(() => {
      applyChange();
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
  }, [isDarkMode, isAuthenticated]);

  // Get color scheme data
  const getColorScheme = useCallback((schemeId) => {
    return COLOR_SCHEMES[schemeId] || COLOR_SCHEMES.slate;
  }, []);

  // Dark mode gradient for sidebar when in dark mode
  const DARK_MODE_SIDEBAR_GRADIENT = 'linear-gradient(135deg, #000000 0%, #111827 100%)';
  const DARK_MODE_HEADER_GRADIENT = 'linear-gradient(135deg, #000000 0%, #1F2937 100%)';

  // Computed values - now dark mode aware
  const headerGradient = useMemo(() => {
    if (isDarkMode) {
      return DARK_MODE_HEADER_GRADIENT;
    }
    return getColorScheme(settings.header_color_scheme).gradient;
  }, [settings.header_color_scheme, getColorScheme, isDarkMode]);

  const sidebarGradient = useMemo(() => {
    if (isDarkMode) {
      return DARK_MODE_SIDEBAR_GRADIENT;
    }
    return getColorScheme(settings.sidebar_color_scheme).gradient;
  }, [settings.sidebar_color_scheme, getColorScheme, isDarkMode]);

  const headerColors = useMemo(() => {
    if (isDarkMode) {
      return { primary: '#000000', secondary: '#1F2937', gradient: DARK_MODE_HEADER_GRADIENT, isLight: false };
    }
    return getColorScheme(settings.header_color_scheme);
  }, [settings.header_color_scheme, getColorScheme, isDarkMode]);

  const sidebarColors = useMemo(() => {
    if (isDarkMode) {
      return { primary: '#000000', secondary: '#111827', gradient: DARK_MODE_SIDEBAR_GRADIENT, isLight: false };
    }
    return getColorScheme(settings.sidebar_color_scheme);
  }, [settings.sidebar_color_scheme, getColorScheme, isDarkMode]);

  const headerIsLight = useMemo(() => {
    if (isDarkMode) return false;
    return getColorScheme(settings.header_color_scheme).isLight === true;
  }, [settings.header_color_scheme, getColorScheme, isDarkMode]);

  const sidebarIsLight = useMemo(() => {
    if (isDarkMode) return false;
    return getColorScheme(settings.sidebar_color_scheme).isLight === true;
  }, [settings.sidebar_color_scheme, getColorScheme, isDarkMode]);

  const value = {
    // Settings
    settings,
    loading,
    initialized,
    
    // Theme state
    isDarkMode,
    toggleDarkMode,
    themeMode: settings.theme_mode,
    
    // Color schemes
    COLOR_SCHEMES,
    getColorScheme,
    
    // Computed styles
    headerGradient,
    sidebarGradient,
    headerColors,
    sidebarColors,
    headerColorScheme: settings.header_color_scheme,
    sidebarColorScheme: settings.sidebar_color_scheme,
    headerIsLight,
    sidebarIsLight,
    
    // Notification settings
    emailNotifications: settings.email_notifications,
    pushNotifications: settings.push_notifications,
    inappNotifications: settings.inapp_notifications,
    notificationSound: settings.notification_sound,
    
    // UI settings
    sidebarCollapsed: settings.sidebar_collapsed,
    animationEnabled: settings.animation_enabled,
    
    // Actions
    updateSetting,
    updateSettings,
    resetToDefaults,
    refreshSettings: fetchSettings,
  };

  return (
    <UserSettingsContext.Provider value={value}>
      {children}
    </UserSettingsContext.Provider>
  );
};

export const useUserSettings = () => {
  const context = useContext(UserSettingsContext);
  if (!context) {
    throw new Error('useUserSettings must be used within a UserSettingsProvider');
  }
  return context;
};

export default UserSettingsContext;
