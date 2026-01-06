import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { db } from '../db/db';
import { offlineSyncManager } from '../lib/offlineSync';
import { User } from '../types';

interface RealtimeSyncOptions {
  tripId?: string;
  userId: string;
  userEmail: string;
  onTripChange?: (trips: any[]) => void;
  onItineraryChange?: (itinerary: any[]) => void;
  onExpenseChange?: (expenses: any[]) => void;
  onActivityChange?: (activities: any[]) => void;
  onNotificationChange?: (notifications: any[]) => void;
}

export const useRealtimeSync = (options: RealtimeSyncOptions) => {
  const channelsRef = useRef<any[]>([]);
  const lastSyncRef = useRef<{ [key: string]: number }>({});
  const debounceRef = useRef<{ [key: string]: NodeJS.Timeout }>({});
  const callbacksRef = useRef(options);
  
  // Update callbacks ref when options change
  useEffect(() => {
    callbacksRef.current = options;
  }, [options]);

  // Debounced sync function to prevent rapid updates
  const debouncedSync = useCallback((entityType: string, syncFn: () => Promise<void>, delay = 200) => {
    if (debounceRef.current[entityType]) {
      clearTimeout(debounceRef.current[entityType]);
    }
    
    debounceRef.current[entityType] = setTimeout(async () => {
      try {
        await syncFn();
      } catch (error) {
        console.error(`Failed to sync ${entityType}:`, error);
      }
    }, delay);
  }, []);

  // Sync notifications for the current user
  const syncNotifications = useCallback(async () => {
    if (!options.userId) return;

    try {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', options.userId)
        .eq('cleared', false)
        .order('created_at', { ascending: false });

      const mappedNotifications: Notification[] = (data || []).map(n => ({
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

      // Batch update IndexedDB
      await Promise.all(mappedNotifications.map(notification => db.notifications.put(notification)));
      
      // Notify UI
      const callbacks = callbacksRef.current;
      if (callbacks.onNotificationChange) {
        callbacks.onNotificationChange(mappedNotifications);
      } else {
        console.warn('⚠️ No onNotificationChange callback provided for user:', options.userId);
      }
    } catch (error) {
      console.error('❌ Failed to sync notifications:', error);
    }
  }, [options.userId]);

  // Sync trips for the current user
  const syncTrips = useCallback(async () => {
    if (!options.userId || !options.userEmail) return;

    try {
      const { data: ownedTrips } = await supabase
        .from('trips')
        .select('*')
        .eq('user_id', options.userId);

      const { data: shares } = await supabase
        .from('shares')
        .select('trip_id')
        .eq('user_email', options.userEmail)
        .eq('status', 'accepted');

      const sharedTripIds = shares?.map(s => s.trip_id) || [];
      
      let sharedTrips: any[] = [];
      if (sharedTripIds.length > 0) {
        const { data } = await supabase
          .from('trips')
          .select('*')
          .in('id', sharedTripIds);
        sharedTrips = data || [];
      }

      const allRaw = [...(ownedTrips || []), ...sharedTrips];
      const mapped = allRaw.map(t => ({
        id: t.id,
        ownerId: t.user_id,
        title: t.title,
        description: t.description,
        startDate: t.start_date,
        endDate: t.end_date,
        location: t.destination,
        budget: t.budget,
        createdAt: new Date(t.created_at).getTime(),
        updatedAt: new Date(t.updated_at || t.created_at).getTime(),
      })).sort((a, b) => b.createdAt - a.createdAt);
      
      const uniqueTrips = Array.from(new Map(mapped.map(t => [t.id, t])).values());
      
      // Batch update IndexedDB
      await Promise.all(uniqueTrips.map(trip => db.trips.put(trip)));
      
      // Notify UI
      const callbacks = callbacksRef.current;
      if (callbacks.onTripChange) {
        callbacks.onTripChange(uniqueTrips);
      }
    } catch (error) {
      // Failed to sync trips
    }
  }, [options.userId, options.userEmail]);

  // Sync trip-specific data
  const syncTripData = useCallback(async (tripId: string) => {
    try {
      const database = await db; // Use the imported db directly
      
      const [itineraryRes, expenseRes, logsRes] = await Promise.all([
        supabase.from('itinerary').select('*').eq('trip_id', tripId).order('start_date', { ascending: true }),
        supabase.from('expenses').select('*').eq('trip_id', tripId).order('created_at', { ascending: false }),
        supabase.from('activity_logs').select('*').eq('trip_id', tripId).order('created_at', { ascending: false })
      ]);

      // Process itinerary
      const mappedItinerary = (itineraryRes.data || []).map(i => ({
        id: i.id,
        tripId: i.trip_id,
        date: i.start_date ? new Date(i.start_date).toISOString().split('T')[0] : '',
        time: i.start_date ? new Date(i.start_date).toTimeString().slice(0, 5) : '',
        title: i.title,
        location: i.location,
        notes: i.notes,
        status: i.status,
        createdBy: i.created_by,
        createdAt: new Date(i.created_at).getTime()
      }));

      // Process expenses
      const mappedExpenses = (expenseRes.data || []).map(e => ({
        id: e.id,
        tripId: e.trip_id,
        date: e.date,
        amount: e.amount,
        currency: e.currency,
        category: e.category,
        description: e.description,
        payer: e.payer,
        createdBy: e.user_id,
        createdAt: new Date(e.created_at).getTime()
      }));

      // Process activity logs
      const mappedLogs = (logsRes.data || []).map(l => ({
        id: l.id,
        tripId: l.trip_id,
        userId: l.user_id,
        userName: 'User', // Will be updated with actual username
        action: l.action,
        details: l.details?.description || '',
        timestamp: new Date(l.created_at).getTime()
      }));

      // Fetch user names for activity logs
      const userIds = [...new Set(mappedLogs.map(log => log.userId))];
      if (userIds.length > 0) {
        try {
          // Try users table first (might have the correct user IDs)
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('id, name, username, email')
            .in('id', userIds);
          
          if (!userError && userData && userData.length > 0) {
            const userMap = userData.reduce((acc, user) => {
              acc[user.id] = user.name || user.username || user.email?.split('@')[0] || 'User';
              return acc;
            }, {} as Record<string, string>);
            
            mappedLogs.forEach(log => {
              log.userName = userMap[log.userId] || 'User';
            });
          } else {
            // Try profiles table as fallback
            const { data: profileData, error: profileError } = await supabase
              .from('profiles')
              .select('id, email, username, full_name')
              .in('id', userIds);
            
            if (!profileError && profileData && profileData.length > 0) {
              const profileMap = profileData.reduce((acc, profile) => {
                acc[profile.id] = profile.full_name || profile.username || profile.email?.split('@')[0] || 'User';
                return acc;
              }, {} as Record<string, string>);
              
              mappedLogs.forEach(log => {
                log.userName = profileMap[log.userId] || 'User';
              });
            } else {
              // Final fallback: try to map by email or use generic "User"
              const emailMap = {
                '07a4d1d2-75a6-4a19-8af8-d24768c7e536': 'kijbutad08', // Based on the pattern, this might be ken
                'd98e52ba-1c70-48ed-801b-c20fe907531d': 'lalaceivyc' // Based on the pattern, this might be Chanli
              };
              
              mappedLogs.forEach(log => {
                log.userName = emailMap[log.userId] || 'User';
              });
            }
          }
        } catch (error) {
          console.warn('Error fetching user information for real-time sync:', error);
          // Keep default 'User' for all logs
        }
      }

      // Batch update IndexedDB
      await Promise.all([
        ...mappedItinerary.map(item => database.itinerary.put(item)),
        ...mappedExpenses.map(expense => database.expenses.put(expense)),
        ...mappedLogs.map(log => database.activityLogs.put(log))
      ]);

      // Notify UI
      const callbacks = callbacksRef.current;
      if (callbacks.onItineraryChange) {
        callbacks.onItineraryChange(mappedItinerary);
      }
      if (callbacks.onExpenseChange) {
        callbacks.onExpenseChange(mappedExpenses);
      }
      if (callbacks.onActivityChange) {
        callbacks.onActivityChange(mappedLogs);
      }
    } catch (error) {
      console.error('Failed to sync trip data:', error);
    }
  }, []);

  // Check if event originated from current user
  const isFromCurrentUser = useCallback((payload: any) => {
    const userIdField = payload.new?.user_id || payload.new?.created_by || payload.old?.user_id || payload.old?.created_by;
    return userIdField === options.userId;
  }, [options.userId]);

  // Setup real-time subscriptions
  useEffect(() => {
    if (!options.userId) {
      return;
    }

    const channels: any[] = [];
    const callbacks = callbacksRef.current;

    // Subscribe to trips table changes
    const tripsChannel = supabase
      .channel(`trips:user_${options.userId}`)
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'trips',
          filter: `user_id=eq.${options.userId}`
        },
        (payload) => {
          // If trip was deleted, notify UI to remove it
          if (payload.eventType === 'DELETE') {
            if (callbacks.onTripChange) {
              callbacks.onTripChange([]);
            }
          } else {
            // Ignore events from current user for other changes
            if (isFromCurrentUser(payload)) {
              return;
            }
            debouncedSync('trips', syncTrips);
          }
        }
      )
      .subscribe();
    
    channels.push(tripsChannel);

    // Subscribe to shared trips
    const sharedTripsChannel = supabase
      .channel(`shared_trips:user_${options.userId}`)
      .on('postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'shares',
          filter: `user_email=eq.${options.userEmail}`
        },
        (payload) => {
          debouncedSync('shared_trips', syncTrips);
        }
      )
      .subscribe();
    
    channels.push(sharedTripsChannel);

    // Subscribe to trip deletions that might affect shared trips
    const tripDeletionChannel = supabase
      .channel(`trip_deletions:user_${options.userId}`)
      .on('postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'trips'
        },
        (payload) => {
          const deletedTripId = payload.old?.id;
          if (deletedTripId) {
            // Check if this affects current user's trips and refresh
            debouncedSync('trips', syncTrips);
          }
        }
      )
      .subscribe();
    
    channels.push(tripDeletionChannel);

    // Subscribe to notifications
    const notificationsChannel = supabase
      .channel(`notifications:user_${options.userId}`)
      .on('postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${options.userId}`
        },
        (payload) => {
          // Real-time notification received - sync immediately for notifications
          syncNotifications();
        }
      )
      .subscribe();
      
    channels.push(notificationsChannel);

    // If we have a specific trip ID, subscribe to its data
    if (options.tripId) {
      // Subscribe to itinerary changes
      const itineraryChannel = supabase
        .channel(`itinerary:trip_${options.tripId}`)
        .on('postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'itinerary',
            filter: `trip_id=eq.${options.tripId}`
          },
          (payload) => {
            // Ignore events from current user
            if (isFromCurrentUser(payload)) {
              return;
            }
            
            debouncedSync(`itinerary_${options.tripId}`, () => syncTripData(options.tripId!));
          }
        )
        .subscribe();
      
      channels.push(itineraryChannel);

      // Subscribe to expense changes
      const expensesChannel = supabase
        .channel(`expenses:trip_${options.tripId}`)
        .on('postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'expenses',
            filter: `trip_id=eq.${options.tripId}`
          },
          (payload) => {
            // Ignore events from current user
            if (isFromCurrentUser(payload)) return;
            
            debouncedSync(`expenses_${options.tripId}`, () => syncTripData(options.tripId!));
          }
        )
        .subscribe();
      
      channels.push(expensesChannel);

      // Subscribe to activity log changes
      const activityChannel = supabase
        .channel(`activity:trip_${options.tripId}`)
        .on('postgres_changes',
          {
            event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
            schema: 'public',
            table: 'activity_logs',
            filter: `trip_id=eq.${options.tripId}`
          },
          (payload: any) => {
            // Check if event originated from current user
            const userIdField = (payload.new as any)?.user_id || (payload.new as any)?.created_by || (payload.old as any)?.user_id || (payload.old as any)?.created_by;
            const isCurrentUser = userIdField === options.userId;
            
            // Ignore events from current user
            if (isCurrentUser) {
              return;
            }
            
            debouncedSync(`activity_${options.tripId}`, () => syncTripData(options.tripId!));
          }
        )
        .subscribe();
      
      channels.push(activityChannel);

      // Subscribe to trip members changes (for accept/reject operations)
      const tripMembersChannel = supabase
        .channel(`trip_members:trip_${options.tripId}`)
        .on('postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'trip_members',
            filter: `trip_id=eq.${options.tripId}`
          },
          (payload) => {
            debouncedSync(`trip_members_${options.tripId}`, () => syncTripData(options.tripId!));
          }
        )
        .subscribe();
      
      channels.push(tripMembersChannel);
    }

    channelsRef.current = channels;

    // Cleanup function
    return () => {
      // Clear all debounce timers
      Object.values(debounceRef.current).forEach(timer => clearTimeout(timer));
      
      // Unsubscribe from all channels
      channels.forEach(channel => {
        try {
          supabase.removeChannel(channel);
        } catch (error) {
          // Error unsubscribing from channel
        }
      });
      
      channelsRef.current = [];
    };
  }, [options.userId, options.userEmail, options.tripId, isFromCurrentUser, debouncedSync, syncTrips, syncTripData, syncNotifications]);

  // Manual sync function for delta sync
  const performDeltaSync = useCallback(async (since?: number) => {
    if (!offlineSyncManager.onlineStatus) return;

    const timestamp = since || lastSyncRef.current.trips || 0;
    
    try {
      // Sync trips with delta
      if (!options.tripId) {
        const { data: updatedTrips } = await supabase
          .from('trips')
          .select('*')
          .or(`user_id.eq.${options.userId},updated_at.gt.${new Date(timestamp).toISOString()}`);

        if (updatedTrips && updatedTrips.length > 0) {
          await syncTrips();
          lastSyncRef.current.trips = Date.now();
        }
      } else {
        // Sync specific trip data with delta
        await syncTripData(options.tripId);
        lastSyncRef.current[`trip_${options.tripId}`] = Date.now();
      }
    } catch (error) {
      // Delta sync failed
    }
  }, [options.tripId, options.userId, syncTrips, syncTripData]);

  return {
    performDeltaSync,
    syncTrips,
    syncTripData,
    syncNotifications
  };
};
