import React, { useState, useEffect } from 'react';
import { Trip, ItineraryEntry, Expense, ExpenseCategory, TripShare, TripRole, ActivityLog, User, PlanStatus } from '../types';
import { 
  ChevronLeft, 
  List, 
  History, 
  Timer, 
  Check, 
  Loader2, 
  Plus, 
  Users, 
  UserPlus, 
  Settings, 
  CreditCard, 
  ShieldCheck, 
  LogOut, 
  ChevronRight, 
  Bell, 
  Search, 
  X, 
  Edit2, 
  CheckCircle2, 
  Ban, 
  Trash2, 
  Mail, 
  Shield, 
  Sparkles, 
  RefreshCw,
  Calendar,
  DollarSign,
  MapPin,
  AlertCircle
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { db } from '../db/db';
import { showToast } from '../toast-system';
import { formatTime } from '../utils/timeUtils';
import ConfirmModal from '../components/ConfirmModal';
import type { ConfirmModalType } from '../components/ConfirmModal';
import { useTripDetail } from '../hooks/useTripDetail';

interface TripDetailProps {
  tripId: string;
  trip: Trip;
  user: User;
  itinerary: ItineraryEntry[];
  expenses: Expense[];
  activityLogs: ActivityLog[];
  onBack: () => void;
  onAddItinerary: (entry: Omit<ItineraryEntry, 'id' | 'tripId' | 'createdAt' | 'status' | 'createdBy'>, user: User) => Promise<void>;
  onUpdateItineraryStatus: (id: string, status: PlanStatus, user: User) => Promise<void>;
  onDeleteItinerary: (id: string, user: User) => Promise<void>;
  onAddExpense: (expense: Omit<Expense, 'id' | 'tripId' | 'createdAt' | 'createdBy'>, user: User) => Promise<void>;
  onUpdateExpense: (id: string, expense: Omit<Expense, 'id' | 'tripId' | 'createdAt' | 'createdBy'>, user: User) => Promise<void>;
  onDeleteExpense: (id: string, user: User) => Promise<void>;
  onAddActivityLog?: (log: Omit<ActivityLog, 'id' | 'createdAt'>) => Promise<void>;
  onGenerateItinerary?: (prompt: string, user: User) => Promise<void>;
  currencySymbol?: string;
  initialTab?: 'overview' | 'itinerary' | 'expenses' | 'collaborators' | 'members' | 'summary';
  onTabChange?: (tab: 'overview' | 'itinerary' | 'expenses' | 'collaborators' | 'members' | 'summary') => void;
}

const TripDetail: React.FC<TripDetailProps> = ({ 
  tripId, 
  trip, 
  user,
  onBack, 
  onAddActivityLog,
  onGenerateItinerary,
  currencySymbol = '₱',
  initialTab = 'overview',
  onTabChange
}) => {
  // Use the hook to get real-time state updates
  const { 
    trip: hookTrip, 
    itinerary, 
    expenses, 
    activityLogs, 
    loading, 
    loadingItineraryId, 
    updatingItineraryId, 
    deletingItineraryId, 
    isAddingExpense,
    addItinerary: hookAddItinerary, 
    updateItineraryStatus: hookUpdateItineraryStatus, 
    deleteItinerary: hookDeleteItinerary, 
    addExpense: hookAddExpense, 
    deleteExpense: hookDeleteExpense, 
    refresh: fetchData 
  } = useTripDetail(tripId, user.id, user.email);

  // Use the hook trip data if available, fallback to prop
  const currentTrip = hookTrip || trip;
  const [activeTab, setActiveTab] = useState<'overview' | 'itinerary' | 'expenses' | 'collaborators' | 'members' | 'summary'>(initialTab);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [shares, setShares] = useState<TripShare[]>([]);
  const [planStatus, setPlanStatus] = useState<PlanStatus>('not_started' as PlanStatus);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPlan, setGeneratedPlan] = useState<string>('');
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [userNames, setUserNames] = useState<Record<string, string>>({});
  const [showAddModal, setShowAddModal] = useState(false);
  const [aiInsights, setAiInsights] = useState<string>('');
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

  // Currency formatting function
  const formatCurrency = (amount: number) => {
    return `${currencySymbol}${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  useEffect(() => {
    if (initialTab && initialTab !== activeTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Helper function to get user display name
  const getUserName = (userId: string | undefined) => {
    if (!userId) return 'Unknown';
    if (userId === user.id) return user.name || user.username || 'You';
    
    // Return cached name or placeholder while fetching
    return userNames[userId] || userId.slice(0, 8) + '...';
  };

  // Fetch user names for all users involved in this trip
  useEffect(() => {
    const fetchUserNames = async () => {
      const allUserIds = new Set<string>();
      
      // Collect all user IDs from itinerary, expenses, and activity logs
      itinerary.forEach(entry => {
        if (entry.createdBy) {
          allUserIds.add(entry.createdBy);
        }
      });
      
      expenses.forEach(expense => {
        if (expense.createdBy) {
          allUserIds.add(expense.createdBy);
        }
      });
      
      activityLogs.forEach(log => {
        if (log.userId) {
          allUserIds.add(log.userId);
        }
      });

      // Fetch names for users we don't have cached
      const userIdsToFetch = Array.from(allUserIds).filter(id => id !== user.id && !userNames[id]);
      
      if (userIdsToFetch.length > 0) {
        const { data: users, error } = await supabase
          .from('users')
          .select('id, username, name')
          .in('id', userIdsToFetch);
        
        if (!error && users) {
          const newUserNames: Record<string, string> = {};
          users.forEach(u => {
            newUserNames[u.id] = u.name || u.username || u.id.slice(0, 8) + '...';
          });
          setUserNames(prev => ({ ...prev, ...newUserNames }));
        }
      }
    };
    
    fetchUserNames();
  }, [itinerary, expenses, activityLogs, user.id]);

  const fetchShares = async () => {
    try {
      const { data, error } = await supabase
        .from('shares')
        .select('*')
        .eq('trip_id', tripId);

      if (error) throw error;

      // Get user details for all shares
      const userEmails = (data || []).map(s => s.user_email);
      let userDetails: any[] = [];
      
      if (userEmails.length > 0) {
        const { data: usersData } = await supabase
          .from('users')
          .select('id, email, name, username')
          .in('email', userEmails);
        
        userDetails = usersData || [];
      }

      // Map Supabase data to UI format with user details
      const mappedShares = (data || []).map(s => {
        const userDetail = userDetails.find(u => u.email === s.user_email);
        return {
          ...s,
          userEmail: s.user_email,
          userName: userDetail?.name || userDetail?.username || 'Unknown',
          role: s.permission === 'edit' ? 'EDITOR' : 'VIEWER',
          status: s.status || 'pending'
        };
      });
      
      setShares(mappedShares);
      
      // Also update IndexedDB for offline use
      if (data) {
        await db.shares.clear();
        await db.shares.bulkAdd(mappedShares.map(s => ({ 
          ...s, 
          tripId: s.trip_id
        })));
      }
    } catch (error) {
      console.error('Error fetching shares:', error);
    }
  };

  useEffect(() => {
    fetchShares();
  }, [tripId]);

  const handleInvite = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const email = fd.get('email') as string;
    const role = fd.get('role') as TripRole;
    
    if (!email || !user) {
      if (!user) {
        showToast('You must be logged in to send invitations.', 'error');
      }
      return;
    }
    
    try {
      // Validate user exists before proceeding
      const invitedUser = await getUserByEmail(email.toLowerCase());
      if (!invitedUser) {
        showToast(`User with email "${email}" does not exist.`, 'error');
        return;
      }
      
      // Check if user is already invited to this trip
      const existingShare = shares.find(s => s.userEmail === email.toLowerCase());
      if (existingShare) {
        showToast(`${email} has already been invited to this trip.`, 'warning');
        return;
      }
      
      // Map TripRole to database permission values
      const permissionMap = {
        'OWNER': 'view',      // Try 'view' since it's the default
        'EDITOR': 'edit',     // Try 'edit' for editor
        'VIEWER': 'view'      // Try 'view' for viewer
      };
      
      const permission = permissionMap[role] || 'view';
      
      // Create share record using service role
      const { error: shareError } = await supabase
        .from('shares')
        .insert([{
          trip_id: trip.id,
          user_email: email.toLowerCase(),
          permission: permission,
          status: 'pending'
        }]);

      if (shareError) {
        throw shareError;
      }

      // Create notification (only one notification)
      try {
        // Get the sendRealtimeNotification function from window (passed from App.tsx)
        const sendRealtimeNotification = (window as any).sendRealtimeNotification;
        if (sendRealtimeNotification) {
          const success = await sendRealtimeNotification(
            invitedUser.id,
            `Trip Invitation: ${trip.title}`,
            `${user.name || user.username || 'Trip owner'} invited you to collaborate on "${trip.title}"${trip.destination ? ` in ${trip.destination}` : ''}`,
            'info',
            trip.id,
            'trip'
          );
          
          if (success) {
            // Invitation sent successfully
          } else {
            console.error('Failed to send real-time invitation');
          }
        }
      } catch (notifError) {
        console.error('Error in notification creation:', notifError);
        // Don't throw - continue with success flow
      }
      
      // Reset form
      if (e.currentTarget) {
        e.currentTarget.email.value = '';
      }
      setShowInviteModal(false);
      
      // Show success feedback
      showToast(`Invitation sent to ${email}`, 'success');
      
      // Refresh shares from database to show new collaborator
      await fetchShares();
      
      // Refresh notifications to show latest updates
      if (typeof window !== 'undefined' && (window as any).refreshNotifications) {
        (window as any).refreshNotifications();
      }
      
    } catch (error: any) {
      console.error('Error sending invitation:', error);
      
      // Check if it's a duplicate key error (already invited)
      if (error.code === '23505') {
        showToast(`${email} has already been invited to this trip.`, 'warning');
      } else {
        showToast('Failed to send invitation. Please try again.', 'error');
        setShowInviteModal(false);
        return;
      }
      
      showToast('Failed to send invitation. Please try again.', 'error');
    }
  };

  // Helper function to get user details by email
  const getUserByEmail = async (email: string): Promise<{ id: string; name: string; username: string } | null> => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, name, username')
        .eq('email', email)
        .single();
      return data || null;
    } catch {
      return null;
    }
  };

  const removeShare = async (id: string) => {
    const share = shares.find(s => s.id === id);
    if (!share) return;

    // Show confirmation modal
    setConfirmModal({
      open: true,
      type: 'warning',
      title: 'Remove Collaborator',
      message: `Are you sure you want to remove ${share.userEmail} from this trip?\n\nThis action cannot be undone.`,
      confirmText: 'Remove',
      cancelText: 'Cancel',
      onConfirm: async () => {
        try {
          // Remove from Supabase shares table
          const { error } = await supabase
            .from('shares')
            .delete()
            .eq('id', id);

          if (error) throw error;

          // Send notification to removed user
          await supabase
            .from('notifications')
            .insert([{
              user_id: null, // Will be set by mapping
              user_email: share.userEmail,
              title: 'Removed from Trip',
              body: `You have been removed from "${trip?.title || 'the trip'}" by the trip owner`,
              type: 'warning',
              trip_id: tripId,
              trip_title: trip?.title || 'Trip',
              actor_id: user?.id,
              actor_name: user?.name || user?.username,
              action: 'member_removed',
              created_at: new Date().toISOString()
            }]);

          // Remove from local IndexedDB
          await db.shares.delete(id);
          setShares(shares.filter(s => s.id !== id));

          // Show success feedback
          showToast(`${share.userEmail} has been removed from the trip`, 'info');
        } catch (error) {
          console.error('Error removing share:', error);
          showToast('Failed to remove contributor. Please try again.', 'error');
        }
      }
    });
  };

  const updateShare = async (id: string, newRole: TripRole) => {
    const share = shares.find(s => s.id === id);
    if (!share) return;

    const roleText = newRole === 'EDITOR' ? 'Editor' : 'Viewer';
    
    // Show confirmation modal
    setConfirmModal({
      open: true,
      type: 'info',
      title: 'Update Role',
      message: `Are you sure you want to change ${share.userEmail}'s role to ${roleText}?\n\nThis will update their permissions for this trip.`,
      confirmText: 'Update',
      cancelText: 'Cancel',
      onConfirm: async () => {
        try {
          // Update in Supabase shares table
          const permission = newRole === 'EDITOR' ? 'edit' : 'view';
          const { error } = await supabase
            .from('shares')
            .update({ role: newRole })
            .eq('id', id);

          if (error) throw error;

          // Update local IndexedDB
          await db.shares.update(id, { 
            role: newRole
          });
          setShares(shares.map(s => 
            s.id === id ? { ...s, role: newRole } : s
          ));

          // Show success feedback
          showToast(`${share.userEmail}'s role has been updated to ${roleText}`, 'success');
        } catch (error) {
          console.error('Error updating share:', error);
          showToast('Failed to update role. Please try again.', 'error');
        }
      }
    });
  };

  const refreshShares = async () => {
    try {
      const { data, error } = await supabase
        .from('shares')
        .select('*')
        .eq('trip_id', trip.id);
      
      if (error) throw error;
      setShares(data || []);
    } catch (error) {
      console.error('Error refreshing shares:', error);
    }
  };

  const totalExpense = expenses.reduce((acc, curr) => acc + curr.amount, 0);
  const budget = trip.budget || 0;
  const remainingBudget = budget - totalExpense;
  const isOverBudget = budget > 0 && totalExpense > budget;

  const itineraryByDate = itinerary.reduce((acc, entry) => {
    if (!acc[entry.date]) acc[entry.date] = [];
    acc[entry.date].push(entry);
    return acc;
  }, {} as Record<string, ItineraryEntry[]>);

  const sortedDates = Object.keys(itineraryByDate).sort();

  const formatRelativeTime = (ts: number) => {
    const mins = Math.floor((Date.now() - ts) / 60000);
    if (mins < 1) return 'now';
    if (mins < 60) return `${mins}m`;
    if (mins < 1440) return `${Math.floor(mins / 60)}h`;
    return new Date(ts).toLocaleDateString();
  };

  const handleActivityClick = (log: ActivityLog) => {
    let targetTab: 'overview' | 'itinerary' | 'expenses' | 'collaborators' | 'members' | 'summary' = 'overview';
    
    if (log.action.includes('Expense')) {
      targetTab = 'expenses';
    } else if (log.action.includes('Item') || log.action.includes('Status')) {
      targetTab = 'itinerary';
    } else if (log.action.includes('Invite') || log.details.includes('invited') || log.details.includes('collaborator')) {
      targetTab = 'members';
    } else if (log.action.includes('Added') || log.action.includes('Deleted') || log.action.includes('Status Change')) {
      targetTab = 'itinerary';
    }
    
    setActiveTab(targetTab);
    if (onTabChange) {
      onTabChange(targetTab);
    }
  };

  const onUpdateItineraryStatus = async (id: string, status: string, user: User) => {
  try {
    // Update in Supabase
    const { error } = await supabase
      .from('itinerary')
      .update({ status })
      .eq('id', id);

    if (error) throw error;

    // Update local IndexedDB
    await db.itinerary.update(id, { status: status as any });
    
    // Show success feedback
    showToast(`Item status updated to ${status}`, 'success');
  } catch (error) {
    console.error('Error updating itinerary status:', error);
    showToast('Failed to update status. Please try again.', 'error');
  }
};

