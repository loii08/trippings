
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { db } from '../db/db';
import { Trip, ItineraryEntry, Expense, ActivityLog, User, PlanStatus } from '../types';
import { showToast } from '../toast-system';
import { offlineSyncManager } from '../lib/offlineSync';
import { useRealtimeSync } from './useRealtimeSync';
import { sendCollaborativeNotification, shouldShowToast, getToastType } from '../lib/smartNotifications';

export const useTripDetail = (tripId: string, userId?: string, userEmail?: string) => {
  const [trip, setTrip] = useState<Trip | null>(null);
  const [itinerary, setItinerary] = useState<ItineraryEntry[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingItineraryId, setLoadingItineraryId] = useState<string | null>(null);
  const [updatingItineraryId, setUpdatingItineraryId] = useState<string | null>(null);
  const [deletingItineraryId, setDeletingItineraryId] = useState<string | null>(null);
  const [isAddingExpense, setIsAddingExpense] = useState(false);

  // Setup real-time sync for trip-specific data
  const { syncTripData } = useRealtimeSync({
    tripId,
    userId: userId || '',
    userEmail: userEmail || '',
    onItineraryChange: (data) => {
      setItinerary(data);
    },
    onExpenseChange: (data) => {
      setExpenses(data);
    },
    onActivityChange: (data) => {
      setActivityLogs(data);
    }
  });

  const fetchData = useCallback(async () => {
    if (!tripId) return;
    setLoading(true);
    try {
      // Try Supabase first if online
      if (offlineSyncManager.onlineStatus) {
        try {
          const [tripData, itineraryData, expensesData, activityLogsData] = await Promise.all([
            supabase.from('trips').select('*').eq('id', tripId).single(),
            supabase.from('itinerary').select('*').eq('trip_id', tripId).order('start_date', { ascending: true }),
            supabase.from('expenses').select('*').eq('trip_id', tripId).order('created_at', { ascending: false }),
            supabase.from('activity_logs').select('*').eq('trip_id', tripId).order('created_at', { ascending: false })
          ]);

          if (tripData.error) throw tripData.error;
          if (itineraryData.error) throw itineraryData.error;
          if (expensesData.error) throw expensesData.error;
          if (activityLogsData.error) throw activityLogsData.error;

          // Update state with Supabase data
          setTrip({
            id: tripData.data.id,
            ownerId: tripData.data.user_id,
            title: tripData.data.title,
            description: tripData.data.description,
            startDate: tripData.data.start_date,
            endDate: tripData.data.end_date,
            destination: tripData.data.destination,
            budget: tripData.data.budget,
            createdAt: new Date(tripData.data.created_at).getTime(),
            updatedAt: new Date(tripData.data.updated_at || tripData.data.created_at).getTime(),
          });

          const mappedItinerary = (itineraryData.data || []).map(i => ({
            id: i.id,
            tripId: i.trip_id,
            date: i.start_date ? new Date(i.start_date).toISOString().split('T')[0] : '',
            time: i.start_date ? new Date(i.start_date).toTimeString().slice(0, 5) : '',
            title: i.title,
            location: i.location,
            notes: i.notes,
            status: i.status as PlanStatus,
            createdBy: i.created_by,
            createdAt: new Date(i.created_at).getTime()
          }));
          setItinerary(mappedItinerary);

          const mappedExpenses = (expensesData.data || []).map(e => ({
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
          setExpenses(mappedExpenses);

          const mappedLogs = (activityLogsData.data || []).map(l => ({
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
                
                // Also update IndexedDB with corrected user names
                await Promise.all(
                  mappedLogs.map(log => db.activityLogs.update(log.id, { userName: log.userName }))
                );
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
              console.warn('Error fetching user information:', error);
              // Keep default 'User' for all logs
            }
          }
          setActivityLogs(mappedLogs);

          // Update IndexedDB with fresh data
          await Promise.all([
            db.trips.put({
              id: tripData.data.id,
              ownerId: tripData.data.user_id,
              title: tripData.data.title,
              description: tripData.data.description,
              startDate: tripData.data.start_date,
              endDate: tripData.data.end_date,
              destination: tripData.data.destination,
              budget: tripData.data.budget,
              createdAt: new Date(tripData.data.created_at).getTime(),
              updatedAt: new Date(tripData.data.updated_at || tripData.data.created_at).getTime(),
            }),
            ...mappedItinerary.map(item => db.itinerary.put(item)),
            ...mappedExpenses.map(expense => db.expenses.put(expense)),
            ...mappedLogs.map(log => db.activityLogs.put(log))
          ]);
          
          return;
        } catch (error) {
          console.warn('Supabase fetch failed, falling back to IndexedDB:', error);
        }
      }
      
      // Fallback to IndexedDB
      const [trip, itineraryItems, expenseItems, logItems] = await Promise.all([
        db.trips.get(tripId),
        db.itinerary.where('tripId').equals(tripId).toArray(),
        db.expenses.where('tripId').equals(tripId).toArray(),
        db.activityLogs.where('tripId').equals(tripId).toArray()
      ]);
      
      if (trip) {
        setTrip(trip);
        setItinerary(itineraryItems.sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time)));
        setExpenses(expenseItems.sort((a, b) => b.createdAt - a.createdAt));
        setActivityLogs(logItems.sort((a, b) => b.timestamp - a.timestamp));
      }
      
    } catch (err) {
      console.error('Error fetching trip details:', err);
      showToast('Failed to load trip details. Please check your connection.', 'error');
    } finally {
      setLoading(false);
    }
  }, [tripId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Listen for online events to trigger delta sync
  useEffect(() => {
    const handleOnline = () => {
      if (tripId && userId) {
        // Perform delta sync when coming back online
        setTimeout(() => {
          syncTripData(tripId);
        }, 1000); // Small delay to ensure connection is stable
      }
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [tripId, userId, syncTripData]);

  // Check if current user still has access to this trip
  const checkTripAccess = useCallback(async () => {
    if (!userId || !tripId) return true;
    
    // If user is the owner, always has access
    if (trip && trip.ownerId === userId) {
      return true;
    }
    
    try {
      // Check if user is still in shares table
      const { data: shareData, error } = await supabase
        .from('shares')
        .select('status')
        .eq('trip_id', tripId)
        .eq('user_email', userEmail)
        .single();
      
      if (error || !shareData) {
        console.warn('⚠️ User no longer has access to trip:', tripId);
        return false;
      }
      
      return shareData.status === 'accepted';
    } catch (error) {
      console.error('❌ Error checking trip access:', error);
      return false;
    }
  }, [userId, userEmail, tripId, trip]);

  // Add access check before allowing any modifications
  const validateTripAccess = useCallback(async () => {
    const hasAccess = await checkTripAccess();
    if (!hasAccess) {
      console.log('🚫 Access denied - user removed from trip');
      showToast('You no longer have access to this trip. Redirecting...', 'error');
      
      // Redirect to trips page after a short delay
      setTimeout(() => {
        window.location.href = '/trips';
      }, 2000);
      
      return false;
    }
    return true;
  }, [checkTripAccess]);

  const logActivity = async (user: User, action: string, details: string, entityType: string = 'itinerary', entityId?: string) => {
    const logEntry = {
      trip_id: tripId,
      user_id: user.id,
      action,
      entity_type: entityType,
      entity_id: entityId,
      details: { description: details },
      created_at: new Date().toISOString()
    };
    
    // Fetch user name from users table for accurate display (profiles table has RLS issues)
    let userName = 'User';
    try {
      const { data: userRecord, error } = await supabase
        .from('users')
        .select('name, username, email')
        .eq('id', user.id)
        .single();
      
      if (!error && userRecord) {
        userName = userRecord.name || userRecord.username || userRecord.email?.split('@')[0] || 'User';
      } else {
        console.warn('Failed to fetch user record for activity log:', error);
        // Fallback to user object
        userName = user.name || user.username || user.email?.split('@')[0] || 'User';
      }
    } catch (error) {
      console.warn('Error fetching user record for activity log:', error);
      // Fallback to user object
      userName = user.name || user.username || user.email?.split('@')[0] || 'User';
    }
    
    // Update local state immediately for real-time updates
    const newLog = {
      id: crypto.randomUUID(),
      tripId,
      userId: user.id,
      userName,
      action,
      details,
      timestamp: Date.now(),
      targetId: entityId,
      targetType: entityType as 'expense' | 'itinerary' | 'member'
    };
    
    setActivityLogs(prev => [newLog, ...prev]);
    
    // Update IndexedDB
    await db.activityLogs.add(newLog);
    
    // Sync to Supabase (this will trigger real-time updates for other users)
    try {
      await supabase.from('activity_logs').insert([logEntry]);
    } catch (error) {
      // Failed to log activity to server
      console.error('❌ Failed to log activity:', error);
      // If it's a 409 conflict, the trip might have been deleted
      if (error.code === '409' || error.message?.includes('duplicate')) {
        console.warn('⚠️ Activity log conflict, trip might be deleted');
      }
    }
  };

  const addItinerary = async (entry: Omit<ItineraryEntry, 'id' | 'tripId' | 'createdAt' | 'status' | 'createdBy'>, user: User) => {
    // Check if user still has access to this trip
    const hasAccess = await validateTripAccess();
    if (!hasAccess) return;

    // 1. Set loading state
    setLoadingItineraryId('adding');

    try {
      // 2. Add to database first
      const { data, error } = await supabase
        .from('itinerary')
        .insert({
          title: entry.title,
          location: entry.location,
          notes: entry.notes,
          start_date: new Date(`${entry.date} ${entry.time}`).toISOString(),
          trip_id: tripId,
          status: 'planned',
          created_by: user.id
        })
        .select()
        .single();

      if (error) throw error;

      // 3. Send collaborative notification
      await sendCollaborativeNotification(
        'itinerary_added',
        user,
        tripId,
        trip?.title || 'Trip',
        entry.title
      );

      // 4. Update UI with the actual data from database
      const newEntry: ItineraryEntry = {
        id: data.id,
        tripId,
        date: entry.date,
        time: entry.time,
        title: data.title,
        location: data.location,
        notes: data.notes,
        status: data.status,
        createdBy: data.created_by,
        createdAt: new Date(data.created_at).getTime(),
      };

      setItinerary(prev => [...prev, newEntry]);
      await db.itinerary.add(newEntry);

      // 5. Show toast notification AFTER loading
      if (shouldShowToast('added')) {
        showToast('Itinerary item added successfully', getToastType('added'));
      }

      // 6. Log activity
      await logActivity(
        user,
        'added',
        `Added itinerary item: ${entry.title}`,
        'itinerary',
        data.id
      );

    } catch (error) {
      console.error('Failed to add itinerary:', error);
      showToast('Failed to add itinerary item', 'error');
    } finally {
      // 7. Clear loading state
      setLoadingItineraryId(null);
    }
  };

  const updateItineraryStatus = async (id: string, status: PlanStatus, user: User) => {
    // Check if user still has access to this trip
    const hasAccess = await validateTripAccess();
    if (!hasAccess) return;

    // Store original entry for potential rollback
    const originalEntry = itinerary.find(e => e.id === id);
    if (!originalEntry) return;

    // 1. Set loading state for this specific item
    setUpdatingItineraryId(id);

    try {
      // 2. Update database first
      const { error } = await supabase.from('itinerary').update({ status }).eq('id', id);
      if (error) throw error;

      // 3. Send collaborative notification
      await sendCollaborativeNotification(
        'status_updated',
        user,
        tripId,
        trip?.title || 'Trip',
        originalEntry.title,
        originalEntry.status,
        status
      );

      // 4. Update UI with the new status
      setItinerary(prev => prev.map(e => e.id === id ? { ...e, status } : e));
      await db.itinerary.update(id, { status });

      // 5. Show toast notification AFTER loading
      if (shouldShowToast('updated')) {
        showToast('Status updated successfully', getToastType('updated'));
      }

      // 6. Log activity
      await logActivity(
        user,
        'Status Change',
        `Marked "${originalEntry.title}" as ${status}`,
        'itinerary',
        id
      );

    } catch (error) {
      console.error('Failed to update itinerary status:', error);
      showToast('Failed to update status. Please try again.', 'error');
    } finally {
      // 7. Clear loading state
      setUpdatingItineraryId(null);
    }
  };

  const deleteItinerary = async (id: string, user: User) => {
    // Store original entry for potential rollback
    const originalEntry = itinerary.find(e => e.id === id);
    if (!originalEntry) return;

    // 1. Set loading state for this specific item
    setDeletingItineraryId(id);

    try {
      // 2. Delete from database first
      const { error } = await supabase.from('itinerary').delete().eq('id', id);
      if (error) throw error;

      // 3. Send collaborative notification
      await sendCollaborativeNotification(
        'itinerary_deleted',
        user,
        tripId,
        trip?.title || 'Trip',
        originalEntry.title
      );

      // 4. Update UI - remove the item
      setItinerary(prev => prev.filter(e => e.id !== id));
      await db.itinerary.delete(id);

      // 5. Show toast notification AFTER loading
      if (shouldShowToast('deleted')) {
        showToast('Itinerary item deleted successfully', getToastType('deleted'));
      }

      // 6. Log activity
      await logActivity(
        user,
        'Deleted Item',
        `Removed "${originalEntry.title}"`,
        'itinerary',
        id
      );

    } catch (error) {
      console.error('Failed to delete itinerary:', error);
      showToast('Failed to delete itinerary item. Please try again.', 'error');
    } finally {
      // 7. Clear loading state
      setDeletingItineraryId(null);
    }
  };

  const addExpense = async (expense: Omit<Expense, 'id' | 'tripId' | 'createdAt' | 'createdBy'>, user: User) => {
    // Check if user still has access to this trip
    const hasAccess = await validateTripAccess();
    if (!hasAccess) return;

    // 1. Set loading state
    setIsAddingExpense(true);

    try {
      // 2. Add to database first
      const { data, error } = await supabase.from('expenses').insert([{
        trip_id: tripId,
        title: expense.description,
        description: expense.description,
        category: expense.category,
        amount: expense.amount,
        currency: expense.currency,
        date: expense.date,
        payment_method: 'cash',
        user_id: user.id
      }]).select().single();

      if (error) throw error;

      // 3. Send collaborative notification
      await sendCollaborativeNotification(
        'expense_added',
        user,
        tripId,
        trip?.title || 'Trip',
        expense.description
      );

      // 4. Update UI with the actual data from database
      const newExpense: Expense = {
        ...expense,
        id: data.id,
        tripId,
        createdBy: user.id,
        createdAt: new Date(data.created_at).getTime()
      };

      setExpenses(prev => [newExpense, ...prev]);
      await db.expenses.add(newExpense);

      // 5. Show toast notification AFTER loading
      if (shouldShowToast('added')) {
        showToast('Expense added successfully', getToastType('added'));
      }

      // 6. Log activity
      await logActivity(
        user,
        'Logged Expense',
        `Spent ${expense.amount} for ${expense.description}`,
        'expense'
      );

    } catch (error) {
      console.error('Failed to add expense:', error);
      showToast('Failed to add expense. Please try again.', 'error');
    } finally {
      // 7. Clear loading state
      setIsAddingExpense(false);
    }
  };

  const deleteExpense = async (id: string, user: User) => {
    // Store original expense for potential rollback
    const originalExpense = expenses.find(e => e.id === id);
    if (!originalExpense) return;

    try {
      // 1. Update React state immediately (optimistic delete)
      setExpenses(prev => prev.filter(e => e.id !== id));
      
      // 2. Update IndexedDB
      await db.expenses.delete(id);
      
      // 3. Perform Supabase mutation
      const { error } = await supabase.from('expenses').delete().eq('id', id);
      if (error) throw error;
      
      // 4. Log activity and send collaborative notification
      await logActivity(user, 'Deleted Expense', `Removed expense "${originalExpense.description}"`, 'expense', id);
      
      // Send notification to collaborators
      await sendCollaborativeNotification(
        'expense_deleted',
        user,
        tripId,
        trip?.title || 'Trip',
        originalExpense.description
      );
      
      // Show toast only for important actions
      if (shouldShowToast('deleted')) {
        showToast('Expense deleted successfully', getToastType('deleted'));
      }
    } catch (error) {
      // Failed to delete expense
      
      // Rollback optimistic update on error
      setExpenses(prev => [...prev, originalExpense]);
      await db.expenses.put(originalExpense);
      
      showToast('Failed to delete expense. Please try again.', 'error');
      throw error;
    }
  };

  return { 
    trip, itinerary, expenses, activityLogs, loading, 
    loadingItineraryId, updatingItineraryId, deletingItineraryId, isAddingExpense,
    addItinerary, updateItineraryStatus, deleteItinerary, 
    addExpense, deleteExpense, refresh: fetchData,
    syncTripData
  };
};
