
import React, { useState } from 'react';
import { Trip } from '../types';
import { Calendar, MapPin, ChevronRight, Plus, Briefcase, DollarSign, Trash2, X, AlertTriangle } from 'lucide-react';

interface DashboardProps {
  trips: Trip[];
  loading: boolean;
  onSelectTrip: (id: string) => void;
  onNewTrip: () => void;
  onDeleteTrip: (id: string) => void;
  currentUserId: string;
}

const Dashboard: React.FC<DashboardProps> = ({ trips, loading, onSelectTrip, onNewTrip, onDeleteTrip, currentUserId }) => {
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; trip: Trip | null }>({ open: false, trip: null });
  const [confirmationText, setConfirmationText] = useState('');
  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-32 bg-slate-100 dark:bg-slate-800 animate-pulse rounded-[2rem]" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between px-1">
        <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Your Trips</h1>
        <button 
          onClick={onNewTrip}
          className="hidden md:flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-2xl font-bold text-sm hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 dark:shadow-none"
        >
          <Plus size={18} strokeWidth={3} />
          Create New
        </button>
      </div>

      {trips.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-[3rem] p-16 text-center space-y-6 transition-colors shadow-sm">
          <div className="bg-slate-50 dark:bg-slate-800 w-24 h-24 rounded-[2.5rem] flex items-center justify-center mx-auto text-slate-300">
            <Briefcase size={40} strokeWidth={1.5} />
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-800 dark:text-white">Start your journey</h3>
            <p className="text-slate-400 dark:text-slate-500 font-medium max-w-xs mx-auto mt-2">Plan your next adventure, track expenses, and collaborate with friends.</p>
          </div>
          <button 
            onClick={onNewTrip}
            className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 dark:shadow-none active:scale-95"
          >
            Create My First Trip
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {trips.map(trip => (
            <div 
              key={trip.id}
              className="bg-white dark:bg-slate-800 rounded-[2rem] p-5 shadow-sm border border-slate-50 dark:border-slate-800 hover:border-indigo-100 dark:hover:border-indigo-900 transition-all group flex items-center gap-5"
            >
              <div 
                onClick={() => onSelectTrip(trip.id)}
                className="flex items-center gap-5 flex-1 cursor-pointer active:scale-[0.98]"
              >
                <div className="w-16 h-16 rounded-[1.5rem] bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400 flex-shrink-0 transition-transform group-hover:scale-110 shadow-inner">
                  <Calendar size={32} strokeWidth={2.5} />
                </div>
                
                <div className="flex-1 min-w-0">
                  <h3 className="font-black text-slate-900 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors text-lg leading-tight">
                    {trip.title}
                  </h3>
                  <div className="flex flex-wrap items-center gap-4 mt-1.5 text-xs text-slate-400 font-bold uppercase tracking-wider">
                    <span className="flex items-center gap-1.5">
                      <Calendar size={14} strokeWidth={2.5} />
                      {new Date(trip.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                    {trip.location && (
                      <span className="flex items-center gap-1.5 truncate">
                        <MapPin size={14} strokeWidth={2.5} />
                        {trip.location}
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-900 flex items-center justify-center text-slate-300 dark:text-slate-700 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900/30 group-hover:text-indigo-600 transition-all">
                  <ChevronRight size={20} strokeWidth={3} />
                </div>
              </div>
              
              {trip.ownerId === currentUserId && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteModal({ open: true, trip });
                    setConfirmationText('');
                  }}
                  className="w-10 h-10 rounded-full bg-red-50 dark:bg-red-950/20 flex items-center justify-center text-red-400 dark:text-red-500 hover:bg-red-100 dark:hover:bg-red-950/40 transition-all opacity-0 group-hover:opacity-100"
                  title="Delete trip"
                >
                  <Trash2 size={16} strokeWidth={2.5} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      
      {/* Delete Confirmation Modal */}
      {deleteModal.open && deleteModal.trip && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-8 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-red-50 dark:bg-red-950/20 flex items-center justify-center text-red-500">
                  <AlertTriangle size={24} strokeWidth={2.5} />
                </div>
                <h2 className="text-xl font-black text-slate-900 dark:text-white">Delete Trip</h2>
              </div>
              <button
                onClick={() => setDeleteModal({ open: false, trip: null })}
                className="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
              >
                <X size={16} strokeWidth={2.5} />
              </button>
            </div>
            
            <div className="space-y-6">
              <div>
                <p className="text-slate-600 dark:text-slate-400 font-medium mb-4">
                  This action cannot be undone. This will permanently delete the trip and all its data including:
                </p>
                <ul className="space-y-2 text-sm text-slate-500 dark:text-slate-500">
                  <li>• Itinerary entries</li>
                  <li>• Expenses</li>
                  <li>• Activity logs</li>
                  <li>• Shared access</li>
                </ul>
              </div>
              
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                  Type the trip name to confirm deletion:
                </label>
                <input
                  type="text"
                  value={confirmationText}
                  onChange={(e) => setConfirmationText(e.target.value)}
                  placeholder={deleteModal.trip.title}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setDeleteModal({ open: false, trip: null })}
                  className="flex-1 px-5 py-3 rounded-xl font-bold text-sm bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (confirmationText === deleteModal.trip?.title) {
                      onDeleteTrip(deleteModal.trip.id);
                      setDeleteModal({ open: false, trip: null });
                      setConfirmationText('');
                    }
                  }}
                  disabled={confirmationText !== deleteModal.trip.title}
                  className="flex-1 px-5 py-3 rounded-xl font-bold text-sm bg-red-600 text-white hover:bg-red-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:text-slate-500 dark:disabled:text-slate-600 transition-colors disabled:cursor-not-allowed"
                >
                  Delete Trip
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
