-- Trippings Database Schema for Supabase
-- Updated to match actual database structure on 2025-01-06

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    email TEXT,
    username TEXT,
    full_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, now()) NOT NULL
);

-- Trips table
CREATE TABLE IF NOT EXISTS trips (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    destination TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status TEXT DEFAULT 'planning' CHECK (status IN ('planning', 'ongoing', 'completed', 'cancelled')),
    budget DECIMAL(10,2) DEFAULT 0,
    currency TEXT DEFAULT 'PHP',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, now()) NOT NULL
);

-- Trip shares table (for sharing trips with non-users)
CREATE TABLE IF NOT EXISTS shares (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    trip_id UUID REFERENCES trips(id) ON DELETE CASCADE NOT NULL,
    user_email TEXT NOT NULL,
    permission TEXT DEFAULT 'view' CHECK (permission IN ('view', 'edit')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, now()) NOT NULL,
    UNIQUE(trip_id, user_email)
);

-- Trip members table
CREATE TABLE IF NOT EXISTS trip_members (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    trip_id UUID REFERENCES trips(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT,
    role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'declined')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, now()) NOT NULL
);

-- Itinerary table
CREATE TABLE IF NOT EXISTS itinerary (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    trip_id UUID REFERENCES trips(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    location TEXT,
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    category TEXT DEFAULT 'activity' CHECK (category IN ('activity', 'accommodation', 'transportation', 'dining', 'other')),
    status TEXT DEFAULT 'planned' CHECK (status IN ('planned', 'ongoing', 'completed', 'cancelled')),
    cost DECIMAL(10,2) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, now()) NOT NULL
);

-- Expenses table
CREATE TABLE IF NOT EXISTS expenses (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    trip_id UUID REFERENCES trips(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT DEFAULT 'other' CHECK (category IN ('accommodation', 'transportation', 'dining', 'activities', 'shopping', 'other')),
    amount DECIMAL(10,2) NOT NULL,
    currency TEXT DEFAULT 'PHP',
    date DATE NOT NULL,
    payment_method TEXT DEFAULT 'cash' CHECK (payment_method IN ('cash', 'card', 'transfer', 'other')),
    receipt_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, now()) NOT NULL
);

-- Activity logs table
CREATE TABLE IF NOT EXISTS activity_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    trip_id UUID REFERENCES trips(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    entity_type TEXT CHECK (entity_type IN ('trip', 'itinerary', 'expense', 'member')),
    entity_id UUID,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, now()) NOT NULL
);

-- Notifications table (for local storage, but can be synced)
CREATE TABLE IF NOT EXISTS notifications (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    type TEXT DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error')),
    target_id UUID,
    target_type TEXT,
    read BOOLEAN DEFAULT FALSE,
    cleared BOOLEAN DEFAULT FALSE,
    trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
    trip_title TEXT,
    actor_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    actor_name TEXT,
    action TEXT,
    timestamp BIGINT DEFAULT EXTRACT(EPOCH FROM NOW()) * 1000,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, now()) NOT NULL
);

