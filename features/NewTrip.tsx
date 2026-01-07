
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
        <h1 className="text-3xl font-extrabold text-primary">Where to next?</h1>
        <p className="text-secondary">Tell us about your next adventure.</p>
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
              className="w-full px-4 py-4 rounded-2xl border-2 border-custom bg-surface focus:border-primary focus:ring-0 text-lg font-medium transition-all text-primary"
            />
          </div>

          <div className="flex gap-4">
            <div className="flex-1 space-y-1">
              <label className="text-xs font-bold text-muted uppercase ml-1">Start Date</label>
              <input name="startDate" type="date" required className="w-full p-3 rounded-xl border border-custom bg-surface text-primary" />
            </div>
            <div className="flex-1 space-y-1">
              <label className="text-xs font-bold text-muted uppercase ml-1">End Date</label>
              <input name="endDate" type="date" required className="w-full p-3 rounded-xl border border-custom bg-surface text-primary" />
            </div>
          </div>

          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted">
              <MapPin size={20} />
            </div>
            <input 
              name="location" 
              placeholder="Destination city or country" 
              className="w-full pl-12 pr-4 py-3 rounded-xl border border-custom bg-surface focus:border-primary transition-all text-primary"
            />
          </div>

          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted">
              <Wallet size={20} />
            </div>
            <input 
              name="budget" 
              type="number"
              step="0.01"
              placeholder={`Total budget (${currencySymbol})`} 
              className="w-full pl-12 pr-4 py-3 rounded-xl border border-custom bg-surface focus:border-primary transition-all text-primary"
            />
          </div>

          <textarea 
            name="description" 
            placeholder="Trip notes or description..." 
            rows={3}
            className="w-full p-4 rounded-xl border border-custom bg-surface focus:border-primary transition-all text-primary"
          />
        </div>

        <div className="flex flex-col gap-3">
          <button 
            type="submit" 
            className="w-full bg-primary text-inverse font-bold py-4 rounded-2xl shadow-lg shadow-primary-soft hover:bg-primary-hover transition-all transform active:scale-[0.98]"
          >
            Create Trip
          </button>
          <button 
            type="button" 
            onClick={onCancel}
            className="w-full text-muted font-semibold py-3"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default NewTrip;