const onDeleteItinerary = async (id: string, user: User) => {
  try {
    // Delete from Supabase
    const { error } = await supabase
      .from('itinerary')
      .delete()
      .eq('id', id);

    if (error) throw error;

    // Delete from local IndexedDB
    await db.itinerary.delete(id);
    
    // Show success feedback
    showToast('Item removed from itinerary', 'success');
  } catch (error) {
    console.error('Error deleting itinerary:', error);
    showToast('Failed to remove item. Please try again.', 'error');
  }
};

  const generateAiInsights = async () => {
    setIsGenerating(true);
    try {
      // Generate insights based on current state data
      const completedItems = itinerary.filter(i => i.status === 'completed').length;
      const totalItems = itinerary.length;
      const completionRate = totalItems > 0 ? (completedItems / totalItems * 100).toFixed(1) : '0';
      
      // Create insights data
      const insightsData = `## 🎯 Trip Progress Insights
      
**Completion Rate**: ${completionRate}% (${completedItems}/${totalItems} items completed)

**Budget Status**: ${currencySymbol}${totalExpense} spent of ${currencySymbol}${budget}

### 💡 Personalized Tips:

1. **Planning Efficiency**: You're ${completionRate}% through your itinerary. ${parseFloat(completionRate) > 50 ? 'Great progress!' : 'Consider focusing on completing key activities.'}

2. **Budget Management**: ${totalExpense > budget * 0.8 ? 'You\'re approaching your budget limit. Consider prioritizing essential expenses.' : 'Your spending is well within budget. Keep tracking expenses for better financial control.'}

3. **Activity Optimization**: ${completedItems < totalItems * 0.3 ? 'Try to complete at least 30% of planned activities for a fulfilling trip experience.' : 'Excellent activity completion! You\'re making the most of your trip.'}

### 📊 Next Steps:
- ${totalItems > completedItems ? `Focus on completing ${totalItems - completedItems} remaining items` : 'All planned activities completed!'}
- ${totalExpense < budget * 0.5 ? 'Consider allocating more budget for experiences' : 'Monitor remaining budget carefully'}

Have an amazing trip! ✈️`;

      // Update IndexedDB with insights for offline persistence
      await db.trips.update(tripId, { 
        ai_insights: insightsData,
        ai_insights_generated_at: new Date().toISOString()
      });

      // Update React state
      setAiInsights(insightsData);
      
      // Show success notification
      showToast('AI insights generated successfully!', 'success');
      
    } catch (err) {
      console.error('Error generating insights:', err);
      setAiInsights("Unable to generate insights at this time. Please try again later.");
      showToast('Failed to generate AI insights', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <>
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="p-2.5 bg-white dark:bg-slate-900 shadow-sm border border-slate-100 dark:border-slate-800 rounded-2xl transition-all active:scale-90 dark:text-white">
          <ChevronLeft size={22} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white leading-tight truncate">{trip.title}</h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs md:text-sm flex items-center gap-1 font-medium">
            <Calendar size={14} />
            {new Date(trip.startDate).toLocaleDateString()} - {new Date(trip.endDate).toLocaleDateString()}
          </p>
        </div>
        <button 
          onClick={() => setActiveTab('members')}
          className={`p-3 rounded-2xl transition-all ${activeTab === 'members' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white dark:bg-slate-900 text-slate-400 border border-slate-200 dark:border-slate-800 hover:text-indigo-600'}`}
        >
          <Users size={20} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex bg-slate-200/50 dark:bg-slate-900/50 p-1.5 rounded-2xl">
        {[
          { id: 'itinerary', label: 'Plan', icon: List },
          { id: 'expenses', label: 'Expenses', icon: DollarSign },
          { id: 'summary', label: 'Activity', icon: History },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-black rounded-xl transition-all uppercase tracking-wider ${
              activeTab === tab.id ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
            }`}
          >
            <tab.icon size={18} />
            <span className="hidden xs:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="pb-16 md:pb-10">
        {activeTab === 'itinerary' && (
          <div className="space-y-8 animate-in fade-in duration-300">
            <div className="flex items-center justify-between px-1">
              <div>
                 <h2 className="text-lg font-black text-slate-800 dark:text-white">Timeline</h2>
                 <p className="text-[10px] text-indigo-500 font-black uppercase tracking-[0.15em]">{itinerary.filter(i=>i.status==='done').length}/{itinerary.length} COMPLETED</p>
              </div>
              <button onClick={() => setShowAddModal(true)} className="bg-indigo-600 text-white p-3 rounded-2xl shadow-xl shadow-indigo-100 dark:shadow-none hover:scale-105 active:scale-95 transition-transform"><Plus size={24} /></button>
            </div>
            {sortedDates.length === 0 ? (
              <div className="text-center py-24 text-slate-400 bg-white dark:bg-slate-900/50 rounded-[3rem] border-2 border-dashed border-slate-100 dark:border-slate-800">
                <Calendar size={48} className="mx-auto opacity-10 mb-4" />
                <p className="font-bold text-sm tracking-tight opacity-60">Nothing planned yet</p>
              </div>
            ) : (
              sortedDates.map(date => (
                <div key={date} className="space-y-4">
                  <div className="sticky top-0 bg-slate-50 dark:bg-slate-950 py-3 z-10">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 px-1">{new Date(date).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</h3>
                  </div>
                  <div className="space-y-4 pl-2 border-l-2 border-slate-100 dark:border-slate-900 ml-1">
                    {itineraryByDate[date].sort((a,b)=>a.time.localeCompare(b.time)).map(entry => (
                      <div key={entry.id} className={`group relative bg-white dark:bg-slate-800 p-5 rounded-[2rem] shadow-sm border transition-all ${entry.status === 'completed' ? 'opacity-60 border-emerald-100 dark:border-emerald-900/20 shadow-none' : 'border-slate-100 dark:border-slate-700'}`}>
                        {entry.status !== 'planned' && (
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className={`bg-gray-500 text-white text-lg font-black px-6 py-3 rounded-md uppercase tracking-wider transform -rotate-12 opacity-30 select-none border-2 border-gray-600 shadow-lg`}>
                              {entry.status === 'completed' ? 'DONE' : entry.status === 'cancelled' ? 'CANCELLED' : entry.status.toUpperCase()}
                            </div>
                          </div>
                        )}
                        <div className="flex gap-4">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all ${entry.status === 'completed' ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600' : 'bg-slate-50 dark:bg-slate-700 text-slate-400'}`}>
                             {entry.status === 'completed' ? <CheckCircle2 size={22} strokeWidth={2.5} /> : <Timer size={22} strokeWidth={2.5} />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start mb-1">
                               <div className="text-indigo-600 dark:text-indigo-400 font-black text-[10px] tracking-widest">{entry.time}</div>
                               <div className="flex items-center gap-1.5">
                                 <button 
                                  onClick={() => hookUpdateItineraryStatus(entry.id, entry.status === 'completed' ? 'planned' : 'completed', user)}
                                  disabled={updatingItineraryId === entry.id}
                                  className={`p-2 rounded-xl transition-all active:scale-90 disabled:opacity-50 disabled:cursor-not-allowed ${entry.status === 'completed' ? 'bg-emerald-600 text-white shadow-md' : 'bg-slate-50 dark:bg-slate-950 text-slate-400 hover:text-emerald-500'}`}
                                 >
                                   {updatingItineraryId === entry.id ? (
                                     <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                                   ) : (
                                     <Check size={14} strokeWidth={3} />
                                   )}
                                 </button>
                                 <button 
                                  onClick={() => hookUpdateItineraryStatus(entry.id, entry.status === 'cancelled' ? 'planned' : 'cancelled', user)}
                                  disabled={updatingItineraryId === entry.id}
                                  className={`p-2 rounded-xl transition-all active:scale-90 disabled:opacity-50 disabled:cursor-not-allowed ${entry.status === 'cancelled' ? 'bg-red-500 text-white shadow-md' : 'bg-slate-50 dark:bg-slate-950 text-slate-400 hover:text-red-500'}`}
                                 >
                                   {updatingItineraryId === entry.id ? (
                                     <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                                   ) : (
                                     <Ban size={14} strokeWidth={3} />
                                   )}
                                 </button>
                               </div>
                            </div>
                            <h4 className={`font-black text-slate-900 dark:text-white text-base leading-tight ${entry.status === 'cancelled' ? 'line-through' : ''}`}>{entry.title}</h4>
                            <div className="flex flex-wrap items-center gap-3 mt-2">
                               {entry.location && <p className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1 font-bold"><MapPin size={10} strokeWidth={3} /> {entry.location}</p>}
                               <p className="text-[10px] text-slate-400 font-bold tracking-tight">by {getUserName(entry.createdBy)} • {formatRelativeTime(entry.createdAt)}</p>
                            </div>
                          </div>
                        </div>
                        <button 
                          onClick={() => hookDeleteItinerary(entry.id, user)} 
                          disabled={deletingItineraryId === entry.id}
                          className="absolute -right-2 -top-2 p-2 bg-white dark:bg-slate-800 text-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-all shadow-xl border border-red-50 dark:border-red-950 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {deletingItineraryId === entry.id ? (
                            <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                          ) : (
                            <Trash2 size={12} strokeWidth={3} />
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'expenses' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex items-center justify-between px-1">
              <div>
                <h2 className="text-lg font-black text-slate-800 dark:text-white">Expenses</h2>
                <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400 tracking-tighter">{formatCurrency(totalExpense)}</p>
              </div>
              <button onClick={() => setShowAddModal(true)} className="bg-indigo-600 text-white p-3 rounded-2xl shadow-xl shadow-indigo-100 dark:shadow-none hover:scale-105 active:scale-95 transition-transform"><Plus size={24} /></button>
            </div>
            {isOverBudget && (
              <div className="bg-red-50 dark:bg-red-950/20 border-2 border-red-100 dark:border-red-900/30 p-5 rounded-[2.5rem] flex items-start gap-4 text-red-700 dark:text-red-400 text-sm animate-pulse">
                <div className="bg-red-500 text-white p-2 rounded-xl shadow-lg">
                  <AlertCircle size={20} strokeWidth={3} />
                </div>
                <div><p className="font-black text-base leading-none mb-1">Budget Alert</p><p className="font-bold opacity-80">You're {formatCurrency(Math.abs(remainingBudget))} over your set limit.</p></div>
              </div>
            )}
            <div className="space-y-3">
              {expenses.map(expense => (
                <div key={expense.id} className="group bg-white dark:bg-slate-800 p-5 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-700 flex items-center justify-between hover:border-indigo-100 transition-all active:scale-[0.98]">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center text-xs font-black shadow-inner flex-shrink-0">{expense.category.charAt(0)}</div>
                    <div className="min-w-0">
                      <h4 className="font-black text-slate-800 dark:text-white truncate text-base leading-tight">{expense.description || expense.category}</h4>
                      <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-0.5">{getUserName(expense.createdBy)} • {new Date(expense.date).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 flex-shrink-0">
                    <p className="font-black text-slate-900 dark:text-white text-lg tracking-tighter">{formatCurrency(expense.amount)}</p>
                    <button onClick={() => hookDeleteExpense(expense.id, user)} className="text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 p-2"><Trash2 size={16} /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'summary' && (
          <div className="space-y-8 animate-in slide-in-from-bottom duration-500">
            {/* Budget Overview */}
            <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] shadow-sm border border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3 mb-6">
                <DollarSign size={24} className="text-indigo-500" />
                <h3 className="text-xl font-black text-slate-900 dark:text-white">Budget Overview</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-2xl">
                  <p className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Total Budget</p>
                  <p className="text-2xl font-black text-slate-900 dark:text-white">{formatCurrency(budget)}</p>
                </div>
                
                <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-2xl">
                  <p className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Total Spent</p>
                  <p className={`text-2xl font-black ${isOverBudget ? 'text-red-500' : 'text-slate-900 dark:text-white'}`}>{formatCurrency(totalExpense)}</p>
                </div>
                
                <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-2xl">
                  <p className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Remaining</p>
                  <p className={`text-2xl font-black ${remainingBudget < 0 ? 'text-red-500' : remainingBudget < budget * 0.2 ? 'text-yellow-500' : 'text-emerald-500'}`}>
                    {formatCurrency(Math.abs(remainingBudget))}
                    {remainingBudget < 0 ? ' over' : ' left'}
                  </p>
                </div>
              </div>
              
              {/* Progress Bar */}
              {budget > 0 && (
                <div className="mt-6">
                  <div className="flex justify-between text-sm font-bold text-slate-600 dark:text-slate-400 mb-2">
                    <span>Budget Progress</span>
                    <span>{Math.round((totalExpense / budget) * 100)}%</span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3 overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-500 ${
                        isOverBudget ? 'bg-red-500' : 
                        totalExpense / budget > 0.8 ? 'bg-yellow-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min((totalExpense / budget) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="bg-indigo-600 p-8 rounded-[3rem] shadow-2xl text-white relative overflow-hidden">
               <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -mr-24 -mt-24 blur-3xl" />
               <div className="flex items-center gap-3 mb-6"><Sparkles className="text-indigo-200" size={28} strokeWidth={2.5} /><h3 className="text-2xl font-black tracking-tight">AI Insights</h3></div>
               {aiInsights ? (
                 <div className="bg-white/10 backdrop-blur-xl p-6 rounded-[2rem] text-sm font-medium leading-relaxed whitespace-pre-wrap border border-white/10">{aiInsights}</div>
               ) : (
                 <button onClick={generateAiInsights} disabled={isGenerating} className="w-full bg-white text-indigo-600 font-black py-5 rounded-[1.75rem] flex items-center justify-center gap-2 hover:bg-indigo-50 transition-all active:scale-95 disabled:opacity-50">
                   {isGenerating ? <Loader2 size={20} className="animate-spin" /> : <Sparkles size={20} />} Generate Personalized Tips
                 </button>
               )}
            </div>

            <div className="space-y-6">
              <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-3"><History size={24} className="text-indigo-500" /><h3 className="font-black text-xl dark:text-white">Recent Activity</h3></div>
              </div>
              
              <div className="space-y-4 relative before:absolute before:left-[22px] before:top-4 before:bottom-4 before:w-1 before:bg-slate-100 dark:before:bg-slate-900">
                {activityLogs.length === 0 ? (
                  <div className="py-20 text-center text-slate-400 bg-white dark:bg-slate-900/50 rounded-[3rem] border-2 border-dashed border-slate-100 dark:border-slate-800">
                    <History size={40} className="mx-auto opacity-10 mb-4" />
                    <p className="font-bold text-sm tracking-tight opacity-60 uppercase tracking-widest">No logs found</p>
                  </div>
                ) : (
                  activityLogs.slice(0, 15).map(log => (
                    <div 
                      key={log.id} 
                      className="relative pl-14 group/log cursor-pointer"
                      onClick={() => handleActivityClick(log)}
                    >
                      <div className="absolute left-0 top-2 w-11 h-11 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex items-center justify-center z-10 shadow-md transition-all group-hover/log:scale-110 group-hover/log:border-indigo-100 group-hover/log:shadow-indigo-100/20">
                         {log.action.includes('Add') ? <Plus size={18} strokeWidth={3} className="text-indigo-500" /> : 
                          log.action.includes('Status') ? <CheckCircle2 size={18} strokeWidth={3} className="text-emerald-500" /> : 
                          log.action.includes('Delete') ? <Trash2 size={18} strokeWidth={3} className="text-red-400" /> :
                          <History size={18} strokeWidth={3} className="text-slate-400" />}
                      </div>
                      <div className="bg-white dark:bg-slate-900 p-5 rounded-[2rem] border border-slate-50 dark:border-slate-800 shadow-sm transition-all group-hover/log:border-indigo-200 dark:group-hover/log:border-indigo-900/50 flex justify-between items-center group-hover/log:shadow-lg">
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start mb-1.5">
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500">{log.action}</span>
                            <span className="text-[10px] font-bold text-slate-400 whitespace-nowrap">{formatRelativeTime(log.timestamp)}</span>
                          </div>
                          <p className="text-sm font-bold text-slate-900 dark:text-white leading-snug truncate pr-4">{log.details}</p>
                          <p className="text-[10px] text-slate-400 mt-2 font-black uppercase tracking-widest">by <span className="text-indigo-600 dark:text-indigo-400">{log.userName || getUserName(log.userId)}</span></p>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center group-hover/log:bg-indigo-600 group-hover/log:text-white transition-all transform group-hover/log:translate-x-1">
                          <ChevronRight size={16} strokeWidth={3} />
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'members' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-lg font-black text-slate-800 dark:text-white">Collaborators</h2>
              <button onClick={() => setShowInviteModal(true)} className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-100 dark:shadow-none active:scale-95 transition-transform"><UserPlus size={16} /> Invite</button>
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
               <div className="p-6 bg-slate-50 dark:bg-slate-800/50 flex items-center gap-5">
                  <div className="w-14 h-14 rounded-[1.5rem] bg-indigo-600 flex items-center justify-center text-white shadow-2xl"><Shield size={28} /></div>
                  <div><p className="font-black text-base dark:text-white">Trip Organizer (You)</p><p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">Master Admin</p></div>
               </div>
               {shares.length > 0 && (
                 <div className="divide-y divide-slate-50 dark:divide-slate-800">
                    {shares.map(share => (
                      <div key={share.id} className="p-6 flex items-center justify-between group">
                        <div className="flex items-center gap-4 min-w-0">
                           <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400"><Mail size={20} /></div>
                           <div className="min-w-0">
                             <p className="text-sm font-black dark:text-white truncate">{share.userName || share.userEmail}</p>
                             <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em]">{share.userEmail}</p>
                             <div className="flex items-center gap-2 mt-1">
                               <span className={`text-[10px] font-black px-2.5 py-1 rounded-xl tracking-widest uppercase inline-block ${share.role === 'EDITOR' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>{share.role}</span>
                               <span className={`text-[10px] font-black px-2.5 py-1 rounded-xl tracking-widest uppercase inline-block ${
                                 share.status === 'pending' ? 'bg-yellow-100 text-yellow-600' :
                                 share.status === 'rejected' ? 'bg-red-100 text-red-600' :
                                 share.status === 'actual' ? 'bg-green-100 text-green-600' :
                                 'bg-slate-100 text-slate-500'
                               }`}>
                                 {share.status === 'actual' ? 'ACCEPTED' : (share.status || 'pending').toUpperCase()}
                               </span>
                             </div>
                           </div>
                        </div>
                        <button onClick={() => removeShare(share.id)} className="p-2.5 text-slate-300 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100 bg-slate-50 dark:bg-slate-800 rounded-xl"><Trash2 size={16} /></button>
                      </div>
                    ))}
                 </div>
               )}
            </div>
          </div>
        )}
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[3rem] p-10 shadow-2xl animate-in slide-in-from-bottom-12 duration-500">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-black dark:text-white">Invite User</h3>
              <button onClick={() => setShowInviteModal(false)} className="p-3 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500"><X size={20} /></button>
            </div>
            <form onSubmit={handleInvite} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1 tracking-[0.2em]">User Email</label>
                <input name="email" type="email" required placeholder="traveler@gmail.com" className="w-full p-5 rounded-[1.5rem] border-2 border-slate-50 dark:border-slate-800 dark:bg-slate-800/50 focus:border-indigo-600 outline-none dark:text-white font-bold transition-all" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1 tracking-[0.2em]">Access Level</label>
                <select name="role" className="w-full p-5 rounded-[1.5rem] border-2 border-slate-50 dark:border-slate-800 dark:bg-slate-800/50 focus:border-indigo-600 outline-none dark:text-white font-bold transition-all">
                  <option value="EDITOR">Editor (Plan & Log)</option>
                  <option value="VIEWER">Viewer (Read Only)</option>
                </select>
              </div>
              <button type="submit" className="w-full bg-indigo-600 text-white font-black py-5 rounded-[1.75rem] shadow-2xl shadow-indigo-200 dark:shadow-none hover:bg-indigo-700 transition-all active:scale-[0.98]">Send Invitation</button>
            </form>
          </div>
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[130] flex items-start md:items-center justify-center p-4 pt-16 md:pt-4 overflow-y-auto animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-[3rem] p-10 space-y-8 shadow-2xl animate-in slide-in-from-bottom-12">
            <div className="flex justify-between items-center"><h2 className="text-2xl font-black dark:text-white">Log {activeTab === 'itinerary' ? 'Plan' : 'Expense'}</h2><button onClick={() => setShowAddModal(false)} className="p-3 bg-slate-100 dark:bg-slate-700 rounded-full text-slate-400 transition-transform active:scale-90"><Plus size={24} className="rotate-45" /></button></div>
            {activeTab === 'itinerary' ? (
              <form className="space-y-5" onSubmit={async (e) => { 
                e.preventDefault(); 
                const fd = new FormData(e.currentTarget); 
                await hookAddItinerary(
                  { 
                    date: fd.get('date') as string, 
                    time: fd.get('time') as string, 
                    title: fd.get('title') as string, 
                    location: fd.get('location') as string, 
                    notes: fd.get('notes') as string 
                  }, 
                  user
                ); 
                setShowAddModal(false); 
              }}>
                <input name="title" required placeholder="What's next?" className="w-full p-5 rounded-2xl border-2 border-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-white font-black focus:border-indigo-600 outline-none text-lg" autoFocus />
                <div className="grid grid-cols-2 gap-4"><input name="date" type="date" required className="p-4 rounded-2xl border-2 border-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-white font-bold" defaultValue={trip.startDate} /><input name="time" type="time" required className="p-4 rounded-2xl border-2 border-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-white font-bold" defaultValue="12:00" /></div>
                <input name="location" placeholder="Destination name..." className="w-full p-5 rounded-2xl border-2 border-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-white font-bold focus:border-indigo-600 outline-none" />
                <button type="submit" disabled={loadingItineraryId === 'adding'} className="w-full bg-indigo-600 text-white font-black py-5 rounded-[1.75rem] shadow-2xl shadow-indigo-100 dark:shadow-none active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100 transition-all flex items-center justify-center gap-3 min-h-[60px]">
                  {loadingItineraryId === 'adding' ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Adding...</span>
                    </>
                  ) : (
                    <span>Add to Timeline</span>
                  )}
                </button>
              </form>
            ) : (
              <form className="space-y-8" onSubmit={async (e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); await hookAddExpense({ amount: parseFloat(fd.get('amount') as string), category: fd.get('category') as string, description: fd.get('description') as string, payer: user.name || user.username, date: fd.get('date') as string, currency: 'PHP' }, user); setShowAddModal(false); }}>
                <div className="text-center"><div className="flex items-center justify-center gap-3"><span className="text-4xl font-black text-indigo-400">{currencySymbol}</span><input name="amount" type="number" step="0.01" required placeholder="0.00" className="w-48 text-6xl font-black text-center border-b-4 border-indigo-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white outline-none py-3" autoFocus /></div></div>
                <input name="description" required placeholder="Log details..." className="w-full p-5 rounded-2xl border-2 border-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-white font-black focus:border-indigo-600 outline-none" />
                <div className="grid grid-cols-2 gap-4">
                  <select name="category" className="p-4 rounded-2xl border-2 border-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-white font-bold">{Object.values(ExpenseCategory).map(cat => <option key={cat} value={cat}>{cat}</option>)}</select>
                  <input name="date" type="date" required className="p-4 rounded-2xl border-2 border-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-white font-bold" defaultValue={new Date().toISOString().split('T')[0]} />
                </div>
                <button type="submit" disabled={isAddingExpense} className="w-full bg-indigo-600 text-white font-black py-5 rounded-[1.75rem] shadow-2xl shadow-indigo-100 dark:shadow-none active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100 transition-all flex items-center justify-center gap-3 min-h-[60px]">
                  {isAddingExpense ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Logging Expense...</span>
                    </>
                  ) : (
                    <span>Log Expense</span>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>

    <ConfirmModal
      open={confirmModal.open}
      type={confirmModal.type}
      title={confirmModal.title}
      message={confirmModal.message}
      confirmText={confirmModal.confirmText}
      cancelText={confirmModal.cancelText}
      onConfirm={confirmModal.onConfirm}
      onCancel={() => setConfirmModal(prev => ({ ...prev, open: false }))}
    />
    </>
  );
};

export default TripDetail;
