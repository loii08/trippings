// Test function to verify notifications are working
import { supabase } from './lib/supabase';

export async function testNotificationRealtime() {
  console.log('🧪 Testing notification realtime...');
  
  // Subscribe to notifications
  const channel = supabase
    .channel('test_notifications')
    .on('postgres_changes', 
      { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'notifications',
        filter: 'user_id=eq.YOUR_USER_ID' // Replace with actual user ID
      }, 
      (payload) => {
        console.log('🔔 Real-time notification received:', payload);
      }
    )
    .subscribe((status) => {
      console.log('📡 Subscription status:', status);
    });
  
  // Test inserting a notification
  setTimeout(async () => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .insert({
          user_id: 'YOUR_USER_ID', // Replace with actual user ID
          title: 'Test Notification',
          body: 'This is a test notification',
          type: 'info',
          created_at: new Date().toISOString()
        });
      
      if (error) {
        console.error('❌ Failed to insert test notification:', error);
      } else {
        console.log('✅ Test notification inserted:', data);
      }
    } catch (error) {
      console.error('❌ Test failed:', error);
    }
  }, 2000);
  
  return channel;
}
