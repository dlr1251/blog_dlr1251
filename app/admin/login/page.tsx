'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@/lib/supabase-client';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [supabase, setSupabase] = useState<ReturnType<typeof createBrowserClient> | null>(null);

  useEffect(() => {
    setMounted(true);
    try {
      const client = createBrowserClient();
      setSupabase(client);
    } catch (err: any) {
      setError(`Error de configuración: ${err.message}`);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    e.stopPropagation();

    if (!supabase) {
      setError('Cliente de Supabase no inicializado. Recarga la página.');
      return;
    }

    if (!email || !password) {
      setError('Por favor completa todos los campos');
      return;
    }

    setError('');
    setLoading(true);

    try {
      // Sign in
      const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setLoading(false);
        if (signInError.message.includes('Invalid login credentials') || signInError.message.includes('Invalid')) {
          setError('Email o contraseña incorrectos');
        } else if (signInError.message.includes('Email not confirmed')) {
          setError('Por favor confirma tu email antes de iniciar sesión');
        } else {
          setError(`Error: ${signInError.message}`);
        }
        return;
      }

      if (!authData.user) {
        setLoading(false);
        setError('Error: No se recibió información del usuario');
        return;
      }

      // Wait for session to be established in cookies
      await new Promise(resolve => setTimeout(resolve, 300));

      // Verify session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        setLoading(false);
        setError('Error: No se pudo establecer la sesión. Intenta nuevamente.');
        return;
      }

      // Check if user is admin
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', authData.user.id)
        .single();

      if (profileError) {
        // Profile doesn't exist, create it
        const { error: insertError } = await supabase
          .from('user_profiles')
          .insert({
            id: authData.user.id,
            name: authData.user.email,
            role: 'admin',
          });

        if (insertError) {
          setLoading(false);
          setError('Error al crear el perfil. Contacta al administrador.');
          await supabase.auth.signOut();
          return;
        }
      } else if (profile?.role !== 'admin') {
        setLoading(false);
        await supabase.auth.signOut();
        setError('No tienes permisos de administrador');
        return;
      }

      // Redirect using window.location to ensure cookies are sent
      window.location.href = '/admin';
    } catch (err: any) {
      setLoading(false);
      setError(`Error inesperado: ${err.message || 'Error al iniciar sesión'}`);
    }
  };

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-full max-w-md bg-white rounded-lg border shadow-sm p-6">
          <div className="mb-4">
            <h1 className="text-2xl font-semibold text-gray-900">Iniciar Sesión</h1>
            <p className="text-sm text-gray-500 mt-1">Accede al panel de administración del blog</p>
          </div>
          <p className="text-sm text-gray-500">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md bg-white rounded-lg border shadow-sm p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">Iniciar Sesión</h1>
          <p className="text-sm text-gray-500 mt-1">
            Accede al panel de administración del blog
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md border border-red-200">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              autoComplete="email"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              autoComplete="current-password"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={loading || !supabase}
          >
            {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
          </button>
        </form>
      </div>
    </div>
  );
}
