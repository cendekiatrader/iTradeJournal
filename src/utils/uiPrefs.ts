export interface UiPrefs {
  dim: boolean;
  performance: boolean;
  /** The sticky Quick Risk dock on desktop. ON by default (existing behaviour). */
  quickRisk: boolean;
}

const DIM_KEY = 'itrade_dim_mode';
const PERF_KEY = 'itrade_perf_mode';
const QUICK_RISK_KEY = 'itrade_quickrisk_dock';

export const getUiPrefs = (): UiPrefs => ({
  dim: localStorage.getItem(DIM_KEY) === 'true',
  performance: localStorage.getItem(PERF_KEY) === 'true',
  // Opt-out pref, so an unset key means ON.
  quickRisk: localStorage.getItem(QUICK_RISK_KEY) !== 'false'
});

/** Applies the current UI preferences as data-attributes on <html>. */
export const applyUiPrefs = (prefs?: UiPrefs): void => {
  const p = prefs || getUiPrefs();
  const root = document.documentElement;
  if (p.dim) {
    root.setAttribute('data-dim', 'true');
  } else {
    root.removeAttribute('data-dim');
  }
  if (p.performance) {
    root.setAttribute('data-perf', 'true');
  } else {
    root.removeAttribute('data-perf');
  }
};

/** Persists a preference, applies it and notifies listeners (Navbar sync). */
export const setUiPref = (
  key: 'dim' | 'performance' | 'quickRisk',
  value: boolean
): UiPrefs => {
  const storageKey = key === 'dim' ? DIM_KEY : key === 'performance' ? PERF_KEY : QUICK_RISK_KEY;
  localStorage.setItem(storageKey, String(value));
  const prefs = getUiPrefs();
  applyUiPrefs(prefs);
  window.dispatchEvent(new CustomEvent('itrade-uiprefs-changed', { detail: prefs }));
  return prefs;
};

/** True when celebrations/animations should be suppressed. */
export const isPerformanceMode = (): boolean => {
  if (localStorage.getItem(PERF_KEY) === 'true') return true;
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
};
