// Network diagnostics and connectivity helper
export class NetworkDiagnostics {
  private static instance: NetworkDiagnostics;
  private isOnline: boolean = navigator.onLine;
  private lastCheck: number = 0;
  private checkInterval: number = 30000; // 30 seconds

  constructor() {
    this.setupEventListeners();
  }

  static getInstance(): NetworkDiagnostics {
    if (!NetworkDiagnostics.instance) {
      NetworkDiagnostics.instance = new NetworkDiagnostics();
    }
    return NetworkDiagnostics.instance;
  }

  private setupEventListeners() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      console.log('Network connection restored');
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      console.log('Network connection lost');
    });
  }

  // Test Supabase connectivity
  async testSupabaseConnectivity(): Promise<{ reachable: boolean; error?: string; latency?: number }> => {
    const startTime = Date.now();
    
    try {
      const response = await fetch('https://iicckcocrghquwoxtnry.supabase.co/rest/v1/', {
        method: 'HEAD',
        mode: 'no-cors',
        cache: 'no-cache'
      });
      
      const latency = Date.now() - startTime;
      return { reachable: true, latency };
    } catch (error) {
      return { 
        reachable: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Test general internet connectivity
  async testInternetConnectivity(): Promise<boolean> {
    try {
      const response = await fetch('https://api.github.com', { method: 'HEAD' });
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  // Comprehensive network check
  async performNetworkCheck(): Promise<{
    online: boolean;
    internet: boolean;
    supabase: boolean;
    supabaseError?: string;
    latency?: number;
  }> {
    const [internetReachable, supabaseResult] = await Promise.all([
      this.testInternetConnectivity(),
      this.testSupabaseConnectivity()
    ]);

    return {
      online: this.isOnline,
      internet: internetReachable,
      supabase: supabaseResult.reachable,
      supabaseError: supabaseResult.error,
      latency: supabaseResult.latency
    };
  }

  // Get current status
  getStatus(): { online: boolean; lastCheck: number } {
    return {
      online: this.isOnline,
      lastCheck: this.lastCheck
    };
  }

  // Start periodic checks
  startPeriodicChecks(callback: (status: any) => void) {
    setInterval(async () => {
      const status = await this.performNetworkCheck();
      this.lastCheck = Date.now();
      callback(status);
    }, this.checkInterval);
  }
}

export const networkDiagnostics = NetworkDiagnostics.getInstance();
