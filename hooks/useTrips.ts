
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { db } from '../db/db';
import { Trip, User } from '../types';
import { showToast } from '../toast-system';
import { offlineSyncManager } from '../lib/offlineSync';
import { useRealtimeSync } from './useRealtimeSync';
import { sendCollaborativeNotification, shouldShowToast, getToastType } from '../lib/smartNotifications';

export const useTrips = (userEmail: string | undefined, userId: string | undefined) => {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);

  // Setup real-time sync
  const { syncTrips } = useRealtimeSync({
    userId: userId || '',
    userEmail: userEmail || '',
    onTripChange: setTrips
  });

  // Log activity function for tracking user actions
  const logActivity = async (user: User, action: string, details: string, entityType: string = 'trip', entityId?: string) => {
    await supabase.from('activity_logs').insert([{
      trip_id: entityId,
      user_id: user.id,
      action,
      entity_type: entityType,
      entity_id: entityId,
      details: { description: details }
    }]);
  };

  const fetchTrips = useCallback(async () => {
    if (!userId || !userEmail) return;
    setLoading(true);
    try {
      // Try Supabase first if online
      if (offlineSyncManager.onlineStatus) {
        try {
          // 1. Fetch trips owned by the user
          const { data: ownedTrips, error: ownedError } = await supabase
            .from('trips')
            .select('*')
            .eq('user_id', userId);

          if (ownedError) throw ownedError;

          // 2. Fetch shared trips via shares table (only accepted ones)
          const { data: shares, error: sharesError } = await supabase
            .from('shares')
            .select('trip_id')
            .eq('user_email', userEmail)
            .eq('status', 'accepted');

          if (sharesError) throw sharesError;

          const sharedTripIds = shares.map(s => s.trip_id);
          
          let sharedTrips: any[] = [];
          if (sharedTripIds.length > 0) {
            const { data, error } = await supabase
              .from('trips')
              .select('*')
              .in('id', sharedTripIds);
            if (error) throw error;
            sharedTrips = data || [];
          }

          // Merge and remove duplicates
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
          
          // Update React state
          setTrips(uniqueTrips);
          
          // Update IndexedDB with fresh data
          await Promise.all(uniqueTrips.map(trip => db.trips.put(trip)));
          
          return;
        } catch (error) {
          console.warn('Supabase fetch failed, falling back to IndexedDB:', error);
        }
      }
      
      // Fallback to IndexedDB
      const trips = await db.trips
        .where('ownerId')
        .equals(userId)
        .or('ownerId != any')
        .toArray();
      
      setTrips(trips.sort((a, b) => b.createdAt - a.createdAt));
      
    } catch (err) {
      console.error('Failed to fetch trips:', err);
      showToast('Failed to load trips. Please check your connection.', 'error');
    } finally {
      setLoading(false);
    }
  }, [userId, userEmail]);

  useEffect(() => {
    fetchTrips();
  }, [fetchTrips]);

  // Listen for online events to trigger delta sync
  useEffect(() => {
    const handleOnline = () => {
      if (userId && userEmail) {
        // Perform delta sync when coming back online
        setTimeout(() => {
          syncTrips();
        }, 1000); // Small delay to ensure connection is stable
      }
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [userId, userEmail, syncTrips]);

  const addTrip = async (tripData: Omit<Trip, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>) => {
    if (!userId) return;
    
    // Create optimistic trip for immediate UI update
    const optimisticTrip: Trip = {
      ...tripData,
      id: crypto.randomUUID(),
      ownerId: userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    try {
      // 1. Update React state immediately (optimistic update)
      setTrips(prev => [optimisticTrip, ...prev]);
      
      // 2. Update IndexedDB
      await db.trips.add(optimisticTrip);
      
      // 3. Perform Supabase mutation with offline sync
      const mutation = async () => {
        const { data, error } = await supabase
          .from('trips')
          .insert([{
            user_id: userId,
            title: tripData.title,
            description: tripData.description,
            start_date: tripData.startDate,
            end_date: tripData.endDate,
            destination: tripData.destination,
            budget: tripData.budget
          }])
          .select()
          .single();

        if (error) throw error;
        return data;
      };
      
      const data = await offlineSyncManager.addToSyncQueue(mutation);
      
      // 4. Update IndexedDB with real data (only if we have real data)
      if (data && !data.offline) {
        const realTrip: Trip = {
          ...tripData,
          id: data.id,
          ownerId: userId,
          createdAt: new Date(data.created_at).getTime(),
          updatedAt: new Date(data.created_at).getTime(),
        };
        
        await db.trips.put(realTrip);
        
        // 5. Update React state with real data
        setTrips(prev => prev.map(t => t.id === optimisticTrip.id ? realTrip : t));
        
        // 6. Log activity and send collaborative notification
        await logActivity({ id: userId, email: userEmail || '', username: '', joinedAt: Date.now() }, 'Created Trip', `Started planning "${tripData.title}"`, 'trip');
        
        // Only send notification if there are collaborators (not for solo trips)
        // This prevents owners from getting "New Trip Created" notifications
        console.log('🔔 Trip created - checking for collaborators before sending notification');
        
        // Show toast only for important actions
        if (shouldShowToast('created')) {
          showToast('Trip created successfully', getToastType('created'));
        }
        
        return realTrip;
      }
      
      return optimisticTrip;
    } catch (error) {
      // Failed to add trip
      
      // Rollback optimistic update on error
      setTrips(prev => prev.filter(t => t.id !== optimisticTrip.id));
      await db.trips.delete(optimisticTrip.id);
      
      showToast('Failed to create trip. Please try again.', 'error');
      throw error;
    }
  };

  const deleteTrip = async (id: string) => {
    // Store original trip for potential rollback
    const originalTrip = trips.find(t => t.id === id);
    if (!originalTrip) return;

    try {
      // 1. Update React state immediately (optimistic delete)
      setTrips(prev => prev.filter(t => t.id !== id));
      
      // 2. Update IndexedDB
      await db.trips.delete(id);
      
      // 3. Perform Supabase mutation with offline sync
      const mutation = async () => {
        const { error } = await supabase
          .from('trips')
          .delete()
          .eq('id', id);
          
        if (error) throw error;
      };
      
      await offlineSyncManager.addToSyncQueue(mutation);
      
      // 4. Log activity and send collaborative notification
      await logActivity({ id: userId, email: userEmail || '', username: '', joinedAt: Date.now() }, 'Deleted Trip', `Removed "${originalTrip.title}"`, 'trip');
      
      // Send notification to collaborators
      await sendCollaborativeNotification(
        'itinerary_deleted', // Reuse this for trip deletion
        { id: userId, email: userEmail || '', username: '', joinedAt: Date.now() },
        originalTrip.id,
        originalTrip.title
      );
      
      // Show toast only for important actions
      if (shouldShowToast('deleted')) {
        showToast('Trip deleted successfully', getToastType('deleted'));
      }
    } catch (error) {
      // Failed to delete trip
      
      // Rollback optimistic delete on error
      setTrips(prev => [...prev, originalTrip]);
      await db.trips.put(originalTrip);
      
      showToast('Failed to delete trip. Please try again.', 'error');
      throw error;
    }
  };

  return { trips, loading, addTrip, deleteTrip, refresh: fetchTrips };
};
