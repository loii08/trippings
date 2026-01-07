import { useState, useEffect } from 'react';

interface NetworkStatus {
  isOnline: boolean;
  isOffline: boolean;
  connectionType?: string;
  effectiveType?: string;
  lastOnlineTime: number;
}

export const useNetworkStatus = () => {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({
    isOnline: navigator.onLine,
    isOffline: !navigator.onLine,
    connectionType: 'unknown',
    effectiveType: 'unknown',
    lastOnlineTime: Date.now()
  });

  useEffect(() => {
    const updateNetworkStatus = () => {
      const connection = (navigator as any).connection || 
                        (navigator as any).mozConnection || 
                        (navigator as any).webkitConnection;

      setNetworkStatus(prev => ({
        isOnline: navigator.onLine,
        isOffline: !navigator.onLine,
        connectionType: connection?.type || 'unknown',
        effectiveType: connection?.effectiveType || 'unknown',
        lastOnlineTime: navigator.onLine ? Date.now() : prev.lastOnlineTime
      }));
    };

    const handleOnline = () => {
      updateNetworkStatus();
      console.log('🌐 Network connection restored');
    };

    const handleOffline = () => {
      updateNetworkStatus();
      console.log('📵 Network connection lost');
    };

    // Initial status
    updateNetworkStatus();

    // Listen for network events
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Listen for connection changes if available
    const connection = (navigator as any).connection || 
                      (navigator as any).mozConnection || 
                      (navigator as any).webkitConnection;
    
    if (connection) {
      connection.addEventListener('change', updateNetworkStatus);
    }

    // Periodic check (every 30 seconds)
    const intervalId = setInterval(() => {
      updateNetworkStatus();
    }, 30000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      
      if (connection) {
        connection.removeEventListener('change', updateNetworkStatus);
      }
      
      clearInterval(intervalId);
    };
  }, []);

  return networkStatus;
};
