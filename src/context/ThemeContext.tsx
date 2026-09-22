import React, { createContext, useContext, useState, useEffect } from 'react';

/**
 * Neumorphic redesign: exactly TWO visual modes.
 * `dark`  -> [data-theme="dark"]
 * `light` -> [data-theme="light"]
 * (the old accent palettes emerald/sapphire/amethyst/gold/crimson were removed;
 *  legacy stored values are migrated to `dark`)
 */
export type ThemeId = 'dark' | 'light';

export interface ThemeOption {
  id: ThemeId;
  name: string;
  subtitle: string;
  primaryColor: string;
  secondaryColor: string;
  glowColor: string;
  badge: string;
}

export const THEMES: ThemeOption[] = [
  {
    id: 'dark',
    name: 'Dark',
    subtitle: 'Neumorphic dark — nyaman untuk sesi trading panjang',
    primaryColor: '#10b981',
    secondaryColor: '#3b82f6',
    glowColor: 'rgba(16, 185, 129, 0.4)',
    badge: 'DEFAULT'
  },
  {
    id: 'light',
    name: 'Light',
    subtitle: 'Neumorphic light — terang, bersih, mudah dibaca siang hari',
    primaryColor: '#059669',
    secondaryColor: '#2563eb',
    glowColor: 'rgba(5, 150, 105, 0.35)',
    badge: 'DAY'
  }
];

const STORAGE_KEY = 'itrade_theme';

const isThemeId = (value: unknown): value is ThemeId =>
  value === 'dark' || value === 'light';

/** Reads the persisted mode, migrating every legacy accent theme to `dark`. */
export const readStoredTheme = (): ThemeId => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (isThemeId(saved)) return saved;
    if (saved) return 'dark'; // legacy palette id -> dark
    const prefersLight = window.matchMedia
      ? window.matchMedia('(prefers-color-scheme: light)').matches
      : false;
    return prefersLight ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
};

/** Applies `data-theme` + PWA theme-color meta outside of React (used by index.html too). */
export const applyTheme = (mode: ThemeId): void => {
  const root = document.documentElement;
  root.setAttribute('data-theme', mode);
  root.style.colorScheme = mode;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', mode === 'light' ? '#e6eaf1' : '#1d2431');
};

interface ThemeContextType {
  theme: ThemeId;
  setTheme: (theme: ThemeId) => void;
  toggleTheme: () => void;
  activeThemeOption: ThemeOption;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeId>(readStoredTheme);

  const setTheme = (newTheme: ThemeId) => {
    setThemeState(newTheme);
    try {
      localStorage.setItem(STORAGE_KEY, newTheme);
    } catch {
      /* private mode / storage disabled — session-only theme */
    }
    applyTheme(newTheme);
  };

  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const activeThemeOption = THEMES.find(t => t.id === theme) || THEMES[0];

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, activeThemeOption }}>
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
