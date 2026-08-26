import React, { createContext, useContext, useState, useEffect } from 'react';

export type ThemeId = 'emerald' | 'sapphire' | 'amethyst' | 'gold' | 'crimson';

export interface ThemeOption {
  id: ThemeId;
  name: string;
  subtitle: string;
  primaryColor: string;
  secondaryColor: string;
  bgTone: string;
  glowColor: string;
  badge: string;
}

export const THEMES: ThemeOption[] = [
  {
    id: 'emerald',
    name: 'Emerald Institutional',
    subtitle: 'Classic hedge-fund green & deep navy',
    primaryColor: '#10b981',
    secondaryColor: '#3b82f6',
    bgTone: '#070b14',
    glowColor: 'rgba(16, 185, 129, 0.4)',
    badge: 'DEFAULT'
  },
  {
    id: 'sapphire',
    name: 'Sapphire Electric',
    subtitle: 'Wall Street cyber blue & obsidian',
    primaryColor: '#3b82f6',
    secondaryColor: '#60a5fa',
    bgTone: '#060b18',
    glowColor: 'rgba(59, 130, 246, 0.4)',
    badge: 'POPULAR'
  },
  {
    id: 'amethyst',
    name: 'Obsidian Amethyst',
    subtitle: 'Cyberpunk royal purple & deep violet',
    primaryColor: '#a855f7',
    secondaryColor: '#c084fc',
    bgTone: '#0b0716',
    glowColor: 'rgba(168, 85, 247, 0.4)',
    badge: 'LUXURY'
  },
  {
    id: 'gold',
    name: 'Golden Bullion',
    subtitle: 'Prestige Gold & imperial dark bronze',
    primaryColor: '#f59e0b',
    secondaryColor: '#fbbf24',
    bgTone: '#0f0c05',
    glowColor: 'rgba(245, 158, 11, 0.4)',
    badge: 'XAU SPECIAL'
  },
  {
    id: 'crimson',
    name: 'Crimson Titan',
    subtitle: 'Aggressive scarlet red & volcanic dark',
    primaryColor: '#ef4444',
    secondaryColor: '#f87171',
    bgTone: '#120708',
    glowColor: 'rgba(239, 68, 68, 0.4)',
    badge: 'EDGY'
  }
];

interface ThemeContextType {
  theme: ThemeId;
  setTheme: (theme: ThemeId) => void;
  activeThemeOption: ThemeOption;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeId>(() => {
    const saved = localStorage.getItem('itrade_theme') as ThemeId;
    if (saved && ['emerald', 'sapphire', 'amethyst', 'gold', 'crimson'].includes(saved)) {
      return saved;
    }
    return 'emerald';
  });

  const setTheme = (newTheme: ThemeId) => {
    setThemeState(newTheme);
    localStorage.setItem('itrade_theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const activeThemeOption = THEMES.find(t => t.id === theme) || THEMES[0];

  return (
    <ThemeContext.Provider value={{ theme, setTheme, activeThemeOption }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
