// PWA Service Worker Registration and Install Prompt
export class PWAManager {
  private deferredPrompt: any = null;
  private isInstallable = false;

  constructor() {
    this.registerServiceWorker();
    this.setupInstallPrompt();
  }

  // Register service worker
  private async registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('Service Worker registered successfully:', registration);

        // Check for service worker updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New content is available, show update notification
                this.showUpdateNotification();
              }
            });
          }
        });

        // Listen for controlled pages to refresh
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          console.log('Service Worker controller changed, refreshing page');
          window.location.reload();
        });

      } catch (error) {
        console.error('Service Worker registration failed:', error);
      }
    }
  }

  // Setup PWA install prompt
  private setupInstallPrompt() {
    window.addEventListener('beforeinstallprompt', (e) => {
      console.log('PWA install prompt detected');
      e.preventDefault();
      this.deferredPrompt = e;
      this.isInstallable = true;
    });

    // Track successful installation
    window.addEventListener('appinstalled', () => {
      console.log('PWA was installed successfully');
      this.isInstallable = false;
      this.deferredPrompt = null;
    });
  }

  // Show install prompt
  async showInstallPrompt(): Promise<boolean> {
    if (!this.deferredPrompt || !this.isInstallable) {
      return false;
    }

    try {
      this.deferredPrompt.prompt();
      const { outcome } = await this.deferredPrompt.userChoice;
      console.log(`User response to install prompt: ${outcome}`);
      
      this.deferredPrompt = null;
      this.isInstallable = false;
      
      return outcome === 'accepted';
    } catch (error) {
      console.error('Error showing install prompt:', error);
      return false;
    }
  }

  // Check if PWA is installable
  canInstall(): boolean {
    return this.isInstallable;
  }

  // Check if running as PWA
  isPWA(): boolean {
    return window.matchMedia('(display-mode: standalone)').matches || 
           (window.navigator as any).standalone === true;
  }

  // Show update notification
  private showUpdateNotification() {
    // Create a simple notification for updates
    const notification = document.createElement('div');
    notification.className = 'fixed top-4 left-4 right-4 bg-indigo-600 text-white p-4 rounded-lg shadow-lg z-[9999] flex items-center justify-between';
    notification.innerHTML = `
      <div>
        <p class="font-bold">App Update Available</p>
        <p class="text-sm">A new version of Trippings is ready to install.</p>
      </div>
      <div class="flex gap-2">
        <button id="update-dismiss" class="px-3 py-1 bg-white/20 rounded hover:bg-white/30">Later</button>
        <button id="update-reload" class="px-3 py-1 bg-white text-indigo-600 rounded hover:bg-indigo-50">Update</button>
      </div>
    `;

    document.body.appendChild(notification);

    // Add event listeners
    const dismissBtn = document.getElementById('update-dismiss');
    const reloadBtn = document.getElementById('update-reload');

    dismissBtn?.addEventListener('click', () => {
      notification.remove();
    });

    reloadBtn?.addEventListener('click', () => {
      window.location.reload();
    });

    // Auto-remove after 10 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, 10000);
  }

  // Request notification permission
  async requestNotificationPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      console.log('This browser does not support notifications');
      return 'denied';
    }

    if (Notification.permission === 'granted') {
      return 'granted';
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission;
    }

    return 'denied';
  }

  // Show push notification
  async showNotification(title: string, options?: NotificationOptions) {
    const permission = await this.requestNotificationPermission();
    
    if (permission === 'granted') {
      try {
        await new Notification(title, {
          icon: '/assets/logo-192x192.png',
          badge: '/assets/logo-96x96.png',
          ...options
        });
      } catch (error) {
        console.error('Error showing notification:', error);
      }
    }
  }

  // Check network status
  isOnline(): boolean {
    return navigator.onLine;
  }

  // Listen for network changes
  onNetworkChange(callback: (online: boolean) => void) {
    window.addEventListener('online', () => callback(true));
    window.addEventListener('offline', () => callback(false));
  }
}

// Export singleton instance
export const pwaManager = new PWAManager();
