
export type TripRole = 'OWNER' | 'EDITOR' | 'VIEWER';
export type PlanStatus = 'pending' | 'done' | 'canceled';

export interface User {
  id: string;
  email: string;
  username: string;
  password?: string;
  name?: string;
  joinedAt: number;
}

export type ThemeMode = 'light' | 'dark' | 'system';

export interface UserSettings {
  currency: string;
  currencySymbol: string;
  theme: ThemeMode;
  pushNotifications: boolean;
}

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  body: string;
  timestamp: number;
  read: boolean;
  cleared: boolean;
  type: NotificationType;
  targetId?: string;
  targetType?: 'trip' | 'expense' | 'itinerary';
}

export interface Metadata {
  key: string;
  value: string;
}

export interface ActivityLog {
  id: string;
  tripId: string;
  userId: string;
  userName: string;
  action: string;
  details: string;
  timestamp: number;
  targetId?: string; // ID of the specific item added/edited
  targetType?: 'expense' | 'itinerary' | 'member';
}

export interface Trip {
  id: string;
  ownerId: string;
  title: string;
  description?: string;
  startDate: string;
  endDate: string;
  destination?: string;
  budget?: number;
  createdAt: number;
  updatedAt: number;
}

export interface ItineraryEntry {
  id: string;
  tripId: string;
  date: string;
  time: string;
  title: string;
  location?: string;
  notes?: string;
  status: PlanStatus;
  createdBy: string;
  createdAt: number;
}

export interface Expense {
  id: string;
  tripId: string;
  date: string;
  amount: number;
  currency: string;
  category: string;
  description: string;
  payer: string;
  createdBy: string;
  createdAt: number;
}

export interface TripShare {
  id: string;
  tripId: string;
  userEmail: string;
  role: TripRole;
}

export enum ExpenseCategory {
  ACCOMMODATION = 'accommodation',
  TRANSPORTATION = 'transportation',
  DINING = 'dining',
  ACTIVITIES = 'activities',
  SHOPPING = 'shopping',
  OTHER = 'other'
}

export enum NotificationType {
  TRIP_INVITATION = 'trip_invitation',
  INVITATION_ACCEPTED = 'invitation_accepted',
  INVITATION_REJECTED = 'invitation_rejected'
}

export interface TripInvitation {
  id: string;
  tripId: string;
  tripTitle: string;
  tripLocation?: string;
  tripStartDate?: string;
  tripEndDate?: string;
  inviterName: string;
  inviterId: string;
  inviteeEmail: string;
  status: 'pending' | 'accepted' | 'rejected' | 'owner';
  isOwner?: boolean;
  createdAt: number;
}
