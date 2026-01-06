// Enable real-time for activity_logs table
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://iicckcocrghquwoxtnry.supabase.co',
  'your-anon-key' // Replace with your actual anon key
);

async function enableActivityLogsRealtime() {
  try {
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: 'ALTER PUBLICATION supabase_realtime ADD TABLE activity_logs;'
    });
    
    if (error) {
      console.error('Error enabling real-time for activity_logs:', error);
    } else {
      console.log('✅ Real-time enabled for activity_logs table!');
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

enableActivityLogsRealtime();
