'use client';

import { useEffect, useState } from 'react';

type Theme = 'minimalist' | 'baroque' | 'classic';
type ThemeState = {
  theme: Theme;
  dark: boolean;
};

const THEME_ORDER: Theme[] = ['minimalist', 'baroque', 'classic'];

const THEME_ICONS: Record<Theme, { light: string; dark: string }> = {
  minimalist: { light: '⬜', dark: '⬛' },
  baroque: { light: '👑', dark: '🏛️' },
  classic: { light: '📜', dark: '📖' },
};

export function ThemeToggle() {
  const [themeState, setThemeState] = useState<ThemeState>({
    theme: 'minimalist',
    dark: false,
  });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    // Load saved theme from localStorage
    const savedTheme = localStorage.getItem('blog-theme') as Theme | null;
    const savedDark = localStorage.getItem('blog-dark') === 'true';
    
    if (savedTheme && THEME_ORDER.includes(savedTheme)) {
      setThemeState({ theme: savedTheme, dark: savedDark });
      applyTheme(savedTheme, savedDark);
    } else {
      // Default theme
      applyTheme('minimalist', false);
    }
  }, []);

  const applyTheme = (theme: Theme, dark: boolean) => {
    const root = document.documentElement;
    
    // Disable transitions during theme change
    root.classList.add('no-transition');
    
    // Remove all theme attributes
    root.removeAttribute('data-theme');
    root.removeAttribute('data-dark');
    
    // Apply new theme
    root.setAttribute('data-theme', theme);
    if (dark) {
      root.setAttribute('data-dark', 'true');
    }
    
    // Re-enable transitions after a brief delay
    setTimeout(() => {
      root.classList.remove('no-transition');
    }, 50);
    
    // Save to localStorage
    localStorage.setItem('blog-theme', theme);
    localStorage.setItem('blog-dark', dark ? 'true' : 'false');
  };

  const cycleTheme = () => {
    const currentIndex = THEME_ORDER.indexOf(themeState.theme);
    const nextIndex = (currentIndex + 1) % THEME_ORDER.length;
    const nextTheme = THEME_ORDER[nextIndex];
    
    // When cycling to a new theme, start with light mode
    const newState = { theme: nextTheme, dark: false };
    setThemeState(newState);
    applyTheme(nextTheme, false);
  };

  const toggleDarkMode = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const newDark = !themeState.dark;
    const newState = { ...themeState, dark: newDark };
    setThemeState(newState);
    applyTheme(themeState.theme, newDark);
  };

  if (!mounted) {
    // Return a placeholder to prevent hydration mismatch
    return (
      <button
        type="button"
        className="w-10 h-10 flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition-colors"
        aria-label="Cambiar tema"
      >
        <span className="text-lg">⬜</span>
      </button>
    );
  }

  const currentIcon = THEME_ICONS[themeState.theme][themeState.dark ? 'dark' : 'light'];

  return (
    <button
      type="button"
      onClick={cycleTheme}
      onDoubleClick={toggleDarkMode}
      className="w-10 h-10 flex items-center justify-center rounded-lg border border-current opacity-70 hover:opacity-100 transition-all duration-200 hover:scale-110 active:scale-95"
      style={{
        borderColor: 'var(--theme-border)',
        backgroundColor: 'var(--theme-surface)',
        color: 'var(--theme-text)',
      }}
      aria-label={`Tema actual: ${themeState.theme}, Modo: ${themeState.dark ? 'oscuro' : 'claro'}. Click para cambiar tema, doble click para modo oscuro/claro`}
      title={`Tema: ${themeState.theme} (${themeState.dark ? 'oscuro' : 'claro'}) - Click para cambiar tema, doble click para modo oscuro/claro`}
    >
      <span className="text-lg" style={{ transition: 'transform 300ms ease' }}>
        {currentIcon}
      </span>
    </button>
  );
}

