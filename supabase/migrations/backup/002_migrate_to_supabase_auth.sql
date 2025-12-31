-- Migration to Supabase Auth
-- This migration removes the custom users table and uses Supabase Auth instead

-- First, create a user_profiles table that extends auth.users
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Update posts table to reference auth.users
-- First, find and drop the existing constraint
DO $$
DECLARE
    constraint_name TEXT;
BEGIN
    -- Find the constraint name for posts.author_id
    SELECT conname INTO constraint_name
    FROM pg_constraint
    WHERE conrelid = 'posts'::regclass
      AND confrelid = 'users'::regclass
      AND contype = 'f';
    
    IF constraint_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE posts DROP CONSTRAINT ' || constraint_name;
    END IF;
END $$;

-- Now add the new constraint referencing auth.users
ALTER TABLE posts 
  ADD CONSTRAINT posts_author_id_fkey 
    FOREIGN KEY (author_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Update comments table to reference auth.users
DO $$
DECLARE
    constraint_name TEXT;
BEGIN
    -- Find the constraint name for comments.user_id
    SELECT conname INTO constraint_name
    FROM pg_constraint
    WHERE conrelid = 'comments'::regclass
      AND confrelid = 'users'::regclass
      AND contype = 'f'
      AND conkey::text LIKE '%user_id%';
    
    IF constraint_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE comments DROP CONSTRAINT ' || constraint_name;
    END IF;
END $$;

-- Add new constraint for comments.user_id
ALTER TABLE comments 
  ADD CONSTRAINT comments_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- Update notifications table to reference auth.users
DO $$
DECLARE
    constraint_name TEXT;
BEGIN
    -- Find the constraint name for notifications.user_id
    SELECT conname INTO constraint_name
    FROM pg_constraint
    WHERE conrelid = 'notifications'::regclass
      AND confrelid = 'users'::regclass
      AND contype = 'f';
    
    IF constraint_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE notifications DROP CONSTRAINT ' || constraint_name;
    END IF;
END $$;

-- Add new constraint for notifications.user_id
ALTER TABLE notifications 
  ADD CONSTRAINT notifications_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Update user_comment_preferences table to reference auth.users
DO $$
DECLARE
    constraint_name TEXT;
BEGIN
    -- Find the constraint name for user_comment_preferences.user_id
    SELECT conname INTO constraint_name
    FROM pg_constraint
    WHERE conrelid = 'user_comment_preferences'::regclass
      AND confrelid = 'users'::regclass
      AND contype = 'f';
    
    IF constraint_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE user_comment_preferences DROP CONSTRAINT ' || constraint_name;
    END IF;
END $$;

-- Add new constraint for user_comment_preferences.user_id
ALTER TABLE user_comment_preferences 
  ADD CONSTRAINT user_comment_preferences_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create function to automatically create user profile when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'user')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to call the function when a new user is created
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Drop old users table if it exists (after migrating data if needed)
-- Note: You may want to migrate existing users first
-- DROP TABLE IF EXISTS users CASCADE;

-- Update RLS policies for user_profiles
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;

CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = id);

-- Function to update updated_at timestamp for user_profiles
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
