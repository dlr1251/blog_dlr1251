'use client';

import { useMemo } from 'react';
import { createBrowserClient } from '@/lib/supabase-client';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export function SignOutButton() {
  const router = useRouter();
  const supabase = useMemo(() => createBrowserClient(), []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/admin/login');
    router.refresh();
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleSignOut}
      className="text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2 h-8 sm:h-9"
    >
      <span className="hidden sm:inline">Cerrar Sesión</span>
      <span className="sm:hidden">Salir</span>
    </Button>
  );
}
