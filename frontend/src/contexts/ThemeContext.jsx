// frontend/src/contexts/ThemeContext.jsx
// Global theme context for dark/light mode - reusable across all layouts
// Now with View Transitions API for smooth circular animation

import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext(null);

export const ThemeProvider = ({ children }) => {
  // Initialize from localStorage or system preference
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // Check localStorage first
    const saved = localStorage.getItem('theme');
    if (saved) {
      return saved === 'dark';
    }
    // Fall back to system preference
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // Update document class and localStorage when theme changes
  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  // Listen for system preference changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e) => {
      // Only update if user hasn't set a preference
      if (!localStorage.getItem('theme')) {
        setIsDarkMode(e.matches);
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Toggle theme with View Transitions API animation
  const toggleTheme = (event) => {
    // The actual theme switch function
    const switchTheme = () => {
      setIsDarkMode(prev => !prev);
    };

    // Check if View Transitions API is supported
    if (!document.startViewTransition) {
      // Fallback for browsers that don't support View Transitions
      switchTheme();
      return;
    }

    // Get the click position for the animation origin
    let x = window.innerWidth / 2;
    let y = window.innerHeight / 2;

    if (event) {
      // If it's a mouse event with coordinates
      if (typeof event.clientX === 'number' && typeof event.clientY === 'number') {
        x = event.clientX;
        y = event.clientY;
      }
      // If it's from a button element, get button center
      else if (event.currentTarget) {
        const rect = event.currentTarget.getBoundingClientRect();
        x = rect.left + rect.width / 2;
        y = rect.top + rect.height / 2;
      }
    }

    // Calculate the maximum radius needed to cover the entire screen from click point
    const endRadius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y)
    );

    // Start the view transition
    const transition = document.startViewTransition(() => {
      switchTheme();
    });

    // Once the transition is ready, apply the clip-path animation
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
      // Animation failed, theme still changed via switchTheme()
      console.log('View transition animation failed, but theme was changed');
    });
  };

  const setTheme = (dark) => {
    setIsDarkMode(dark);
  };

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleTheme, setTheme }}>
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
