// Smart notification system for collaborative activities
import { supabase } from './supabase';
import { User } from '../types';

export const sendCollaborativeNotification = async (
  action: 'itinerary_added' | 'itinerary_updated' | 'itinerary_deleted' | 'expense_added' | 'expense_updated' | 'expense_deleted' | 'status_updated' | 'member_accepted' | 'member_declined' | 'trip_update',
  actor: User,
  tripId: string,
  tripTitle: string,
  itemTitle?: string,
  oldStatus?: string,
  newStatus?: string
) => {
  if (!actor || !actor.id) {
    console.error('❌ Invalid actor provided:', actor);
    return;
  }
  let title = '';
  let body = '';
  let type: 'info' | 'success' | 'warning' = 'info';

  switch (action) {
    case 'itinerary_added':
      title = 'New Itinerary Item';
      body = `${actor.name || actor.username} added "${itemTitle}"`;
      type = 'info';
      break;
      
    case 'itinerary_updated':
      title = 'Itinerary Updated';
      body = `${actor.name || actor.username} updated "${itemTitle}"`;
      type = 'info';
      break;
      
    case 'itinerary_deleted':
      title = 'Itinerary Item Removed';
      body = `${actor.name || actor.username} removed "${itemTitle}"`;
      type = 'warning';
      break;
      
    case 'expense_added':
      title = 'New Expense';
      body = `${actor.name || actor.username} added expense: "${itemTitle}"`;
      type = 'info';
      break;
      
    case 'expense_updated':
      title = 'Expense Updated';
      body = `${actor.name || actor.username} updated expense: "${itemTitle}"`;
      type = 'info';
      break;
      
    case 'expense_deleted':
      title = 'Expense Removed';
      body = `${actor.name || actor.username} removed expense: "${itemTitle}"`;
      type = 'warning';
      break;
      
    case 'status_updated':
      title = 'Status Changed';
      body = `${actor.name || actor.username} changed "${itemTitle}" from ${oldStatus} to ${newStatus}`;
      type = 'info';
      break;
      
    case 'member_accepted':
      title = 'Member Joined';
      body = `${actor.name || actor.username} accepted the trip invitation`;
      type = 'success';
      break;
      
    case 'member_declined':
      title = 'Member Declined';
      body = `${actor.name || actor.username} declined trip invitation`;
      type = 'warning';
      break;
      
    case 'trip_update':
      title = 'Trip Updated';
      body = `${actor.name || actor.username} updated trip details: "${tripTitle}"`;
      type = 'info';
      break;
  }

  try {
    // Get trip details first to identify the owner
    const { data: tripData, error: tripError } = await supabase
      .from('trips')
      .select('user_id, title')
      .eq('id', tripId)
      .single();

    if (tripError) {
      console.error('❌ Failed to fetch trip details:', tripError);
      return;
    }

    // Get all trip collaborators from shares table
    const { data: tripShares, error: sharesError } = await supabase
      .from('shares')
      .select('user_email, permission')
      .eq('trip_id', tripId);

    if (sharesError) {
      console.error('❌ Failed to fetch trip shares:', sharesError);
      return;
    }

    // Prepare list of collaborators to notify
    const collaboratorsToNotify: Array<{ userId: string; email: string }> = [];

    // Add trip owner if they're not the actor
    if (tripData.user_id !== actor.id) {
      // Get owner's email from profiles
      const { data: ownerProfile, error: ownerError } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', tripData.user_id)
        .single();

      if (!ownerError && ownerProfile?.email) {
        collaboratorsToNotify.push({
          userId: tripData.user_id,
          email: ownerProfile.email
        });
      } else {
        // Fallback: try to get owner email from users table
        const { data: ownerUser, error: userError } = await supabase
          .from('users')
          .select('email')
          .eq('id', tripData.user_id)
          .single();

        if (!userError && ownerUser?.email) {
          collaboratorsToNotify.push({
            userId: tripData.user_id,
            email: ownerUser.email
          });
        }
      }
    }

    // Add shared collaborators (excluding the actor)
    if (tripShares && tripShares.length > 0) {
      const collaboratorEmails = tripShares
        .filter(share => share.user_email !== actor.email)
        .map(share => share.user_email);
      
      // Only proceed if there are collaborators other than actor
      if (collaboratorEmails.length === 0) {
        return; // No other collaborators to notify
      }

      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email')
        .in('email', collaboratorEmails);

      if (!profilesError && profiles) {
        profiles.forEach(profile => {
          collaboratorsToNotify.push({
            userId: profile.id,
            email: profile.email
          });
        });
      } else {
        // Fallback to email-to-user-id mapping
        const emailToUserIdMap: { [key: string]: string } = {
          'lalaceivyc@gmail.com': '07a4d1d2-75a6-4a19-8af8-d24768c7e536',
          'kijbutad08@gmail.com': 'd98e52ba-1c70-48ed-801b-c20fe907531d',
          // Add more mappings as needed
        };
        
        collaboratorEmails.forEach(email => {
          const userId = emailToUserIdMap[email];
          if (userId) {
            collaboratorsToNotify.push({ userId, email });
          }
        });
      }
    }

    // Remove duplicates and filter out actor
    const uniqueCollaborators = collaboratorsToNotify.filter(
      (collaborator, index, self) => 
        collaborator.userId !== actor.id && // Exclude actor
        self.findIndex(c => c.userId === collaborator.userId) === index // Remove duplicates
    );

    if (uniqueCollaborators.length === 0) {
      return; // No other collaborators to notify
    }

    // Create notifications for all collaborators
    const notifications = uniqueCollaborators.map(collaborator => ({
      user_id: collaborator.userId,
      title,
      body,
      type,
      trip_id: tripId,
      trip_title: tripTitle,
      actor_id: actor.id,
      actor_name: actor.name || actor.username,
      action,
      created_at: new Date().toISOString()
    }));

    const { error } = await supabase
      .from('notifications')
      .insert(notifications);

    if (error) {
      return;
      console.error('❌ Failed to insert notifications:', error);
    }
  } catch (error) {
    console.error('❌ Failed to send collaborative notification:', error);
  }
};

// Helper function to determine if an activity should trigger a toast notification
export const shouldShowToast = (
  action: string,
  success: boolean = true
): boolean => {
  // Only show toast notifications for important success/error messages
  // Not for routine collaborative activities (those are handled by the notification system)
  
  if (!success) {
    return true; // Always show toast for errors
  }
  
  // Only show toast for these important success actions
  const importantActions = [
    'created',
    'deleted',
    'updated',
    'added',
    'accepted',
    'declined'
  ];
  
  return importantActions.some(importantAction => 
    action.toLowerCase().includes(importantAction.toLowerCase())
  );
};

// Helper function to get toast message type
export const getToastType = (action: string, success: boolean = true): 'success' | 'error' | 'info' => {
  if (!success) return 'error';
  
  const successActions = ['created', 'added', 'accepted'];
  const warningActions = ['deleted', 'declined'];
  
  if (successActions.some(a => action.toLowerCase().includes(a))) {
    return 'success';
  } else if (warningActions.some(a => action.toLowerCase().includes(a))) {
    return 'info';
  }
  
  return 'success';
};
