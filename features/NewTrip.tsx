
import React from 'react';
import { Calendar, MapPin, Wallet } from 'lucide-react';

interface NewTripProps {
  onSubmit: (data: { title: string; description: string; startDate: string; endDate: string; destination: string; budget?: number }) => Promise<void>;
  onCancel: () => void;
  currencySymbol?: string;
}

const NewTrip: React.FC<NewTripProps> = ({ onSubmit, onCancel, currencySymbol = '₱' }) => {
  return (
    <div className="space-y-8 animate-in slide-in-from-bottom duration-500">
      <div className="space-y-2">
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">Where to next?</h1>
        <p className="text-slate-500 dark:text-slate-400">Tell us about your next adventure.</p>
      </div>

      <form 
        className="space-y-6"
        onSubmit={async (e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          const budgetRaw = fd.get('budget') as string;
          await onSubmit({
            title: fd.get('title') as string,
            description: fd.get('description') as string,
            startDate: fd.get('startDate') as string,
            endDate: fd.get('endDate') as string,
            destination: fd.get('location') as string,
            budget: budgetRaw ? parseFloat(budgetRaw) : undefined,
          });
        }}
      >
        <div className="space-y-4">
          <div className="relative">
             <input 
              name="title" 
              required 
              placeholder="Give your trip a name" 
              className="w-full px-4 py-4 rounded-2xl border-2 border-slate-100 dark:border-slate-800 dark:bg-slate-900 focus:border-indigo-600 dark:focus:border-indigo-500 focus:ring-0 text-lg font-medium transition-all dark:text-white"
            />
          </div>

          <div className="flex gap-4">
            <div className="flex-1 space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase ml-1">Start Date</label>
              <input name="startDate" type="date" required className="w-full p-3 rounded-xl border border-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-white" />
            </div>
            <div className="flex-1 space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase ml-1">End Date</label>
              <input name="endDate" type="date" required className="w-full p-3 rounded-xl border border-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-white" />
            </div>
          </div>

          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
              <MapPin size={20} />
            </div>
            <input 
              name="location" 
              placeholder="Destination city or country" 
              className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-100 dark:border-slate-800 dark:bg-slate-900 focus:border-indigo-600 dark:focus:border-indigo-500 transition-all dark:text-white"
            />
          </div>

          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 flex items-center gap-1">
              <span className="font-bold text-sm">{currencySymbol}</span>
            </div>
            <input 
              name="budget" 
              type="number"
              step="0.01"
              placeholder={`Total budget (${currencySymbol})`} 
              className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-100 dark:border-slate-800 dark:bg-slate-900 focus:border-indigo-600 dark:focus:border-indigo-500 transition-all dark:text-white"
            />
          </div>

          <textarea 
            name="description" 
            placeholder="Trip notes or description..." 
            rows={3}
            className="w-full p-4 rounded-xl border border-slate-100 dark:border-slate-800 dark:bg-slate-900 focus:border-indigo-600 dark:focus:border-indigo-500 transition-all dark:text-white"
          />
        </div>

        <div className="flex flex-col gap-3">
          <button 
            type="submit" 
            className="w-full bg-indigo-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-indigo-100 dark:shadow-none hover:bg-indigo-700 transition-all transform active:scale-[0.98]"
          >
            Create Trip
          </button>
          <button 
            type="button" 
            onClick={onCancel}
            className="w-full text-slate-400 font-semibold py-3"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default NewTrip;
