import { useEffect, useState } from 'react';
import { NAV_MODULES, type NavTab } from '../components/navigation/navCatalog';

export type ModuleTier = 'core' | 'advanced';

const ADVANCED_TABS: NavTab[] = NAV_MODULES.filter(m => m.tier === 'advanced').map(m => m.id);

/** Modules hidden on a fresh install: the advanced ones. */
export const DEFAULT_HIDDEN_TABS: NavTab[] = [...ADVANCED_TABS];

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

export const isAdvancedTab = (id: NavTab): boolean => ADVANCED_TABS.includes(id);

export const visibleNavModules = (prefs: NavPrefs) => NAV_MODULES.filter(m => isTabVisible(m.id, prefs));

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
