
import { useState, useEffect, useCallback } from 'react';
import { UserSettings, ThemeMode } from '../types';

const SETTINGS_KEY = 'trippings_settings';

const DEFAULT_SETTINGS: UserSettings = {
  currency: 'PHP',
  currencySymbol: '₱',
  theme: 'system',
  pushNotifications: false,
};

export const useSettings = () => {
  const [settings, setSettings] = useState<UserSettings>(() => {
    const saved = localStorage.getItem(SETTINGS_KEY);
    return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
  });

  const applyTheme = useCallback((theme: ThemeMode) => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');

    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      root.classList.add(systemTheme);
    } else {
      root.classList.add(theme);
    }
  }, []);

  // Persist settings and apply theme on change
  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    applyTheme(settings.theme);
  }, [settings, applyTheme]);

  // Synchronize with system theme changes in real-time if 'system' is selected
  useEffect(() => {
    if (settings.theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => applyTheme('system');
      
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [settings.theme, applyTheme]);

  /**
   * Helper to send a browser notification if enabled
   */
  const sendNotification = useCallback((title: string, options?: NotificationOptions) => {
    if (settings.pushNotifications && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(title, {
          icon: "https://cdn-icons-png.flaticon.com/512/826/826070.png",
          ...options
        });
      } catch (e) {
        console.error("Failed to send notification", e);
      }
    }
  }, [settings.pushNotifications]);

  const updateSettings = async (updates: Partial<UserSettings>) => {
    let finalUpdates = { ...updates };

    // Handle Push Notifications Toggle
    if (updates.pushNotifications === true && !settings.pushNotifications) {
      if (!('Notification' in window)) {
        console.warn('Notifications not supported in this browser');
        finalUpdates.pushNotifications = false;
        alert("Your browser does not support desktop notifications.");
      } else if (Notification.permission === 'denied') {
        alert("Notification permission was previously denied. Please reset permissions in your browser settings to enable this feature.");
        finalUpdates.pushNotifications = false;
      } else {
        try {
          const permission = await Notification.requestPermission();
          if (permission !== 'granted') {
            finalUpdates.pushNotifications = false;
          } else {
            // Success notification
            new Notification("Trippings", {
              body: "Notifications are now enabled! You'll stay updated on your adventures.",
              icon: "https://cdn-icons-png.flaticon.com/512/826/826070.png"
            });
          }
        } catch (error) {
          console.error('Error requesting notification permission:', error);
          finalUpdates.pushNotifications = false;
        }
      }
    }

    setSettings(prev => ({ ...prev, ...finalUpdates }));
  };

  return { settings, updateSettings, sendNotification };
};
