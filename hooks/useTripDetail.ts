
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Trip, ItineraryEntry, Expense, ActivityLog, User, PlanStatus } from '../types';

export const useTripDetail = (tripId: string) => {
  const [trip, setTrip] = useState<Trip | null>(null);
  const [itinerary, setItinerary] = useState<ItineraryEntry[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!tripId) return;
    setLoading(true);
    try {
      const { data: tripData, error: tripError } = await supabase
        .from('trips')
        .select('*')
        .eq('id', tripId)
        .single();

      if (tripError) throw tripError;

      const [itineraryRes, expenseRes, logsRes] = await Promise.all([
        supabase.from('itinerary').select('*').eq('trip_id', tripId).order('start_date', { ascending: true }),
        supabase.from('expenses').select('*').eq('trip_id', tripId).order('created_at', { ascending: false }),
        supabase.from('activity_logs').select('*').eq('trip_id', tripId).order('created_at', { ascending: false })
      ]);

      setTrip({
        id: tripData.id,
        ownerId: tripData.owner_id,
        title: tripData.title,
        description: tripData.description,
        startDate: tripData.start_date,
        endDate: tripData.end_date,
        destination: tripData.destination,
        budget: tripData.budget,
        createdAt: new Date(tripData.created_at).getTime(),
        updatedAt: new Date(tripData.updated_at || tripData.created_at).getTime(),
      });

      setItinerary((itineraryRes.data || []).map(i => ({
        id: i.id,
        tripId: i.trip_id,
        date: i.start_date ? new Date(i.start_date).toISOString().split('T')[0] : '',
        time: i.start_date ? new Date(i.start_date).toTimeString().slice(0, 5) : '',
        title: i.title,
        location: i.location,
        notes: i.notes,
        status: i.status as PlanStatus,
        createdBy: i.created_by, // Fix: use created_by from database
        createdAt: new Date(i.created_at).getTime()
      })));

      setExpenses((expenseRes.data || []).map(e => ({
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
      })));

      setActivityLogs((logsRes.data || []).map(l => ({
        id: l.id,
        tripId: l.trip_id,
        userId: l.user_id,
        userName: l.user_name || 'User', // Use userName from database
        action: l.action,
        details: l.details?.description || '',
        timestamp: new Date(l.created_at).getTime()
      })));

    } catch (err) {
      console.error('Error fetching trip details from Supabase', err);
    } finally {
      setLoading(false);
    }
  }, [tripId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const logActivity = async (user: User, action: string, details: string, entityType: string = 'itinerary', entityId?: string) => {
    await supabase.from('activity_logs').insert([{
      trip_id: tripId,
      user_id: user.id,
      user_name: user.name || user.username || 'User', // Add userName
      action,
      entity_type: entityType,
      entity_id: entityId,
      details: { description: details }
    }]);
  };

  const addItinerary = async (entry: Omit<ItineraryEntry, 'id' | 'tripId' | 'createdAt' | 'status' | 'createdBy'>, user: User) => {
    // Convert date and time to start_date timestamp
    const startDateTime = new Date(`${entry.date}T${entry.time || '12:00'}`);
    
    const { error } = await supabase.from('itinerary').insert([{
      trip_id: tripId,
      title: entry.title,
      description: entry.notes,
      location: entry.location,
      start_date: startDateTime.toISOString(),
      end_date: startDateTime.toISOString(), // Same as start for now
      category: 'activity',
      status: 'planned',
      cost: 0,
      notes: entry.notes,
      created_by: user.id // Add createdBy field
    }]);

    if (error) throw error;
    await logActivity(user, 'Added Item', `Planned "${entry.title}"`, 'itinerary');
    await fetchData();
  };

  const updateItineraryStatus = async (id: string, status: PlanStatus, user: User) => {
    const { data: item } = await supabase.from('itinerary').select('title').eq('id', id).single();
    const { error } = await supabase.from('itinerary').update({ status }).eq('id', id);
    if (error) throw error;
    if (item) await logActivity(user, 'Status Change', `Marked "${item.title}" as ${status}`, 'itinerary', id);
    await fetchData();
  };

  const deleteItinerary = async (id: string, user: User) => {
    const { data: item } = await supabase.from('itinerary').select('title').eq('id', id).single();
    const { error } = await supabase.from('itinerary').delete().eq('id', id);
    if (error) throw error;
    if (item) await logActivity(user, 'Deleted Item', `Removed "${item.title}"`, 'itinerary', id);
    await fetchData();
  };

  const addExpense = async (expense: Omit<Expense, 'id' | 'tripId' | 'createdAt' | 'createdBy'>, user: User) => {
    const { error } = await supabase.from('expenses').insert([{
      trip_id: tripId,
      title: expense.description,
      description: expense.description,
      category: expense.category,
      amount: expense.amount,
      currency: expense.currency,
      date: expense.date,
      payment_method: 'cash',
      user_id: user.id
    }]);

    if (error) throw error;
    await logActivity(user, 'Logged Expense', `Spent ${expense.amount} for ${expense.description}`, 'expense');
    await fetchData();
  };

  const deleteExpense = async (id: string, user: User) => {
    const { data: item } = await supabase.from('expenses').select('description').eq('id', id).single();
    const { error } = await supabase.from('expenses').delete().eq('id', id);
    if (error) throw error;
    if (item) await logActivity(user, 'Deleted Expense', `Removed expense "${item.description}"`, 'expense', id);
    await fetchData();
  };

  return { 
    trip, itinerary, expenses, activityLogs, loading, 
    addItinerary, updateItineraryStatus, deleteItinerary, 
    addExpense, deleteExpense, refresh: fetchData 
  };
};
