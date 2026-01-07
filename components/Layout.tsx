
import React, { useState, useRef, useEffect } from 'react';
import { User, AppNotification } from '../types';
import { supabase } from '../lib/supabase';
import { showToast } from '../toast-system';
import Logo from './Logo';
import { 
  LogOut, 
  Compass, 
  Briefcase, 
  Plus, 
  User as UserIcon, 
  LayoutDashboard,
  Bell,
  CheckCircle2,
  Clock,
  Trash2,
  X,
  ChevronRight
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  user: User;
  onLogout: () => void;
  onNavigate: (view: string, params?: any) => void;
  currentView: string;
  notifications: AppNotification[];
  onMarkNotificationRead: (id: string) => void;
  onMarkAllRead: () => void;
  onClearNotification: (id: string) => void;
  onClearAllNotifications: () => void;
  onInvitationClick?: (notif: AppNotification) => void;
}

const Layout: React.FC<LayoutProps> = ({ 
  children, 
  user, 
  onLogout, 
  onNavigate, 
  currentView, 
  notifications,
  onMarkNotificationRead,
  onMarkAllRead,
  onClearNotification,
  onClearAllNotifications,
  onInvitationClick
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const unreadCount = notifications.filter(n => !n.read && !n.cleared).length;
  const activeNotifications = notifications.filter(n => !n.cleared);
  const isAccountActive = currentView === 'profile' || currentView === 'settings';

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatTime = (ts: number) => {
    const mins = Math.floor((Date.now() - ts) / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return new Date(ts).toLocaleDateString();
  };

  const handleNotificationClick = async (notif: AppNotification) => {
    // Always mark as read
    onMarkNotificationRead(notif.id);
    
    // Don't close dropdown immediately for trip invitations
    if ((notif.type === 'trip_invitation' || notif.title.includes('Trip Invitation') || notif.body.includes('invited you to collaborate')) && onInvitationClick) {
      // Check if user still has access to this trip
      if (notif.targetId && user) {
        try {
          // First check if user is the trip owner
          const { data: tripData, error: tripError } = await supabase
            .from('trips')
            .select('user_id')
            .eq('id', notif.targetId)
            .single();
          
          // If user is the owner, allow access without checking shares
          if (!tripError && tripData?.user_id === user.id) {
            onInvitationClick(notif);
            return;
          }
          
          // If not owner, check if user has a share for this trip
          const { data: shareData, error: shareError } = await supabase
            .from('shares')
            .select('status')
            .eq('trip_id', notif.targetId)
            .eq('user_email', user.email)
            .single();
          
          // If user has access (share exists), allow clicking
          if (!shareError && shareData) {
            onInvitationClick(notif);
            return;
          }
        } catch (error) {
          console.error('Error checking trip access:', error);
        }
      }
      
      onInvitationClick(notif);
      // Close dropdown after a short delay to allow the modal to open
      setTimeout(() => setShowNotifications(false), 100);
      return;
    } else {
      setShowNotifications(false);
    }
    setShowNotifications(false);
    
    // Check for target data for deep linking
    if (notif.targetType === 'trip' && notif.targetId) {
      // Verify user still has access before navigating
      if (user) {
        try {
          const { data: shareData, error } = await supabase
            .from('shares')
            .select('status')
            .eq('trip_id', notif.targetId)
            .eq('user_email', user.email)
            .single();
          
          if (error || !shareData) {
            showToast('You no longer have access to this trip.', 'error');
            return;
          }
        } catch (err) {
          console.error('Error checking share access:', err);
          // If we can't check access, allow navigation to proceed
        }
      }
      
      onNavigate('trip-detail', { tripId: notif.targetId, tab: 'itinerary' });
    } else if (notif.targetType === 'expense' && notif.targetId) {
      onNavigate('trip-detail', { tripId: notif.targetId, tab: 'expenses' });
    } else if (notif.targetType === 'itinerary' && notif.targetId) {
      onNavigate('trip-detail', { tripId: notif.targetId, tab: 'itinerary' });
    } else if (currentView !== 'dashboard') {
      onNavigate('dashboard');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-surface text-primary transition-colors">
      
      {/* Modern Desktop Header */}
      <header className="hidden md:flex fixed top-0 left-0 right-0 h-20 z-50 px-8 items-center justify-between pointer-events-none">
        <div className="pointer-events-auto cursor-pointer group" onClick={() => onNavigate('dashboard')}>
          <Logo size="large" />
        </div> 
        {user && (
          <div className="bg-surface/80 backdrop-blur-xl border border-custom px-2 py-1.5 rounded-[1.25rem] shadow-sm pointer-events-auto flex items-center gap-1">
            <NavButton 
              active={currentView === 'dashboard'} 
              onClick={() => onNavigate('dashboard')}
              icon={<LayoutDashboard size={20} />}
              label="Trips"
            />
            <NavButton 
              active={currentView === 'new-trip'} 
              onClick={() => onNavigate('new-trip')}
              icon={<Plus size={20} />}
              label="Plan"
            />
            <div className="w-px h-6 bg-primary mx-1" />
            <NavButton 
              active={currentView === 'profile'} 
              onClick={() => onNavigate('profile')}
              icon={<UserIcon size={20} />}
              label="Profile"
            />
          </div>
        )}

        <div className="flex items-center gap-3 pointer-events-auto relative" ref={dropdownRef}>
          {user && (
            <>
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className={`p-3 transition-colors relative rounded-2xl ${showNotifications ? 'bg-primary-soft text-primary' : 'text-muted hover:text-primary'}`}
              >
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute top-2.5 right-2.5 w-4 h-4 bg-primary text-[10px] font-bold text-inverse flex items-center justify-center rounded-full border-2 border-surface">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Desktop Notification Popover */}
              {showNotifications && (
                <div ref={dropdownRef} className="absolute top-full right-0 mt-2 w-80 bg-surface border border-custom rounded-[2rem] shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 z-[60]">
                  <div className="p-4 border-b border-divider flex items-center justify-between">
                    <h3 className="font-bold">Notifications</h3>
                    <div className="flex gap-2">
                      {unreadCount > 0 && (
                        <button onClick={(e) => {
                          e.stopPropagation();
                          onMarkAllRead();
                        }} className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 hover:underline">Mark all as read</button>
                      )}
                      <button onClick={(e) => {
                        e.stopPropagation();
                        onClearAllNotifications();
                      }} className="text-[10px] font-bold uppercase tracking-wider text-red-600 dark:text-red-400 hover:underline">Clear all</button>
                    </div>
                  </div>
                  <div className="max-h-96 overflow-y-auto no-scrollbar">
                    {activeNotifications.length === 0 ? (
                      <div className="p-12 text-center text-muted">
                        <Bell size={32} className="mx-auto opacity-20 mb-2" />
                        <p className="text-xs font-medium">No activity yet</p>
                      </div>
                    ) : (
                      activeNotifications.map(notif => (
                        <div 
                          key={notif.id} 
                          onClick={() => handleNotificationClick(notif)}
                          className={`p-4 border-b border-custom/50 hover:bg-surface/50 transition-colors cursor-pointer relative ${!notif.read ? 'bg-primary-soft/30' : ''}`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              {!notif.read && <div className="absolute left-1 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-full" />}
                              <div className="flex gap-3">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${notif.read ? 'bg-primary-soft text-muted' : 'bg-primary-soft text-primary'}`}>
                                  <CheckCircle2 size={14} />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-bold text-primary leading-tight">{notif.title}</p>
                                  <p className="text-[11px] text-secondary mt-1 line-clamp-2">{notif.body}</p>
                                  <p className="text-[9px] text-muted mt-1 flex items-center gap-1"><Clock size={8} /> {formatTime(notif.timestamp)}</p>
                                </div>
                              </div>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onClearNotification(notif.id);
                              }}
                              className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-red-500 transition-colors"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              <div className="w-px h-6 bg-divider mx-1" />
              <button 
                onClick={onLogout}
                className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-primary-soft hover:bg-error/10 text-muted hover:text-error transition-all font-bold text-sm"
              >
                <LogOut size={16} />
                Sign Out
              </button>
            </>
          )}
        </div>
      </header>

      {/* Mobile Top Header - Respects Safe Area */}
      <header className="md:hidden sticky top-0 bg-surface/80 backdrop-blur-lg border-b border-custom z-[110] px-5 flex items-center justify-between pt-safe h-[calc(4rem+env(safe-area-inset-top))]">
        <div className="flex items-center" onClick={() => onNavigate('dashboard')}>
          <Logo size="medium" showText={false} />
        </div>
        <div className="flex items-center gap-2">
           <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className={`p-2.5 transition-colors rounded-xl relative ${showNotifications ? 'bg-primary-soft text-primary' : 'text-muted'}`}
           >
             <Bell size={20} />
             {unreadCount > 0 && <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-primary rounded-full border-2 border-surface"></span>}
           </button>
           <button 
            onClick={() => onNavigate('profile')}
            className="w-9 h-9 rounded-full bg-primary text-inverse flex items-center justify-center font-bold overflow-hidden shadow-inner"
          >
            {user ? user.username.charAt(0).toUpperCase() : <UserIcon size={20} />}
          </button>
        </div>
      </header>

      {/* Mobile Top-Anchored Notification Modal - Improved position & Safe Area */}
      {showNotifications && (
        <div 
          className="md:hidden fixed inset-0 z-[120] bg-slate-950/60 backdrop-blur-[4px] animate-in fade-in duration-300"
          onClick={() => setShowNotifications(false)}
        >
          <div 
            className="absolute top-[calc(4.5rem+env(safe-area-inset-top))] left-4 right-4 bg-surface rounded-[2.5rem] max-h-[75vh] flex flex-col shadow-2xl animate-in slide-in-from-top-12 duration-500 overflow-hidden border border-custom"
            onClick={(e) => e.stopPropagation()}
          >
             <div className="p-5 border-b border-divider flex items-center justify-between bg-surface">
                <div>
                  <h3 className="text-lg font-black text-primary">Recent Activity</h3>
                  {unreadCount > 0 && <p className="text-[10px] font-bold text-primary uppercase tracking-widest">{unreadCount} new alerts</p>}
                </div>
                <button 
                  onClick={() => setShowNotifications(false)} 
                  className="p-2.5 bg-primary-soft rounded-full shadow-sm text-muted hover:text-primary transition-colors"
                >
                  <X size={18} />
                </button>
             </div>
             <div className="flex-1 overflow-y-auto p-3 space-y-2 no-scrollbar">
                {activeNotifications.length === 0 ? (
                  <div className="py-24 text-center text-slate-400">
                    <Bell size={48} className="mx-auto opacity-10 mb-4" />
                    <p className="font-bold text-sm tracking-tight opacity-60 uppercase tracking-widest">No alerts yet</p>
                  </div>
                ) : (
                  activeNotifications.map(notif => (
                    <div 
                      key={notif.id} 
                      onTouchEnd={(e) => {
                        e.preventDefault();
                        handleNotificationClick(notif);
                      }}
                      className={`p-4 rounded-3xl border transition-all active:scale-[0.98] cursor-pointer ${!notif.read ? 'bg-indigo-50/40 dark:bg-indigo-900/10 border-indigo-100 dark:border-indigo-900/20' : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700'}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex gap-4 flex-1">
                          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 ${notif.read ? 'bg-slate-100 dark:bg-slate-800 text-slate-400' : 'bg-indigo-600 text-white shadow-md shadow-indigo-100 dark:shadow-none'}`}>
                            <CheckCircle2 size={18} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start mb-0.5">
                              <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate pr-2">{notif.title}</h4>
                              <div className="flex items-center gap-2">
                                <span className="text-[9px] font-bold text-slate-400 whitespace-nowrap">{formatTime(notif.timestamp)}</span>
                                {notif.type === 'trip_invitation' && (
                                  <button
                                    onTouchEnd={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      onClearNotification(notif.id);
                                    }}
                                    className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-red-500 transition-colors"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                )}
                              </div>
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug line-clamp-2">{notif.body}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
             {(unreadCount > 0 || activeNotifications.length > 0) && (
               <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex gap-2">
                 {unreadCount > 0 && (
                   <button onTouchEnd={(e) => {
                     e.preventDefault();
                     e.stopPropagation();
                     onMarkAllRead();
                   }} className="flex-1 bg-indigo-600 text-white font-black py-4 rounded-2xl shadow-xl shadow-indigo-100 dark:shadow-none transition-transform active:scale-95 text-sm">Mark all as read</button>
                 )}
                 <button onTouchEnd={(e) => {
                   e.preventDefault();
                   e.stopPropagation();
                   onClearAllNotifications();
                 }} className="flex-1 bg-red-600 text-white font-black py-4 rounded-2xl shadow-xl shadow-red-100 dark:shadow-none transition-transform active:scale-95 text-sm">Clear all</button>
               </div>
             )}
          </div>
        </div>
      )}

      {/* Main Content with Top Safe Area Handling */}
      <main className="flex-1 max-w-5xl mx-auto w-full p-5 md:p-8 pt-4 md:pt-28 pb-28 md:pb-8">
        {children}
      </main>

      {/* Modern Mobile Bottom Navigation - Respects Safe Area */}
      {user && (
        <nav className="md:hidden fixed bottom-4 left-1/2 -translate-x-1/2 w-[92%] bg-surface/95 backdrop-blur-2xl border border-custom z-50 rounded-[2.5rem] flex items-center justify-between px-3 shadow-2xl shadow-primary/20 h-[calc(4.5rem+env(safe-area-inset-bottom))] pb-safe">
          <MobileNavButton 
            active={currentView === 'dashboard'} 
            onClick={() => onNavigate('dashboard')}
            icon={<Briefcase size={22} />}
          />
          
          <button 
            onClick={() => onNavigate('new-trip')}
            className={`flex items-center justify-center bg-primary text-inverse w-14 h-14 rounded-full shadow-xl shadow-primary/20 transition-all active:scale-90 ${currentView === 'new-trip' ? 'scale-110' : ''}`}
          >
            <Plus size={28} />
          </button>

          <MobileNavButton 
            active={isAccountActive} 
            onClick={() => onNavigate('profile')}
            icon={<UserIcon size={22} />}
          />
        </nav>
      )}
    </div>
  );
};

const NavButton = ({ active, onClick, icon, label }: any) => (
  <button 
    onClick={onClick}
    className={`flex items-center gap-2 px-5 py-2.5 rounded-[1.125rem] text-sm font-bold transition-all ${active ? 'bg-primary text-inverse shadow-md shadow-primary/20' : 'text-secondary hover:text-primary hover:bg-primary-soft'}`}
  >
    {icon}
    {label}
  </button>
);

const MobileNavButton = ({ active, onClick, icon }: any) => (
  <button 
    onClick={onClick}
    className={`flex-1 flex items-center justify-center h-14 rounded-[1.75rem] transition-all ${active ? 'text-primary bg-primary-soft font-bold' : 'text-muted'}`}
  >
    {icon}
  </button>
);

export default Layout;
