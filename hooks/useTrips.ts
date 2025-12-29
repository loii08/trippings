
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Trip } from '../types';

export const useTrips = (userEmail: string | undefined, userId: string | undefined) => {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTrips = useCallback(async () => {
    if (!userId || !userEmail) return;
    setLoading(true);
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
      setTrips(uniqueTrips);
    } catch (err) {
      console.error('Failed to fetch trips from Supabase', err);
    } finally {
      setLoading(false);
    }
  }, [userId, userEmail]);

  useEffect(() => {
    fetchTrips();
  }, [fetchTrips]);

  const addTrip = async (tripData: Omit<Trip, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>) => {
    if (!userId) return;
    
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
    await fetchTrips();
    
    return {
      ...tripData,
      id: data.id,
      ownerId: userId,
      createdAt: new Date(data.created_at).getTime(),
      updatedAt: new Date(data.created_at).getTime(),
    } as Trip;
  };

  const deleteTrip = async (id: string) => {
    const { error } = await supabase
      .from('trips')
      .delete()
      .eq('id', id);
    if (error) throw error;
    await fetchTrips();
  };

  return { trips, loading, addTrip, deleteTrip, refresh: fetchTrips };
};
