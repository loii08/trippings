import { useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

// Global notification store for cross-tab synchronization
interface NotificationStore {
  notifications: any[];
  listeners: ((notification: any) => void)[];
}

const notificationStore: NotificationStore = {
  notifications: [],
  listeners: []
};

// Add notification to store and notify all listeners
export const addNotificationToStore = (notification: any) => {
  notificationStore.notifications.unshift(notification);
  
  // Keep only last 50 notifications
  if (notificationStore.notifications.length > 50) {
    notificationStore.notifications = notificationStore.notifications.slice(0, 50);
  }
  
  // Notify all listeners
  notificationStore.listeners.forEach(listener => listener(notification));
};

// Subscribe to notifications
export const subscribeToNotifications = (callback: (notification: any) => void) => {
  notificationStore.listeners.push(callback);
  
  // Return unsubscribe function
  return () => {
    const index = notificationStore.listeners.indexOf(callback);
    if (index > -1) {
      notificationStore.listeners.splice(index, 1);
    }
  };
};

// Get current notifications
export const getCurrentNotifications = () => {
  return notificationStore.notifications;
};

export const useCrossDeviceNotifications = (user: any) => {
  useEffect(() => {
    if (!user) return;

    // Subscribe to user-specific broadcast channel
    const channel = supabase
      .channel(`broadcast:user_${user.id}`)
      .on('broadcast', (payload) => {
        console.log('Cross-device notification received:', payload);
        
        if (payload.event === 'notification') {
          const notification = payload.payload;
          
          // Add to global store for cross-tab synchronization
          addNotificationToStore({
            id: crypto.randomUUID(),
            userId: notification.userId,
            title: notification.title,
            body: notification.body,
            type: notification.notificationType,
            targetId: notification.targetId,
            targetType: notification.targetType,
            timestamp: notification.timestamp,
            read: false,
            createdAt: new Date().toISOString()
          });
          
          // Show browser notification if tab is not visible
          if (document.hidden && 'Notification' in window && Notification.permission === 'granted') {
            new Notification(notification.title, {
              body: notification.body,
              icon: "https://cdn-icons-png.flaticon.com/512/826/826070.png",
              tag: 'trippings-notification',
              requireInteraction: false
            });
          }
        }
      })
      .subscribe();

    // Cleanup subscription on unmount
    return () => {
      supabase.channel(`broadcast:user_${user.id}`).unsubscribe();
    };
  }, [user]);

  // Listen for storage events (cross-tab synchronization)
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'trippings_notifications') {
        try {
          const notifications = JSON.parse(event.newValue || '[]');
          notificationStore.notifications = notifications;
          
          // Notify listeners about the change
          notifications.forEach((notification: any) => {
            notificationStore.listeners.forEach(listener => listener(notification));
          });
        } catch (error) {
          console.error('Error parsing notifications from storage:', error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Save notifications to localStorage when they change
  useEffect(() => {
    if (notificationStore.notifications.length > 0) {
      try {
        localStorage.setItem('trippings_notifications', JSON.stringify(notificationStore.notifications));
      } catch (error) {
        console.error('Error saving notifications to localStorage:', error);
      }
    }
  }, [notificationStore.notifications.length]);

  // Load notifications from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('trippings_notifications');
      if (saved) {
        const notifications = JSON.parse(saved);
        notificationStore.notifications = notifications;
      }
    } catch (error) {
      console.error('Error loading notifications from localStorage:', error);
    }
  }, []);

  // Subscribe to local notifications
  const subscribe = useCallback((callback: (notification: any) => void) => {
    return subscribeToNotifications(callback);
  }, []);

  return { subscribe, getCurrentNotifications };
};
