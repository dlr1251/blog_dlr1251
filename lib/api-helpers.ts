import { createServerSupabaseClient } from './supabase-auth';
import { NextResponse } from 'next/server';

// Helper to get current user in API routes
export async function getCurrentUserFromRequest() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return null;
  }

  // Get user profile
  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (profileError) {
    return {
      id: user.id,
      email: user.email,
      name: user.user_metadata?.name || user.email,
      role: 'user',
    };
  }

  return {
    id: user.id,
    email: user.email,
    name: profile.name || user.user_metadata?.name || user.email,
    role: profile.role || 'user',
  };
}

// Helper to check if user is admin
export async function requireAdmin() {
  const user = await getCurrentUserFromRequest();
  
  if (!user) {
    return { user: null, error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  if (user.role !== 'admin') {
    return { user: null, error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }

  return { user, error: null };
}

