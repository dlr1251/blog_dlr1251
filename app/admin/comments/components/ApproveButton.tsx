'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export function ApproveButton({ commentId }: { commentId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleApprove = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/comments/${commentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved: true }),
      });

      if (response.ok) {
        router.refresh();
      }
    } catch (error) {
      console.error('Error approving comment:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button 
      onClick={handleApprove} 
      size="sm" 
      variant="outline"
      disabled={loading}
    >
      {loading ? 'Aprobando...' : 'Aprobar'}
    </Button>
  );
}

