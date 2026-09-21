import { useEffect, useState } from 'react';
import type { NavTab } from '../components/Sidebar';

export type ModuleTier = 'core' | 'advanced';

export interface NavModule {
  id: NavTab;
  tier: ModuleTier;
}

/**
 * Navigation modules in display order - the single source of truth for what exists
 * and how prominent it is. `advanced` entries are hidden by default so a fresh app
 * shows four modules instead of eleven (progressive disclosure); the user turns them
 * back on from Settings. `core` entries can also be hidden, but they start visible.
 * Coaching is role-gated separately by App/Sidebar, so it stays `core` here.
 */
export const NAV_MODULES: NavModule[] = [
  { id: 'dashboard', tier: 'core' },
  { id: 'journal', tier: 'core' },
  { id: 'calendar', tier: 'core' },
  { id: 'accounts', tier: 'core' },
  { id: 'coaching', tier: 'core' },
  { id: 'workspace', tier: 'advanced' },
  { id: 'analytics', tier: 'advanced' },
  { id: 'playbook', tier: 'advanced' },
  { id: 'queue', tier: 'advanced' },
  { id: 'news', tier: 'advanced' },
  { id: 'calculator', tier: 'advanced' }
];

export const isAdvancedModule = (id: NavTab): boolean =>
  NAV_MODULES.find(m => m.id === id)?.tier === 'advanced';

export const DEFAULT_HIDDEN_TABS: NavTab[] = NAV_MODULES.filter(m => m.tier === 'advanced').map(m => m.id);

const NAV_PREFS_KEY = 'itrade_nav_prefs_v1';
const NAV_PREFS_EVENT = 'itrade-navprefs-changed';

export interface NavPrefs {
  /** Tab ids the user has switched off. Everything else is visible. */
  hidden: NavTab[];
}

const isNavTab = (value: unknown): value is NavTab =>
  typeof value === 'string' && NAV_MODULES.some(m => m.id === value);

/** Never throws: an unreadable or corrupt value falls back to the simple defaults. */
export const getNavPrefs = (): NavPrefs => {
  try {
    const raw = localStorage.getItem(NAV_PREFS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed?.hidden)) return { hidden: parsed.hidden.filter(isNavTab) };
    }
  } catch {
    /* ignore and use defaults */
  }
  return { hidden: [...DEFAULT_HIDDEN_TABS] };
};

export const saveNavPrefs = (prefs: NavPrefs): NavPrefs => {
  try {
    localStorage.setItem(NAV_PREFS_KEY, JSON.stringify(prefs));
  } catch {
    /* ignore quota errors */
  }
  window.dispatchEvent(new CustomEvent(NAV_PREFS_EVENT, { detail: prefs }));
  return prefs;
};

export const isTabVisible = (id: NavTab, prefs: NavPrefs): boolean => !prefs.hidden.includes(id);

export const visibleNavModules = (prefs: NavPrefs): NavModule[] =>
  NAV_MODULES.filter(m => isTabVisible(m.id, prefs));

/** Switches one module on/off. Refuses to hide the last remaining module. */
export const setTabHidden = (id: NavTab, hidden: boolean): NavPrefs => {
  const prefs = getNavPrefs();
  if (hidden) {
    const remaining = visibleNavModules(prefs).filter(m => m.id !== id);
    if (remaining.length === 0) return prefs;
    return saveNavPrefs({ hidden: [...new Set([...prefs.hidden, id])] });
  }
  return saveNavPrefs({ hidden: prefs.hidden.filter(t => t !== id) });
};

export const showAllTabs = (): NavPrefs => saveNavPrefs({ hidden: [] });

/** Back to the simple default set (advanced modules hidden). */
export const resetNavPrefs = (): NavPrefs => saveNavPrefs({ hidden: [...DEFAULT_HIDDEN_TABS] });

export const subscribeNavPrefs = (cb: (prefs: NavPrefs) => void): (() => void) => {
  const handler = () => cb(getNavPrefs());
  window.addEventListener(NAV_PREFS_EVENT, handler);
  return () => window.removeEventListener(NAV_PREFS_EVENT, handler);
};

/** Shared nav prefs state - every navigation surface listens to the same event. */
export const useNavPrefs = (): NavPrefs => {
  const [prefs, setPrefs] = useState<NavPrefs>(getNavPrefs);
  useEffect(() => subscribeNavPrefs(setPrefs), []);
  return prefs;
};
