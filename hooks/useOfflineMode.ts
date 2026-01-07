import { useState, useEffect, useCallback } from 'react';
import { useNetworkStatus } from './useNetworkStatus';
import { db } from '../db/db';
import { supabase } from '../lib/supabase';

interface OfflineAction {
  id: string;
  type: 'create' | 'update' | 'delete';
  table: string;
  data: any;
  timestamp: number;
  retryCount?: number;
}

export const useOfflineMode = () => {
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [pendingActions, setPendingActions] = useState<OfflineAction[]>([]);
  const [syncInProgress, setSyncInProgress] = useState(false);
  const networkStatus = useNetworkStatus();

  // Check if we should be in offline mode
  useEffect(() => {
    setIsOfflineMode(networkStatus.isOffline);
  }, [networkStatus.isOffline]);

  // Load pending actions from IndexedDB on mount
  useEffect(() => {
    const loadPendingActions = async () => {
      try {
        const actions = await db.table('offline_actions').toArray();
        setPendingActions(actions);
      } catch (error) {
        console.error('Failed to load pending actions:', error);
      }
    };
    loadPendingActions();
  }, []);

  // Save pending action to IndexedDB
  const savePendingAction = useCallback(async (action: Omit<OfflineAction, 'id' | 'timestamp'>) => {
    const fullAction: OfflineAction = {
      ...action,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      retryCount: 0
    };

    try {
      await db.table('offline_actions').add(fullAction);
      setPendingActions(prev => [...prev, fullAction]);
      return fullAction.id;
    } catch (error) {
      console.error('Failed to save pending action:', error);
      throw error;
    }
  }, []);

  // Execute a pending action
  const executeAction = useCallback(async (action: OfflineAction): Promise<boolean> => {
    try {
      switch (action.type) {
        case 'create':
          const { data, error } = await supabase
            .from(action.table)
            .insert(action.data)
            .select();
          if (error) throw error;
          break;

        case 'update':
          const { data: updateData, error: updateError } = await supabase
            .from(action.table)
            .update(action.data)
            .eq('id', action.data.id);
          if (updateError) throw updateError;
          break;

        case 'delete':
          const { error: deleteError } = await supabase
            .from(action.table)
            .delete()
            .eq('id', action.data.id);
          if (deleteError) throw deleteError;
          break;

        default:
          throw new Error(`Unknown action type: ${action.type}`);
      }

      // Remove successful action from pending list
      await db.table('offline_actions').delete(action.id);
      setPendingActions(prev => prev.filter(a => a.id !== action.id));
      return true;
    } catch (error) {
      console.error(`Failed to execute action ${action.id}:`, error);
      
      // Update retry count
      const updatedAction = { ...action, retryCount: (action.retryCount || 0) + 1 };
      await db.table('offline_actions').put(updatedAction);
      setPendingActions(prev => prev.map(a => a.id === action.id ? updatedAction : a));
      
      return false;
    }
  }, []);

  // Sync all pending actions when online
  const syncPendingActions = useCallback(async () => {
    if (networkStatus.isOffline || syncInProgress || pendingActions.length === 0) {
      return;
    }

    setSyncInProgress(true);
    console.log(`🔄 Syncing ${pendingActions.length} pending actions...`);

    try {
      const results = await Promise.allSettled(
        pendingActions.map(action => executeAction(action))
      );

      const successful = results.filter(r => r.status === 'fulfilled' && r.value).length;
      const failed = results.length - successful;

      console.log(`✅ Sync complete: ${successful} successful, ${failed} failed`);

      if (failed > 0) {
        console.warn(`⚠️ ${failed} actions failed to sync and will be retried later`);
      }
    } catch (error) {
      console.error('❌ Sync failed:', error);
    } finally {
      setSyncInProgress(false);
    }
  }, [networkStatus.isOffline, syncInProgress, pendingActions, executeAction]);

  // Auto-sync when coming back online
  useEffect(() => {
    if (networkStatus.isOnline && pendingActions.length > 0 && !syncInProgress) {
      // Small delay to ensure network is fully available
      const timeoutId = setTimeout(() => {
        syncPendingActions();
      }, 1000);

      return () => clearTimeout(timeoutId);
    }
  }, [networkStatus.isOnline, pendingActions.length, syncInProgress, syncPendingActions]);

  // Add action to queue (for offline operations)
  const queueAction = useCallback(async (
    type: 'create' | 'update' | 'delete',
    table: string,
    data: any
  ): Promise<string | null> => {
    if (networkStatus.isOnline) {
      try {
        // Try to execute immediately if online
        const action: OfflineAction = {
          id: `temp-${Date.now()}`,
          type,
          table,
          data,
          timestamp: Date.now(),
          retryCount: 0
        };

        const success = await executeAction(action);
        if (success) {
          return null; // No pending action needed
        }
      } catch (error) {
        console.warn('Direct execution failed, queuing for later:', error);
      }
    }

    // Queue for later (offline or online but failed)
    return await savePendingAction({ type, table, data });
  }, [networkStatus.isOnline, executeAction, savePendingAction]);

  // Get offline data from IndexedDB
  const getOfflineData = useCallback(async (table: string, id?: string) => {
    try {
      if (id) {
        return await db.table(table).get(id);
      }
      return await db.table(table).toArray();
    } catch (error) {
      console.error(`Failed to get offline data from ${table}:`, error);
      return null;
    }
  }, []);

  // Save data to IndexedDB for offline access
  const saveOfflineData = useCallback(async (table: string, data: any) => {
    try {
      if (Array.isArray(data)) {
        await db.table(table).bulkPut(data);
      } else {
        await db.table(table).put(data);
      }
    } catch (error) {
      console.error(`Failed to save offline data to ${table}:`, error);
      throw error;
    }
  }, []);

  return {
    isOfflineMode,
    pendingActions,
    syncInProgress,
    queueAction,
    syncPendingActions,
    getOfflineData,
    saveOfflineData,
    hasPendingActions: pendingActions.length > 0
  };
};
