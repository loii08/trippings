
import React, { useState, useEffect, useCallback } from 'react';
import Layout from './components/Layout';
import Auth from './features/Auth';
import Dashboard from './features/Dashboard';
import NewTrip from './features/NewTrip';
import TripDetail from './features/TripDetail';
import Logo from './components/Logo';
import Loading from './components/Loading';
import ConfirmModal from './components/ConfirmModal';
import type { ConfirmModalType } from './components/ConfirmModal';
import { User, ThemeMode, AppNotification, PlanStatus, TripInvitation, NotificationType } from './types';
import { authService } from './services/authService';
import { supabase } from './lib/supabase';
import { db } from './db/db';
import { useTrips } from './hooks/useTrips';
import { useTripDetail } from './hooks/useTripDetail';
import { useSettings } from './hooks/useSettings';
import { updateFavicon, updatePWAIcons } from './lib/assets';
import { 
  Settings, 
  Bell, 
  Moon, 
  Sun, 
  Monitor, 
  PhilippinePeso, 
  CreditCard, 
  ChevronRight,
  ShieldCheck,
  Map,
  LogOut,
  Wallet,
  Edit2,
  Check,
  X,
  Users,
  MapPin,
  Calendar
} from 'lucide-react';

// Import toast system
import { showToast, subscribeToToasts, getToasts } from './toast-system';

const APP_VERSION = '2.8.0 (Supabase)';
type View = 'dashboard' | 'new-trip' | 'trip-detail' | 'profile' | 'settings';

