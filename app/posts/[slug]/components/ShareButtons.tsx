'use client';

import { Share2, Twitter, Facebook, Linkedin, MessageCircle, Mail, Copy, Check } from 'lucide-react';
import { useState } from 'react';

interface ShareButtonsProps {
  title: string;
  slug: string;
}

export function ShareButtons({ title, slug }: ShareButtonsProps) {
  const url = typeof window !== 'undefined' ? window.location.href : '';
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);
  const [copied, setCopied] = useState(false);

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
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const iconSize = 18;
  const iconClass = 'w-4 h-4 text-gray-600 hover:text-gray-900 transition-colors';

  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="text-xs text-gray-500 hidden sm:inline">Compartir:</span>
      <div className="flex items-center gap-2">
        <a
          href={shareLinks.twitter}
          target="_blank"
          rel="noopener noreferrer"
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          aria-label="Compartir en Twitter"
        >
          <Twitter className={iconClass} size={iconSize} />
        </a>
        <a
          href={shareLinks.facebook}
          target="_blank"
          rel="noopener noreferrer"
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          aria-label="Compartir en Facebook"
        >
          <Facebook className={iconClass} size={iconSize} />
        </a>
        <a
          href={shareLinks.linkedin}
          target="_blank"
          rel="noopener noreferrer"
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          aria-label="Compartir en LinkedIn"
        >
          <Linkedin className={iconClass} size={iconSize} />
        </a>
        <a
          href={shareLinks.whatsapp}
          target="_blank"
          rel="noopener noreferrer"
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          aria-label="Compartir en WhatsApp"
        >
          <MessageCircle className={iconClass} size={iconSize} />
        </a>
        <a
          href={shareLinks.email}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          aria-label="Compartir por email"
        >
          <Mail className={iconClass} size={iconSize} />
        </a>
        <button
          onClick={handleCopyLink}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          aria-label="Copiar enlace"
        >
          {copied ? (
            <Check className="w-4 h-4 text-green-600" size={iconSize} />
          ) : (
            <Copy className={iconClass} size={iconSize} />
          )}
        </button>
      </div>
    </div>
  );
}
