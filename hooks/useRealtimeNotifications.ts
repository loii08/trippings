import { useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { showToast } from '../toast-system';
import { useNotifications } from './useNotifications';

export const useRealtimeNotifications = (user: any) => {
  const { notifications, markAsRead } = useNotifications(user?.id || '');

  useEffect(() => {
    if (!user) return;

    // Subscribe to real-time notifications for the current user
    const channel = supabase
      .channel(`notifications:user_${user.id}`)
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload: any) => {
        // Handle different types of notifications
        if (payload.eventType === 'INSERT') {
          const newNotification = payload.new as any;
          
          // Only show notification for the current user
          if (newNotification?.user_id === user.id) {
            // Show browser notification if tab is not visible
            if (document.hidden) {
              showBrowserNotification(newNotification.title || 'New Notification', newNotification.body || 'You have a new notification');
            }
            
            // Show in-app toast notification immediately
            showToast(
              newNotification.title || 'New Notification',
              'info'
            );
            
            // Also refresh the notifications list
            if (typeof window !== 'undefined' && (window as any).refreshNotifications) {
              (window as any).refreshNotifications();
            }
          } else {
            // Skip notification for different user
          }
        } else if (payload.eventType === 'UPDATE' && (payload.new as any)?.user_id === user.id) {
          showToast(
            'Notification Updated',
            'info'
          );
        }
      })
      .subscribe();

    // Cleanup subscription on unmount
    return () => {
      supabase.channel(`notifications:user_${user.id}`).unsubscribe();
    };
  }, [user]);

  // Function to show browser notification
  const showBrowserNotification = (title: string, body: string) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: "https://cdn-icons-png.flaticon.com/512/826/826070.png",
        tag: 'trippings-notification',
        requireInteraction: false
      });
    }
  };

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Function to send real-time notification to a specific user
  const sendRealtimeNotification = useCallback(async (userId: string, title: string, body: string, type: 'info' | 'success' | 'error' | 'warning' = 'info', targetId?: string, targetType?: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .insert([{
          user_id: userId,
          title,
          body,
          type: type as any, // Cast to any to handle enum issues
          target_id: targetId,
          target_type: targetType,
          created_at: new Date().toISOString()
        }]);

      if (error) {
        console.error('Error sending real-time notification:', error);
        return false;
      }

      // Trigger real-time broadcast to all connected devices for this user
      const channel = supabase.channel(`broadcast:user_${userId}`);
      channel.send({
        type: 'broadcast',
        event: 'notification',
        payload: {
          type: 'new_notification',
          userId,
          title,
          body,
          notificationType: type,
          targetId,
          targetType,
          timestamp: Date.now()
        }
      });

      return true;
    } catch (error) {
      console.error('Error sending real-time notification:', error);
      return false;
    }
  }, []);

  return { 
    sendRealtimeNotification,
    notifications,
    markAsRead,
    unreadCount: notifications.filter(n => !n.read && !n.cleared).length
  };
};
