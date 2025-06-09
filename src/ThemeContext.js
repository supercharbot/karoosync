import React, { createContext, useContext, useState, useEffect } from 'react';
import { fetchUserAttributes } from 'aws-amplify/auth';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

// Function to detect system preference
const getSystemTheme = () => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
};

export const ThemeProvider = ({ children }) => {
  const [darkMode, setDarkModeState] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load theme preference from Cognito on mount
  // Since this only runs after user is authenticated, we can be more confident
  useEffect(() => {
    const loadThemeFromCognito = async () => {
      try {
        console.log('🌙 Loading theme from Cognito (user is authenticated)...');
        
        // Give a small delay to ensure auth is fully ready
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const attributes = await fetchUserAttributes();
        console.log('📋 User attributes loaded:', Object.keys(attributes));
        
        const darkModeValue = attributes['custom:dark_mode'];
        console.log('🌙 Raw dark mode value from Cognito:', darkModeValue);
        
        // Parse the stored value
        let savedTheme;
        if (darkModeValue === 'true') {
          savedTheme = true;
        } else if (darkModeValue === 'false') {
          savedTheme = false;
        } else {
          // If no preference saved, use system preference
          savedTheme = getSystemTheme();
          console.log('🌙 No saved preference, using system preference:', savedTheme);
        }
        
        console.log('✅ Final theme from Cognito:', savedTheme);
        setDarkModeState(savedTheme);
        
        // Apply theme immediately
        if (savedTheme) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
        console.log('🎨 Theme applied immediately:', savedTheme ? 'dark' : 'light');
        
      } catch (error) {
        console.error('❌ Failed to load theme from Cognito:', error);
        // Fallback to system preference
        const systemTheme = getSystemTheme();
        console.log('🌙 Using system preference as fallback:', systemTheme);
        setDarkModeState(systemTheme);
        
        // Apply theme immediately
        if (systemTheme) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
        console.log('🎨 Fallback theme applied immediately:', systemTheme ? 'dark' : 'light');
      } finally {
        setIsLoaded(true);
        console.log('✅ Theme loading complete');
      }
    };

    loadThemeFromCognito();
  }, []);

  // Apply theme to document
  useEffect(() => {
    if (!isLoaded) {
      console.log('⏳ Waiting for theme to load...');
      return;
    }
    
    console.log('🎨 Applying theme:', darkMode ? 'dark' : 'light');
    
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode, isLoaded]);

  const setDarkMode = (newDarkMode) => {
    console.log('🌙 Setting dark mode to:', newDarkMode);
    setDarkModeState(newDarkMode);
  };

  const toggleDarkMode = () => {
    console.log('🌙 Toggling dark mode from:', darkMode, 'to:', !darkMode);
    setDarkMode(!darkMode);
  };

  const value = {
    darkMode,
    setDarkMode,
    toggleDarkMode,
    isLoaded
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};