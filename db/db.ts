
import Dexie from 'dexie';
import type { Table } from 'dexie';
import { Trip, ItineraryEntry, Expense, TripShare, User, AppNotification, Metadata, ActivityLog } from '../types';

/**
 * TrippingsDB class extends Dexie to provide a strongly-typed interface for the application's local database.
 */
export class TrippingsDB extends Dexie {
  trips!: Table<Trip>;
  itinerary!: Table<ItineraryEntry>;
  expenses!: Table<Expense>;
  shares!: Table<TripShare>;
  users!: Table<User>;
  notifications!: Table<AppNotification>;
  metadata!: Table<Metadata>;
  activityLogs!: Table<ActivityLog>;

  constructor() {
    super('TrippingsDB');
    
    // Version 4: Added password field to users table and updated indexing
    this.version(4).stores({
      trips: 'id, ownerId, startDate, endDate, createdAt',
      itinerary: 'id, tripId, date, time, status',
      expenses: 'id, tripId, date, category',
      shares: 'id, tripId, userEmail',
      users: 'id, email, username',
      notifications: 'id, userId, timestamp, read',
      metadata: 'key',
      activityLogs: 'id, tripId, timestamp, userId'
    });
  }
}

export const db = new TrippingsDB();
