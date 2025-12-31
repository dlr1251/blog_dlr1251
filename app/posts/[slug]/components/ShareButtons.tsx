'use client';

import { Button } from '@/components/ui/button';

interface ShareButtonsProps {
  title: string;
  slug: string;
}

export function ShareButtons({ title, slug }: ShareButtonsProps) {
  const url = typeof window !== 'undefined' ? window.location.href : '';
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  const shareLinks = {
    twitter: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
    whatsapp: `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`,
    email: `mailto:?subject=${encodedTitle}&body=${encodedUrl}`,
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      // You could add a toast notification here
      alert('Enlace copiado al portapapeles');
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="flex flex-wrap gap-2 items-center">
      <span className="text-sm text-gray-600 mr-2">Compartir:</span>
      <Button
        variant="outline"
        size="sm"
        onClick={() => window.open(shareLinks.twitter, '_blank')}
        className="text-xs"
      >
        Twitter
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => window.open(shareLinks.facebook, '_blank')}
        className="text-xs"
      >
        Facebook
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => window.open(shareLinks.linkedin, '_blank')}
        className="text-xs"
      >
        LinkedIn
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => window.open(shareLinks.whatsapp, '_blank')}
        className="text-xs"
      >
        WhatsApp
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => window.open(shareLinks.email, '_blank')}
        className="text-xs"
      >
        Email
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={handleCopyLink}
        className="text-xs"
      >
        Copiar enlace
      </Button>
    </div>
  );
}

