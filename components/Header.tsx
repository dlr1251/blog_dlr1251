import Link from 'next/link';
import { ThemeToggle } from './ThemeToggle';

export function Header() {
  return (
    <header 
      className="border-b transition-all duration-500"
      style={{
        backgroundColor: 'var(--theme-surface)',
        borderColor: 'var(--theme-border)',
        borderWidth: 'var(--theme-border-width)',
      }}
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-2 sm:py-4">
        <div className="flex justify-between items-center gap-3 sm:gap-4">
          <Link 
            href="/" 
            className="text-base sm:text-xl font-bold transition-colors duration-500 hover:opacity-80"
            style={{
              color: 'var(--theme-text)',
              fontFamily: 'var(--theme-font-heading)',
              fontWeight: 'var(--theme-heading-weight)',
              letterSpacing: 'var(--theme-heading-tracking)',
            }}
          >
            Blog de Daniel Luque
          </Link>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}

