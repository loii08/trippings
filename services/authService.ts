
import { supabase } from '../lib/supabase';
import { db } from '../db/db';
import { User } from '../types';
import { hashPassword, verifyPassword } from '../utils/crypto';

export const authService = {
  async getCurrentUser(): Promise<User | null> {
    // For local auth, we'd need to store current user in localStorage or session
    const currentUserId = localStorage.getItem('currentUserId');
    if (!currentUserId) return null;

    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', currentUserId)
      .single();

    if (error || !user) {
      localStorage.removeItem('currentUserId');
      return null;
    }

    // Remove password from returned user object
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  },

  async login(identifier: string, password?: string): Promise<User | null> {
    if (!password) return null;

    // Find user by email or username in Supabase
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .or(`email.eq.${identifier},username.eq.${identifier}`)
      .maybeSingle(); // Use maybeSingle() instead of single()

    if (error || !user || !user.password) return null;

    const isValidPassword = await verifyPassword(password, user.password);
    if (!isValidPassword) return null;

    // Store current user session
    localStorage.setItem('currentUserId', user.id);

    // Remove password from returned user object
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  },

  async signup(email: string, username: string, password?: string): Promise<User> {
    if (!password) throw new Error('Password is required');

    const hashedPassword = await hashPassword(password);
    
    // Insert user into Supabase users table
    const { data: newUser, error } = await supabase
      .from('users')
      .insert({
        email,
        username,
        password: hashedPassword,
        name: username,
        joined_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error || !newUser) throw error || new Error('Failed to create user');

    // Auto-login after signup
    localStorage.setItem('currentUserId', newUser.id);

    // Remove password from returned user object
    const { password: _, ...userWithoutPassword } = newUser;
    return userWithoutPassword;
  },

  async updateUser(userId: string, updates: Partial<User>): Promise<User | null> {
    const { data: user, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error || !user) return null;

    // Remove password from returned user object
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  },

  async loginWithGoogle(): Promise<User | null> {
    // Google OAuth not implemented for local auth
    throw new Error('Google login not available in local mode');
  },

  async logout() {
    // Clear current user session
    localStorage.removeItem('currentUserId');
  }
};
