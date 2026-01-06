// Check current realtime publication status
import { supabase } from './supabase';

export const checkRealtimeStatus = async () => {
  console.log('🔍 Checking realtime publication status...');
  
  try {
    // Check which tables are in the realtime publication
    const { data, error } = await supabase
      .rpc('get_publication_tables', { publication_name: 'supabase_realtime' });
    
    if (error) {
      console.error('❌ Failed to check publication status:', error);
      return null;
    }
    
    console.log('📋 Tables currently in realtime publication:', data);
    return data;
  } catch (error) {
    console.error('❌ Error checking realtime status:', error);
    return null;
  }
};

// SQL to check publication status manually
export const CHECK_REALTIME_SQL = `
-- Check current realtime publication status
SELECT 
  schemaname,
  tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime'
ORDER BY schemaname, tablename;
`;

// SQL for remaining tables (skip ones already enabled)
export const REMAINING_REALTIME_SQL = `
-- Add remaining tables to realtime publication (skip ones already enabled)
-- Note: Run these one by one and skip any that give "already member" errors

ALTER PUBLICATION supabase_realtime ADD TABLE itinerary;
ALTER PUBLICATION supabase_realtime ADD TABLE expenses;
ALTER PUBLICATION supabase_realtime ADD TABLE activity_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE shares;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- Or check which ones are missing and add only those:
-- First run: SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
-- Then add only the missing tables
`;
