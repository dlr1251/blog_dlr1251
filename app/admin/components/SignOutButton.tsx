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
    >
      Cerrar Sesión
    </Button>
  );
}
