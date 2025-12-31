'use client';

import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';

type StyleTheme = 'default' | 'neocyberpunk' | 'baroque' | 'gothic' | 'cheerful';

interface ThemeOption {
  id: StyleTheme;
  label: string;
  description: string;
  colors: string[]; // Preview colors
  icon: string;
}

export function StyleSelector() {
  const [currentTheme, setCurrentTheme] = useState<StyleTheme>('default');
  const [isOpen, setIsOpen] = useState(false);

  const applyTheme = (theme: StyleTheme) => {
    // Wait for DOM to be ready
    setTimeout(() => {
      // Try to find article first (for post pages), then fall back to main (for home page)
      const article = document.querySelector('main article');
      const main = document.querySelector('main');
      const targetElement = article || main;
      
      if (!targetElement) return;

      // Remove all theme classes
      targetElement.classList.remove(
        'theme-neocyberpunk',
        'theme-baroque',
        'theme-gothic',
        'theme-cheerful'
      );

      // Apply new theme with transition
      const htmlElement = targetElement as HTMLElement;
      htmlElement.style.transition = 'all 0.3s ease-in-out';
      if (theme !== 'default') {
        targetElement.classList.add(`theme-${theme}`);
      }

      // Save to localStorage
      localStorage.setItem('postStyleTheme', theme);
      setCurrentTheme(theme);
      
      // Remove transition after animation
      setTimeout(() => {
        if (htmlElement) {
          htmlElement.style.transition = '';
        }
      }, 300);
    }, 100);
  };

  useEffect(() => {
    // Load saved theme from localStorage after component mounts
    const savedTheme = localStorage.getItem('postStyleTheme') as StyleTheme;
    if (savedTheme) {
      setCurrentTheme(savedTheme);
      // Apply theme after a short delay to ensure DOM is ready
      setTimeout(() => {
        applyTheme(savedTheme);
      }, 200);
    }
  }, []);

  const themes: ThemeOption[] = [
    { 
      id: 'default', 
      label: 'Por defecto', 
      description: 'Estilo original limpio',
      colors: ['#ffffff', '#f3f4f6', '#6b7280'],
      icon: '⚪'
    },
    { 
      id: 'neocyberpunk', 
      label: 'Neocyberpunk', 
      description: 'Moderno minimalista',
      colors: ['#0a0a0a', '#00ffff', '#00ff88'],
      icon: '💠'
    },
    { 
      id: 'baroque', 
      label: 'Barroco-Victoriano', 
      description: 'Elegante decimonónico',
      colors: ['#f5f1e8', '#8b7355', '#5c4a37'],
      icon: '🎩'
    },
    { 
      id: 'gothic', 
      label: 'Gótico', 
      description: 'Oscuro y misterioso',
      colors: ['#1a1a1a', '#8b0000', '#4a4a4a'],
      icon: '🦇'
    },
    { 
      id: 'cheerful', 
      label: 'Alegre', 
      description: 'Colorido y vibrante',
      colors: ['#fff5e6', '#ff6b9d', '#4ecdc4'],
      icon: '🌈'
    },
  ];

  const currentThemeData = themes.find(t => t.id === currentTheme) || themes[0];

  return (
    <div className="relative">
      {/* Mobile: Dropdown button */}
      <div className="sm:hidden">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors min-h-[44px] w-full justify-between"
          aria-label="Seleccionar estilo"
        >
          <div className="flex items-center gap-2">
            <span className="text-base">{currentThemeData.icon}</span>
            <span>{currentThemeData.label}</span>
          </div>
          <span className="text-gray-400">{isOpen ? '▲' : '▼'}</span>
        </button>
        
        {isOpen && (
          <>
            <div 
              className="fixed inset-0 z-40 bg-black/20" 
              onClick={() => setIsOpen(false)}
            />
            <div className="absolute top-full left-0 right-0 mt-2 z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-2 space-y-1 max-h-[60vh] overflow-y-auto">
              {themes.map((theme) => (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => {
                    applyTheme(theme.id);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-left transition-all min-h-[44px] ${
                    currentTheme === theme.id
                      ? 'bg-blue-50 text-blue-700 border-2 border-blue-500'
                      : 'hover:bg-gray-50 text-gray-700 border-2 border-transparent'
                  }`}
                >
                  <span className="text-lg flex-shrink-0">{theme.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{theme.label}</div>
                    <div className="text-xs text-gray-500 truncate">{theme.description}</div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    {theme.colors.map((color, idx) => (
                      <div
                        key={idx}
                        className="w-4 h-4 rounded-full border border-gray-300"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                  {currentTheme === theme.id && (
                    <span className="text-blue-600 flex-shrink-0">✓</span>
                  )}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Desktop: Horizontal selector */}
      <div className="hidden sm:flex flex-wrap gap-2 items-center">
        <span className="text-sm text-gray-600 mr-1">Estilos:</span>
        {themes.map((theme) => (
          <button
            key={theme.id}
            type="button"
            onClick={() => applyTheme(theme.id)}
            className={`group relative flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 min-h-[44px] ${
              currentTheme === theme.id
                ? 'bg-blue-600 text-white shadow-md scale-105'
                : 'bg-white text-gray-700 border border-gray-300 hover:border-blue-400 hover:shadow-sm'
            }`}
            title={theme.description}
          >
            <span className="text-base">{theme.icon}</span>
            <span className="hidden md:inline">{theme.label}</span>
            <span className="md:hidden">{theme.label.split(' ')[0]}</span>
            
            {/* Color preview on hover */}
            <div className="hidden group-hover:flex absolute -bottom-12 left-1/2 transform -translate-x-1/2 gap-1 bg-white border border-gray-200 rounded-lg p-2 shadow-lg z-10">
              {theme.colors.map((color, idx) => (
                <div
                  key={idx}
                  className="w-5 h-5 rounded-full border border-gray-300"
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>
            
            {currentTheme === theme.id && (
              <span className="ml-1 text-xs">✓</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
