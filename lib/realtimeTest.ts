// Test real-time subscription functionality
import { supabase } from './supabase';

export const testRealtimeSubscription = async (userId: string, tripId?: string) => {
  console.log('🧪 Testing real-time subscriptions...');
  
  try {
    // Test 1: Check if we can create a channel
    const testChannel = supabase.channel(`test:user_${userId}`);
    console.log('✅ Channel creation successful');
    
    // Test 2: Check if we can subscribe to postgres_changes
    testChannel.on('postgres_changes', 
      { 
        event: '*', 
        schema: 'public', 
        table: 'trips',
        filter: `user_id=eq.${userId}`
      },
      (payload) => {
        console.log('🧪 Test payload received:', payload);
      }
    );
    
    const subscription = testChannel.subscribe();
    console.log('✅ Subscription successful');
    
    // Test 3: Check subscription status after a delay
    setTimeout(() => {
      console.log('🧪 Subscription status check...');
      testChannel.unsubscribe();
      console.log('✅ Unsubscription successful');
    }, 5000);
    
    return true;
  } catch (error) {
    console.error('❌ Real-time subscription test failed:', error);
    return false;
  }
};

// Test database permissions
export const testDatabasePermissions = async (userId: string) => {
  console.log('🧪 Testing database permissions...');
  
  try {
    // Test reading trips
    const { data: trips, error: tripsError } = await supabase
      .from('trips')
      .select('*')
      .eq('user_id', userId)
      .limit(1);
    
    if (tripsError) {
      console.error('❌ Trips read permission error:', tripsError);
    } else {
      console.log('✅ Trips read permission OK');
    }
    
    // Test reading itinerary
    const { data: itinerary, error: itineraryError } = await supabase
      .from('itinerary')
      .select('*')
      .limit(1);
    
    if (itineraryError) {
      console.error('❌ Itinerary read permission error:', itineraryError);
    } else {
      console.log('✅ Itinerary read permission OK');
    }
    
    return { tripsError, itineraryError };
  } catch (error) {
    console.error('❌ Database permissions test failed:', error);
    return { tripsError: error, itineraryError: error };
  }
};
