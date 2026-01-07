import React from 'react';
import { Wifi, WifiOff, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface OfflineIndicatorProps {
  isOnline: boolean;
  isOffline: boolean;
  connectionType?: string;
  effectiveType?: string;
  lastOnlineTime?: number;
}

const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({
  isOnline,
  isOffline,
  connectionType,
  effectiveType,
  lastOnlineTime
}) => {
  const formatLastOnlineTime = (timestamp?: number) => {
    if (!timestamp) return 'Unknown';
    
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const getConnectionSpeed = () => {
    switch (effectiveType) {
      case 'slow-2g': return 'Very Slow';
      case '2g': return 'Slow';
      case '3g': return 'Good';
      case '4g': return 'Fast';
      default: return 'Unknown';
    }
  };

  return (
    <AnimatePresence>
      {isOffline && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          className="fixed top-0 left-0 right-0 z-50 bg-red-500 text-white px-4 py-3 shadow-lg"
          style={{ paddingTop: 'calc(0.75rem + env(safe-area-inset-top))' }}
        >
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <WifiOff className="w-5 h-5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-sm">You're offline</p>
                <p className="text-xs opacity-90">
                  Last online: {formatLastOnlineTime(lastOnlineTime)}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-4 h-4" />
              <span className="text-xs">Limited functionality</span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default OfflineIndicator;
