// Simple network test for debugging connectivity issues
export const testSupabaseConnection = async () => {
  console.log('Testing Supabase connection...');
  
  try {
    // Test basic connectivity
    const response = await fetch('https://iicckcocrghquwoxtnry.supabase.co/rest/v1/', {
      method: 'HEAD',
      mode: 'no-cors'
    });
    
    console.log('Supabase basic connectivity: OK');
    return true;
  } catch (error) {
    console.error('Supabase basic connectivity failed:', error);
    return false;
  }
};

export const testSupabaseAuth = async () => {
  console.log('Testing Supabase auth...');
  
  try {
    const response = await fetch('https://iicckcocrghquwoxtnry.supabase.co/auth/v1/user', {
      method: 'GET',
      headers: {
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlpY2NrY29jcmdocXV3b3h0bnJ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY4Mzc1MDYsImV4cCI6MjA4MjQxMzUwNn0.1ew6y-ayVU-GxUflQG5ke_cAjOeCoLn3hmiPsLCaJYA',
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      console.log('Supabase auth endpoint: OK');
      return true;
    } else {
      console.error('Supabase auth endpoint failed:', response.status);
      return false;
    }
  } catch (error) {
    console.error('Supabase auth test failed:', error);
    return false;
  }
};

export const runNetworkDiagnostics = async () => {
  console.log('=== Network Diagnostics ===');
  
  const results = {
    online: navigator.onLine,
    supabaseConnection: false,
    supabaseAuth: false,
    timestamp: new Date().toISOString()
  };
  
  results.supabaseConnection = await testSupabaseConnection();
  results.supabaseAuth = await testSupabaseAuth();
  
  console.log('Results:', results);
  
  if (!results.online) {
    console.warn('⚠️ Browser reports offline status');
  }
  
  if (!results.supabaseConnection) {
    console.error('❌ Cannot reach Supabase servers');
    console.error('Check: https://iicckcocrghquwoxtnry.supabase.co');
  }
  
  if (!results.supabaseAuth) {
    console.error('❌ Supabase auth endpoint not responding');
  }
  
  if (results.supabaseConnection && results.supabaseAuth) {
    console.log('✅ All network tests passed');
  }
  
  return results;
};