-- Settings table
CREATE TABLE IF NOT EXISTS user_settings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    theme TEXT DEFAULT 'light' CHECK (theme IN ('light', 'dark', 'system')),
    currency TEXT DEFAULT 'PHP',
    notifications_enabled BOOLEAN DEFAULT TRUE,
    email_notifications BOOLEAN DEFAULT TRUE,
    push_notifications BOOLEAN DEFAULT TRUE,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, now()) NOT NULL,
    UNIQUE(user_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_trips_user_id ON trips(user_id);
CREATE INDEX IF NOT EXISTS idx_trips_status ON trips(status);
CREATE INDEX IF NOT EXISTS idx_trips_dates ON trips(start_date, end_date);

CREATE INDEX IF NOT EXISTS idx_shares_trip_id ON shares(trip_id);
CREATE INDEX IF NOT EXISTS idx_shares_user_email ON shares(user_email);

CREATE INDEX IF NOT EXISTS idx_trip_members_trip_id ON trip_members(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_members_user_id ON trip_members(user_id);

CREATE INDEX IF NOT EXISTS idx_itinerary_trip_id ON itinerary(trip_id);
CREATE INDEX IF NOT EXISTS idx_itinerary_dates ON itinerary(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_itinerary_status ON itinerary(status);

CREATE INDEX IF NOT EXISTS idx_expenses_trip_id ON expenses(trip_id);
CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);

CREATE INDEX IF NOT EXISTS idx_activity_logs_trip_id ON activity_logs(trip_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_timestamp ON notifications(timestamp);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_trips_updated_at ON trips;
CREATE TRIGGER update_trips_updated_at BEFORE UPDATE ON trips FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_itinerary_updated_at ON itinerary;
CREATE TRIGGER update_itinerary_updated_at BEFORE UPDATE ON itinerary FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_expenses_updated_at ON expenses;
CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON expenses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_settings_updated_at ON user_settings;
CREATE TRIGGER update_user_settings_updated_at BEFORE UPDATE ON user_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE itinerary ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- Profiles policies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can view collaborator profiles" ON profiles;
CREATE POLICY "Users can view collaborator profiles" ON profiles FOR SELECT USING (
  auth.uid() = id OR
  EXISTS (
    SELECT 1 FROM shares 
    WHERE shares.user_email = profiles.email 
    AND EXISTS (
      SELECT 1 FROM trips 
      WHERE trips.id = shares.trip_id 
      AND trips.user_id = auth.uid()
    )
  )
);

-- Trips policies
DROP POLICY IF EXISTS "Users can view own trips" ON trips;
CREATE POLICY "Users can view own trips" ON trips FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own trips" ON trips;
CREATE POLICY "Users can create own trips" ON trips FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own trips" ON trips;
CREATE POLICY "Users can update own trips" ON trips FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own trips" ON trips;
CREATE POLICY "Users can delete own trips" ON trips FOR DELETE USING (auth.uid() = user_id);

-- Shares policies
DROP POLICY IF EXISTS "Users can view shares for their trips" ON shares;
CREATE POLICY "Users can view shares for their trips" ON shares FOR SELECT USING (
    EXISTS (SELECT 1 FROM trips WHERE trips.id = shares.trip_id AND trips.user_id = auth.uid())
);

DROP POLICY IF EXISTS "Users can manage shares for their trips" ON shares;
CREATE POLICY "Users can manage shares for their trips" ON shares FOR ALL USING (
    EXISTS (SELECT 1 FROM trips WHERE trips.id = shares.trip_id AND trips.user_id = auth.uid())
);

-- Trip members policies
DROP POLICY IF EXISTS "Users can view trip members for their trips" ON trip_members;
CREATE POLICY "Users can view trip members for their trips" ON trip_members FOR SELECT USING (
    EXISTS (SELECT 1 FROM trips WHERE trips.id = trip_members.trip_id AND trips.user_id = auth.uid())
);

DROP POLICY IF EXISTS "Users can manage trip members for their trips" ON trip_members;
CREATE POLICY "Users can manage trip members for their trips" ON trip_members FOR ALL USING (
    EXISTS (SELECT 1 FROM trips WHERE trips.id = trip_members.trip_id AND trips.user_id = auth.uid())
);

-- Itinerary policies
DROP POLICY IF EXISTS "Users can view itinerary for their trips" ON itinerary;
CREATE POLICY "Users can view itinerary for their trips" ON itinerary FOR SELECT USING (
    EXISTS (SELECT 1 FROM trips WHERE trips.id = itinerary.trip_id AND trips.user_id = auth.uid())
);

DROP POLICY IF EXISTS "Users can manage itinerary for their trips" ON itinerary;
CREATE POLICY "Users can manage itinerary for their trips" ON itinerary FOR ALL USING (
    EXISTS (SELECT 1 FROM trips WHERE trips.id = itinerary.trip_id AND trips.user_id = auth.uid())
);

-- Expenses policies
DROP POLICY IF EXISTS "Users can view expenses for their trips" ON expenses;
CREATE POLICY "Users can view expenses for their trips" ON expenses FOR SELECT USING (
    EXISTS (SELECT 1 FROM trips WHERE trips.id = expenses.trip_id AND trips.user_id = auth.uid())
);

DROP POLICY IF EXISTS "Users can manage expenses for their trips" ON expenses;
CREATE POLICY "Users can manage expenses for their trips" ON expenses FOR ALL USING (
    EXISTS (SELECT 1 FROM trips WHERE trips.id = expenses.trip_id AND trips.user_id = auth.uid())
);

-- Activity logs policies
DROP POLICY IF EXISTS "Users can view activity logs for their trips" ON activity_logs;
CREATE POLICY "Users can view activity logs for their trips" ON activity_logs FOR SELECT USING (
    EXISTS (SELECT 1 FROM trips WHERE trips.id = activity_logs.trip_id AND trips.user_id = auth.uid())
);

DROP POLICY IF EXISTS "Users can create activity logs for their trips" ON activity_logs;
CREATE POLICY "Users can create activity logs for their trips" ON activity_logs FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM trips WHERE trips.id = activity_logs.trip_id AND trips.user_id = auth.uid())
);

-- Notifications policies
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
CREATE POLICY "Users can view own notifications" ON notifications FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own notifications" ON notifications;
CREATE POLICY "Users can manage own notifications" ON notifications FOR ALL USING (auth.uid() = user_id);

-- User settings policies
DROP POLICY IF EXISTS "Users can view own settings" ON user_settings;
CREATE POLICY "Users can view own settings" ON user_settings FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own settings" ON user_settings;
CREATE POLICY "Users can manage own settings" ON user_settings FOR ALL USING (auth.uid() = user_id);

-- Enable realtime for activity logs and notifications tables
ALTER PUBLICATION supabase_realtime ADD TABLE activity_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- Create a function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, username, full_name)
    VALUES (new.id, new.email, new.email, new.raw_user_meta_data->>'full_name');
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create a function to create default settings for new users
CREATE OR REPLACE FUNCTION public.create_default_settings()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_settings (user_id, theme, currency)
    VALUES (new.id, 'light', 'PHP');
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for default settings
DROP TRIGGER IF EXISTS on_profile_created ON profiles;
CREATE TRIGGER on_profile_created
    AFTER INSERT ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.create_default_settings();