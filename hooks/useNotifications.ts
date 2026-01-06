import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { db } from '../db/db';
import { AppNotification } from '../types';
import { useRealtimeSync } from './useRealtimeSync';

export const useNotifications = (userId: string) => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  // Setup real-time sync for notifications
  const { syncNotifications } = useRealtimeSync({
    userId,
    userEmail: '',
    onNotificationChange: setNotifications
  });

  // Fetch initial notifications
  const fetchNotifications = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    
    try {
      // Try Supabase first if online
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      const mappedNotifications = (data || []).map(n => ({
        id: n.id,
        userId: n.user_id,
        title: n.title,
        body: n.body,
        timestamp: new Date(n.created_at).getTime(),
        read: n.read || false,
        cleared: n.cleared || false,
        type: n.type,
        targetId: n.target_id,
        targetType: n.target_type
      }));

      // Update IndexedDB
      await Promise.all(mappedNotifications.map(notification => db.notifications.put(notification)));
      
      setNotifications(mappedNotifications);
    } catch (error) {
      console.warn('Supabase fetch failed, falling back to IndexedDB:', error);
      
      // Fallback to IndexedDB
      const localNotifications = await db.notifications
        .where('userId')
        .equals(userId)
        .limit(50)
        .reverse()
        .toArray();
      
      setNotifications(localNotifications);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      // Update local state immediately
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
      
      // Update IndexedDB
      await db.notifications.update(notificationId, { read: true });
      
      // Update Supabase
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  }, []);

  // Clear notification
  const clearNotification = useCallback(async (notificationId: string) => {
    try {
      // Update local state immediately
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      
      // Update IndexedDB
      await db.notifications.update(notificationId, { cleared: true });
      
      // Update Supabase
      await supabase
        .from('notifications')
        .update({ cleared: true })
        .eq('id', notificationId);
    } catch (error) {
      console.error('Failed to clear notification:', error);
    }
  }, []);

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    try {
      const unreadNotifications = notifications.filter(n => !n.read);
      
      // Update local state immediately
      setNotifications(prev => 
        prev.map(n => ({ ...n, read: true }))
      );
      
      // Update IndexedDB
      await Promise.all(
        unreadNotifications.map(n => db.notifications.update(n.id, { read: true }))
      );
      
      // Update Supabase
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', userId)
        .eq('read', false);
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  }, [userId, notifications]);

  // Get unread count
  const unreadCount = notifications.filter(n => !n.read && !n.cleared).length;

  return {
    notifications,
    loading,
    unreadCount,
    markAsRead,
    clearNotification,
    markAllAsRead,
    refresh: fetchNotifications,
    syncNotifications
  };
};
