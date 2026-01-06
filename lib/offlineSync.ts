// Offline sync manager for handling network state and data synchronization
export class OfflineSyncManager {
  private isOnline: boolean = navigator.onLine;
  private syncQueue: Array<() => Promise<any>> = [];
  private isSyncing: boolean = false;
  private lastSyncTimestamp: number = 0;

  constructor() {
    this.setupNetworkListeners();
    this.loadLastSyncTimestamp();
  }

  // Load last sync timestamp from localStorage
  private async loadLastSyncTimestamp() {
    try {
      const stored = localStorage.getItem('trippings_lastSync');
      if (stored) {
        this.lastSyncTimestamp = parseInt(stored, 10);
      }
    } catch (error) {
      console.warn('Failed to load last sync timestamp:', error);
    }
  }

  // Save last sync timestamp to localStorage
  private async saveLastSyncTimestamp() {
    try {
      localStorage.setItem('trippings_lastSync', this.lastSyncTimestamp.toString());
    } catch (error) {
      console.warn('Failed to save last sync timestamp:', error);
    }
  }

  // Setup network status listeners
  private setupNetworkListeners() {
    window.addEventListener('online', () => {
      console.log('Network connection restored');
      this.isOnline = true;
      this.processSyncQueue();
    });

    window.addEventListener('offline', () => {
      console.log('Network connection lost');
      this.isOnline = false;
    });
  }

  // Check if online
  get onlineStatus(): boolean {
    return this.isOnline;
  }

  // Add operation to sync queue
  async addToSyncQueue(operation: () => Promise<any>): Promise<any> {
    if (this.isOnline) {
      try {
        return await operation();
      } catch (error) {
        console.error('Operation failed, adding to sync queue:', error);
        this.syncQueue.push(operation);
        throw error;
      }
    } else {
      console.log('Offline - adding operation to sync queue');
      this.syncQueue.push(operation);
      // Return a resolved promise to prevent blocking UI
      return Promise.resolve({ offline: true, message: 'Operation queued for sync' });
    }
  }

  // Process all queued operations
  private async processSyncQueue() {
    if (this.isSyncing || this.syncQueue.length === 0) {
      return;
    }

    this.isSyncing = true;
    console.log(`Processing ${this.syncQueue.length} queued operations...`);

    try {
      while (this.syncQueue.length > 0) {
        const operation = this.syncQueue.shift();
        if (operation) {
          try {
            await operation();
            console.log('Synced operation successfully');
          } catch (error) {
            console.error('Failed to sync operation:', error);
            // Re-add to end of queue for retry (with max retry limit)
            if (this.syncQueue.length < 50) { // Prevent infinite queue growth
              this.syncQueue.push(operation);
            }
          }
        }
      }
      
      // Update sync timestamp after successful sync
      this.lastSyncTimestamp = Date.now();
      await this.saveLastSyncTimestamp();
    } finally {
      this.isSyncing = false;
    }
  }

  // Force sync all queued operations
  async forceSync(): Promise<void> {
    if (!this.isOnline) {
      throw new Error('Cannot sync while offline');
    }
    await this.processSyncQueue();
  }

  // Get sync queue status
  getSyncStatus(): { isOnline: boolean; queueLength: number; isSyncing: boolean } {
    return {
      isOnline: this.isOnline,
      queueLength: this.syncQueue.length,
      isSyncing: this.isSyncing
    };
  }

  // Clear sync queue
  clearSyncQueue(): void {
    this.syncQueue = [];
  }

  // Get last sync timestamp
  getLastSyncTimestamp(): number {
    return this.lastSyncTimestamp;
  }

  // Set last sync timestamp (for manual updates)
  setLastSyncTimestamp(timestamp: number): void {
    this.lastSyncTimestamp = timestamp;
    this.saveLastSyncTimestamp();
  }

  // Conflict resolution: server wins for now, can be enhanced later
  async resolveConflict(localData: any, serverData: any, entityType: string): Promise<any> {
    // Simple timestamp-based resolution: server wins if newer
    const localTime = new Date(localData.updated_at || localData.created_at).getTime();
    const serverTime = new Date(serverData.updated_at || serverData.created_at).getTime();
    
    if (serverTime > localTime) {
      console.log(`Conflict resolved for ${entityType}: server data is newer`);
      return serverData;
    } else {
      console.log(`Conflict resolved for ${entityType}: local data is newer or same age`);
      return localData;
    }
  }
}

// Export singleton instance
export const offlineSyncManager = new OfflineSyncManager();
