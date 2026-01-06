// Enable realtime for notifications
import { supabase } from './lib/supabase';

async function enableNotificationsRealtime() {
  try {
    // Add notifications table to realtime publication
    const { error } = await supabase.rpc('exec_sql', {
      sql: 'ALTER PUBLICATION supabase_realtime ADD TABLE notifications;'
    });
    
    if (error) {
      console.error('Error adding notifications to realtime publication:', error);
    } else {
      console.log('✅ Notifications added to realtime publication');
    }
  } catch (error) {
    console.error('Failed to enable notifications realtime:', error);
  }
}

enableNotificationsRealtime();