// Format dates for display
const formatDate = (dateString: string) => {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  });
};

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [theme, setTheme] = useState<ThemeMode>('light');
  const [currentView, setCurrentView] = useState<'dashboard' | 'new-trip' | 'trip-detail'>('dashboard');
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [invitationModal, setInvitationModal] = useState<{ open: boolean; invitation: TripInvitation }>({ open: false, invitation: {} as TripInvitation });
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    type: ConfirmModalType;
    title: string;
    message: string;
    confirmText: string;
    cancelText: string;
    onConfirm: () => Promise<void> | void;
  }>({
    open: false,
    type: 'info',
    title: '',
    message: '',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    onConfirm: () => {}
  });
  
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [loadingUser, setLoadingUser] = useState(true);
  const [systemVersion, setSystemVersion] = useState('');
  const [activeDetailTab, setActiveDetailTab] = useState('itinerary');

  const { settings, updateSettings, sendNotification: sendBrowserNotification } = useSettings();
  const { trips, loading: loadingTrips, addTrip, deleteTrip } = useTrips(user?.email, user?.id);
  
  const { 
    trip: activeTrip, 
    itinerary, 
    expenses, 
    activityLogs,
    addItinerary,
    updateItineraryStatus,
    deleteItinerary,
    addExpense,
    deleteExpense
  } = useTripDetail(selectedTripId || '');

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    
    try {
      // Fetch from Supabase notifications table
      const { data: supabaseNotifications, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .eq('cleared', false)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      // Convert to AppNotification format
      const appNotifications: AppNotification[] = (supabaseNotifications || []).map(n => ({
        id: n.id,
        userId: n.user_id,
        title: n.title,
        body: n.body,
        timestamp: new Date(n.created_at).getTime(),
        read: n.read,
        cleared: n.cleared || false,
        type: n.type as AppNotification['type'],
        targetId: n.target_id,
        targetType: n.target_type as AppNotification['targetType']
      }));

      setNotifications(appNotifications);
    } catch (error) {
      console.error('Error fetching notifications from Supabase:', error);
      // Fallback to IndexedDB
      const items = await db.notifications
        .where('userId')
        .equals(user.id)
        .reverse()
        .sortBy('timestamp');
      setNotifications(items);
    }
  }, [user]);

  const addInAppNotification = useCallback(async (title: string, body: string, options?: { type?: AppNotification['type'], targetId?: string, targetType?: AppNotification['targetType'] }) => {
    if (!user) return;
    const newNotif: AppNotification = {
      id: crypto.randomUUID(),
      userId: user.id,
      title,
      body,
      timestamp: Date.now(),
      read: false,
      type: options?.type || 'info',
      targetId: options?.targetId,
      targetType: options?.targetType
    };
    await db.notifications.add(newNotif);
    await fetchNotifications();
  }, [user, fetchNotifications]);

  // Make notification refresh globally available
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).refreshNotifications = fetchNotifications;
    }
  }, [fetchNotifications]);

  // Subscribe to toast notifications
  useEffect(() => {
    const unsubscribe = subscribeToToasts(() => {
      setToasts([...getToasts()]);
    });
    
    return unsubscribe;
  }, []);

  const notify = useCallback((title: string, options: { body: string, type?: AppNotification['type'], targetId?: string, targetType?: AppNotification['targetType'] }) => {
    sendBrowserNotification(title, options);
    addInAppNotification(title, options.body, options);
  }, [sendBrowserNotification, addInAppNotification]);

  // Invitation handling functions
  const handleAcceptInvitation = async (invitation: TripInvitation) => {
    if (!user) return;
    
    try {
      // Update share status to 'accepted'
      const { error: shareError } = await supabase
        .from('shares')
        .update({ status: 'accepted' })
        .eq('trip_id', invitation.tripId)
        .eq('user_email', user.email);

      if (shareError) throw shareError;

      // Get trip details to find owner
      const { data: tripData } = await supabase
        .from('trips')
        .select('user_id')
        .eq('id', invitation.tripId)
        .single();

      // Notify the trip owner
      if (tripData?.user_id) {
        await supabase.rpc('create_trip_notification', {
          p_user_id: tripData.user_id,
          p_title: 'Invitation Accepted',
          p_body: `${user.name || user.username} accepted your invitation to collaborate on "${invitation.tripTitle}"`,
          p_target_id: invitation.tripId
        });
      }

      // Close modal
      setInvitationModal({ open: false, invitation: null });
      
      // Refresh notifications to show latest updates
      if (typeof window !== 'undefined' && (window as any).refreshNotifications) {
        (window as any).refreshNotifications();
      }
    } catch (error) {
      console.error('Error accepting invitation:', error);
      showToast('Failed to accept invitation. Please try again.', 'error');
    }
  };

  const handleRejectInvitation = async (invitation: TripInvitation) => {
    if (!user) return;
    
    try {
      // Update the share record status to 'rejected'
      const { error: shareError } = await supabase
        .from('shares')
        .update({ status: 'rejected' })
        .eq('trip_id', invitation.tripId)
        .eq('user_email', user.email);

      if (shareError) throw shareError;

      // Get trip details to find owner
      const { data: tripData } = await supabase
        .from('trips')
        .select('user_id')
        .eq('id', invitation.tripId)
        .single();

      // Notify the trip owner
      if (tripData?.user_id) {
        await supabase.rpc('create_trip_notification', {
          p_user_id: tripData.user_id,
          p_title: 'Invitation Rejected',
          p_body: `${user.name || user.username} declined your invitation to collaborate on "${invitation.tripTitle}"`,
          p_target_id: invitation.tripId
        });
      }

      // Close modal
      setInvitationModal({ open: false, invitation: null });
      
      // Refresh notifications to show latest updates
      if (typeof window !== 'undefined' && (window as any).refreshNotifications) {
        (window as any).refreshNotifications();
      }
    } catch (error) {
      console.error('Error rejecting invitation:', error);
      showToast('Failed to reject invitation. Please try again.', 'error');
    }
  };

  useEffect(() => {
    const init = async () => {
      // Initialize Session with local auth
      const currentUser = await authService.getCurrentUser();
      if (currentUser) {
        setUser(currentUser);
      }

      try {
        const storedVersion = await db.metadata.get('app_version');
        if (!storedVersion || storedVersion.value !== APP_VERSION) {
          await db.metadata.put({ key: 'app_version', value: APP_VERSION });
          setSystemVersion(APP_VERSION);
        } else {
          setSystemVersion(storedVersion.value);
        }
      } catch (err) {
        setSystemVersion(APP_VERSION);
      }
      setLoadingUser(false);
    };
    init();
  }, []);

  useEffect(() => {
    if (user) {
      fetchNotifications();
      setEditName(user.name || '');
      setEditUsername(user.username);
    }
  }, [user, fetchNotifications]);

  // Update theme-aware assets when theme changes
  useEffect(() => {
    const updateAssets = () => {
      updateFavicon();
      updatePWAIcons();
    };

    // Initial update
    updateAssets();

    // Listen for theme changes
    const observer = new MutationObserver(() => {
      updateAssets();
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });

    return () => observer.disconnect();
  }, []);

  const handleNavigate = (view: View, params?: any) => {
    setCurrentView(view);
    if (params?.tripId) setSelectedTripId(params.tripId);
    if (params?.tab) setActiveDetailTab(params.tab);
    else setActiveDetailTab('itinerary');
  };

  const handleLogin = async (identifier: string, password?: string) => {
    const loggedUser = await authService.login(identifier, password);
    if (loggedUser) {
      setUser(loggedUser);
      setCurrentView('dashboard');
      notify("Welcome back!", { body: `Logged in as ${loggedUser.username}` });
    } else {
      throw new Error("Invalid credentials");
    }
  };

  const handleGoogleLogin = async () => {
    await authService.loginWithGoogle();
  };

  const handleLogout = async () => {
    await authService.logout();
    setUser(null);
    setCurrentView('dashboard');
    setNotifications([]);
  };

  const handleUpdateProfile = async () => {
    if (!user) return;
    const updated = await authService.updateUser(user.id, {
      name: editName,
      username: editUsername
    });
    if (updated) {
      setUser(updated);
      setIsEditingProfile(false);
      notify("Profile Updated", { body: "Your details have been saved successfully.", type: 'success' });
    }
  };

  const handleNewTripSubmit = async (data: any) => {
    const newTrip = await addTrip(data);
    if (newTrip) {
      setSelectedTripId(newTrip.id);
      setCurrentView('trip-detail');
      setActiveDetailTab('itinerary');
      notify("New Trip Created!", { 
        body: `Adventure to ${data.destination || data.title} is now in your itinerary.`,
        type: 'success',
        targetId: newTrip.id,
        targetType: 'trip'
      });
    }
  };

  if (loadingUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-950">
        <Loading size="large" />
      </div>
    );
  }

  if (!user) {
    return <Auth onLogin={handleLogin} onGoogleLogin={handleGoogleLogin} />;
  }

  // Invitation Modal
  const handleInvitationNotification = async (notif: AppNotification) => {
    try {
      // Fetch trip details
      let tripDetails = null;
      let isOwner = false;
      
      if (notif.targetId) {
        const { data } = await supabase
          .from('trips')
          .select('title, destination, start_date, end_date, user_id')
          .eq('id', notif.targetId)
          .single();
        tripDetails = data;
        
        // Check if user is the owner
        isOwner = data?.user_id === user?.id;
      }

      // Check share status for the invitation
      let shareStatus = 'pending';
      if (notif.targetId) {
        try {
          // Extract invitee email from notification body
          // Notification format: "User invited you to collaborate on Trip" or "User rejected your invitation"
          let inviteeEmail = '';
          
          if (notif.body.includes('invited you to collaborate')) {
            // This is an invitation to the current user
            inviteeEmail = user?.email || '';
          } else if (notif.body.includes('declined your invitation') || notif.body.includes('rejected your invitation') || notif.body.includes('accepted your invitation')) {
            // This is about someone else's response - extract their name and find their email
            const nameMatch = notif.body.match(/^(\w+)\s+(declined|rejected|accepted)/);
            
            if (nameMatch) {
              const responderName = nameMatch[1].toLowerCase();
              
              // Get all shares for this trip to find the responder
              const { data: allShares } = await supabase
                .from('shares')
                .select('user_email, status')
                .eq('trip_id', notif.targetId);
              
              if (allShares && allShares.length > 0) {
                // Get user details for all shares to match names properly
                const userEmails = allShares.map(s => s.user_email);
                const { data: usersData } = await supabase
                  .from('users')
                  .select('email, name, username')
                  .in('email', userEmails);
                
                // Find the share that matches the responder name
                const matchingShare = allShares.find(share => {
                  const user = usersData?.find(u => u.email === share.user_email);
                  if (user) {
                    return user.name?.toLowerCase() === responderName || 
                           user.username?.toLowerCase() === responderName;
                  }
                  return false;
                });
                
                if (matchingShare) {
                  shareStatus = matchingShare.status;
                }
              }
            }
          } else {
            // Default to current user's email
            inviteeEmail = user?.email || '';
          }
          
          // If we have an invitee email, query their status
          if (inviteeEmail) {
            const { data: shareData, error } = await supabase
              .from('shares')
              .select('status')
              .eq('trip_id', notif.targetId)
              .eq('user_email', inviteeEmail);
            
            if (shareData && Array.isArray(shareData) && shareData.length > 0) {
              shareStatus = (shareData as any)[0].status;
            }
          }
        } catch (err) {
          console.error('Error fetching share status:', err);
        }
      }

      // Parse invitation data from notification body or create mock invitation
      const invitation: TripInvitation = {
        id: notif.id,
        tripId: notif.targetId || '',
        tripTitle: tripDetails?.title || notif.title.replace('Trip Invitation: ', ''),
        tripLocation: tripDetails?.destination || '',
        tripStartDate: tripDetails?.start_date || '',
        tripEndDate: tripDetails?.end_date || '',
        inviterName: 'Trip Creator', // Extract from notification body if possible
        inviterId: '',
        inviteeEmail: user?.email || '',
        status: shareStatus as 'pending' | 'accepted' | 'rejected' | 'owner',
        isOwner,
        createdAt: notif.timestamp
      };
      
      // Try to extract inviter name from notification body
      const bodyMatch = notif.body.match(/^(\w+)\s+invited you/);
      if (bodyMatch) {
        invitation.inviterName = bodyMatch[1];
      }
      
      setInvitationModal({ open: true, invitation });
    } catch (error) {
      console.error('Error fetching trip details:', error);
      // Fallback to basic invitation
      const invitation: TripInvitation = {
        id: notif.id,
        tripId: notif.targetId || '',
        tripTitle: notif.title.replace('Trip Invitation: ', ''),
        tripLocation: '',
        inviterName: 'Trip Creator',
        inviterId: '',
        inviteeEmail: user?.email || '',
        status: 'pending',
        createdAt: notif.timestamp
      };
      setInvitationModal({ open: true, invitation });
    }
  };

  const onMarkNotificationRead = async (id: string) => {
    try {
      // Update Supabase
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', id);

      if (error) throw error;

      // Update local state
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, read: true } : n)
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const onClearNotification = async (id: string) => {
    try {
      // Update Supabase
      const { error } = await supabase
        .from('notifications')
        .update({ cleared: true })
        .eq('id', id);

      if (error) throw error;

      // Update local state
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, cleared: true } : n)
      );
    } catch (error) {
      console.error('Error clearing notification:', error);
    }
  };

  const onClearAllNotifications = async () => {
    try {
      // Update Supabase
      const { error } = await supabase
        .from('notifications')
        .update({ cleared: true })
        .eq('user_id', user?.id);

      if (error) throw error;

      // Update local state
      setNotifications(prev => 
        prev.map(n => ({ ...n, cleared: true }))
      );
    } catch (error) {
      console.error('Error clearing all notifications:', error);
    }
  };

  const onMarkAllRead = async () => {
    try {
      // Update all in Supabase
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.id);
      
      // Update local state
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  return (
    <Layout 
      user={user} 
      onLogout={handleLogout} 
      onNavigate={handleNavigate as any}
      currentView={currentView}
      notifications={notifications}
      onMarkNotificationRead={onMarkNotificationRead}
      onClearNotification={onClearNotification}
      onClearAllNotifications={onClearAllNotifications}
      onInvitationClick={handleInvitationNotification}
      onMarkAllRead={onMarkAllRead}
    >
      {currentView === 'dashboard' && (
        <Dashboard 
          trips={trips} 
          loading={loadingTrips} 
          onSelectTrip={(id) => { setSelectedTripId(id); setCurrentView('trip-detail'); setActiveDetailTab('itinerary'); }}
          onNewTrip={() => setCurrentView('new-trip')}
          onDeleteTrip={deleteTrip}
          currentUserId={user?.id || ''}
        />
      )}

      {currentView === 'new-trip' && (
        <NewTrip 
          onSubmit={handleNewTripSubmit} 
          onCancel={() => setCurrentView('dashboard')} 
          currencySymbol={settings.currencySymbol}
        />
      )}

      {currentView === 'trip-detail' && selectedTripId && activeTrip && (
        <TripDetail 
          tripId={selectedTripId}
          trip={activeTrip}
          user={user}
          itinerary={itinerary}
          expenses={expenses}
          activityLogs={activityLogs}
          onBack={() => setCurrentView('dashboard')}
          initialTab={activeDetailTab}
          onAddItinerary={async (d, u) => { await addItinerary(d, u); notify("Plan Added", { body: d.title, targetId: selectedTripId, targetType: 'trip' }); }}
          onUpdateItineraryStatus={async (id, s, u) => { await updateItineraryStatus(id, s, u); notify("Status Updated", { body: `Item marked as ${s}`, targetId: selectedTripId, targetType: 'trip' }); }}
          onDeleteItinerary={async (id, u) => { await deleteItinerary(id, u); notify("Item Removed", { body: "Deleted from timeline" }); }}
          onAddExpense={async (d, u) => { await addExpense(d, u); notify("Expense Logged", { body: `${settings.currencySymbol}${d.amount}`, targetId: selectedTripId, targetType: 'trip' }); }}
          onDeleteExpense={async (id, u) => { await deleteExpense(id, u); notify("Expense Removed", { body: "Deleted from logs" }); }}
          currencySymbol={settings.currencySymbol}
        />
      )}

      {currentView === 'profile' && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-2xl mx-auto">
          <div className="relative pt-24 pb-12">
            <div className="absolute top-0 left-0 right-0 h-48 bg-gradient-to-br from-indigo-500 to-indigo-800 rounded-[2.5rem] -z-10 shadow-lg"></div>
            
            <div className="flex flex-col items-center text-center">
              <div className="relative">
                <div 
                  className="w-24 h-24 bg-gradient-to-br from-indigo-400 to-indigo-600 rounded-full flex items-center justify-center text-white text-3xl font-black shadow-xl border-4 border-white dark:border-slate-900"
                >
                  {user.username.charAt(0).toUpperCase()}
                </div>
                <button 
                  onClick={() => setIsEditingProfile(!isEditingProfile)}
                  className="absolute -top-1 -right-1 bg-white dark:bg-slate-800 p-2 rounded-xl shadow-lg border-4 border-slate-50 dark:border-slate-900 text-slate-400 hover:text-indigo-600 transition-colors"
                >
                  {isEditingProfile ? <X size={16} /> : <Edit2 size={16} />}
                </button>
              </div>

              {isEditingProfile ? (
                <div className="w-full max-w-xs space-y-3 bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-800 animate-in zoom-in-95 duration-200">
                   <div className="space-y-1 text-left">
                     <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Full Name</label>
                     <input value={editName} onChange={(e)=>setEditName(e.target.value)} placeholder="Your Name" className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 dark:text-white outline-none focus:ring-2 ring-indigo-500/20" />
                   </div>
                   <div className="space-y-1 text-left">
                     <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Username</label>
                     <input value={editUsername} onChange={(e)=>setEditUsername(e.target.value)} placeholder="Username" className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 dark:text-white outline-none focus:ring-2 ring-indigo-500/20" />
                   </div>
                   <button onClick={handleUpdateProfile} className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2">
                     <Check size={18} /> Save Changes
                   </button>
                </div>
              ) : (
                <>
                  <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-1">{user.name || user.username}</h1>
                  <p className="text-slate-500 dark:text-slate-400 font-medium">@{user.username} • {user.email}</p>
                </>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
             <StatCard label="Trips" value={trips.length} icon={<Map size={20} />} />
             <StatCard label="Volume" value={`${settings.currencySymbol}${(trips.reduce((acc, t) => acc + (t.budget || 0), 0) / 1000).toFixed(1)}k`} icon={<Wallet size={20} />} />
             <StatCard label="Badge" value="Explorer" icon={<ShieldCheck size={20} />} color="text-emerald-500" />
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-4 border border-slate-100 dark:border-slate-800 shadow-sm space-y-1">
            <ProfileAction icon={<Settings className="text-blue-500" size={20} />} label="App Settings" onClick={() => setCurrentView('settings')} />
            <ProfileAction icon={<CreditCard className="text-indigo-500" size={20} />} label="Billing & Subscriptions" onClick={() => {}} />
            <ProfileAction icon={<ShieldCheck className="text-emerald-500" size={20} />} label="Privacy & Security" onClick={() => {}} />
            <div className="h-px bg-slate-100 dark:bg-slate-800 my-2 mx-4" />
            <ProfileAction icon={<LogOut className="text-red-500" size={20} />} label="Sign Out" onClick={handleLogout} />
          </div>

          <p className="text-center text-slate-400 text-[10px] font-bold uppercase tracking-widest">Version {systemVersion}</p>
        </div>
      )}

      {currentView === 'settings' && (
        <div className="space-y-6 animate-in slide-in-from-right duration-300 max-w-xl mx-auto">
          <div className="flex items-center gap-4">
             <button onClick={() => setCurrentView('profile')} className="p-3 bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-2xl transition-all">
                <ChevronRight className="rotate-180" size={20} />
             </button>
             <h1 className="text-2xl font-black dark:text-white">Settings</h1>
          </div>
          <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-2xl">
                <PhilippinePeso size={20} />
              </div>
              <h3 className="font-black text-lg dark:text-white">Currency</h3>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[ { id: 'PHP', symbol: '₱' }, { id: 'USD', symbol: '$' }, { id: 'EUR', symbol: '€' } ].map(curr => (
                <button
                  key={curr.id}
                  onClick={() => updateSettings({ currency: curr.id, currencySymbol: curr.symbol })}
                  className={`py-3 rounded-2xl border-2 transition-all font-bold ${settings.currency === curr.id ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400' : 'border-slate-50 dark:border-slate-800 text-slate-400'}`}
                >
                  {curr.symbol} {curr.id}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      
      {/* Invitation Modal */}
      {invitationModal.open && invitationModal.invitation && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[9999]">
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-8 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-950/20 flex items-center justify-center text-indigo-500">
                  <Users size={24} strokeWidth={2.5} />
                </div>
                <h2 className="text-xl font-black text-slate-900 dark:text-white">Trip Invitation</h2>
              </div>
              <button
                onClick={() => setInvitationModal({ open: false, invitation: null })}
                className="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
              >
                <X size={16} strokeWidth={2.5} />
              </button>
            </div>
            
            <div className="space-y-6">
              <div>
                <p className="text-slate-600 dark:text-slate-400 font-medium mb-4">
                  <span className="font-bold text-slate-900 dark:text-white">{invitationModal.invitation.inviterName}</span> has invited you to collaborate on:
                </p>
                <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl">
                  <h3 className="font-black text-lg text-slate-900 dark:text-white mb-2">{invitationModal.invitation.tripTitle}</h3>
                  {invitationModal.invitation.tripLocation && (
                    <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-2 mb-2">
                      <MapPin size={14} />
                      {invitationModal.invitation.tripLocation}
                    </p>
                  )}
                  {(invitationModal.invitation.tripStartDate || invitationModal.invitation.tripEndDate) && (
                    <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-2">
                      <Calendar size={14} />
                      {invitationModal.invitation.tripStartDate && formatDate(invitationModal.invitation.tripStartDate)}
                      {invitationModal.invitation.tripStartDate && invitationModal.invitation.tripEndDate && ' - '}
                      {invitationModal.invitation.tripEndDate && formatDate(invitationModal.invitation.tripEndDate)}
                    </p>
                  )}
                </div>
              </div>
              
              <div className="flex gap-3 pt-4">
                {invitationModal.invitation.isOwner ? (
                  // Owner view - only show status
                  <div className="flex-1 text-center">
                    <span className={`inline-flex px-4 py-2 rounded-xl font-bold text-sm ${
                      invitationModal.invitation.status === 'owner' ? 'bg-blue-100 text-blue-600' :
                      invitationModal.invitation.status === 'pending' ? 'bg-yellow-100 text-yellow-600' :
                      invitationModal.invitation.status === 'accepted' ? 'bg-green-100 text-green-600' :
                      invitationModal.invitation.status === 'rejected' ? 'bg-red-100 text-red-600' :
                      'bg-slate-100 text-slate-600'
                    }`}>
                      Status: {invitationModal.invitation.status === 'owner' ? 'Owner' : invitationModal.invitation.status.charAt(0).toUpperCase() + invitationModal.invitation.status.slice(1)}
                    </span>
                  </div>
                ) : invitationModal.invitation.status === 'pending' ? (
                  // Collaborator view with pending status - show accept/reject buttons
                  <>
                    <button
                      onClick={() => handleRejectInvitation(invitationModal.invitation)}
                      className="flex-1 px-5 py-3 rounded-xl font-bold text-sm bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => handleAcceptInvitation(invitationModal.invitation)}
                      className="flex-1 px-5 py-3 rounded-xl font-bold text-sm bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
                    >
                      Accept
                    </button>
                  </>
                ) : (
                  // Collaborator view with accepted/rejected status - only show status
                  <div className="flex-1 text-center">
                    <span className={`inline-flex px-4 py-2 rounded-xl font-bold text-sm ${
                      invitationModal.invitation.status === 'accepted' ? 'bg-green-100 text-green-600' :
                      invitationModal.invitation.status === 'rejected' ? 'bg-red-100 text-red-600' :
                      'bg-slate-100 text-slate-600'
                    }`}>
                      Status: {invitationModal.invitation.status.charAt(0).toUpperCase() + invitationModal.invitation.status.slice(1)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Toast Notifications */}
      <div className="fixed top-4 right-4 z-[9999] space-y-2">
        {toasts.map((toast: any) => (
          <div
            key={toast.id}
            className={`px-4 py-3 rounded-lg shadow-lg text-sm font-medium transition-all transform ${
              toast.type === 'success' ? 'bg-green-500 text-white' :
              toast.type === 'error' ? 'bg-red-500 text-white' :
              toast.type === 'warning' ? 'bg-yellow-500 text-black' :
              'bg-blue-500 text-white'
            }`}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </Layout>
  );
};

const StatCard = ({ label, value, icon, color = 'text-indigo-600 dark:text-indigo-400' }: any) => (
  <div className="bg-white dark:bg-slate-900 p-5 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col items-center text-center">
    <div className={`mb-2 ${color}`}>{icon}</div>
    <div className="text-2xl font-black dark:text-white">{value}</div>
    <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</div>
  </div>
);

const ProfileAction = ({ icon, label, onClick }: any) => (
  <button onClick={onClick} className="w-full flex items-center justify-between p-4 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
    <div className="flex items-center gap-4">
      <div className="p-2 bg-slate-50 dark:bg-slate-950 rounded-xl group-hover:scale-110 transition-transform">{icon}</div>
      <span className="font-bold text-slate-700 dark:text-slate-300 group-hover:text-indigo-600 transition-colors">{label}</span>
    </div>
    <ChevronRight size={18} className="text-slate-300 group-hover:translate-x-1 transition-transform" />
  </button>
);

export default App;
