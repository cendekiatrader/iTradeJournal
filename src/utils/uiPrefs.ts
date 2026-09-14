export interface UiPrefs {
  dim: boolean;
  performance: boolean;
}

const DIM_KEY = 'itrade_dim_mode';
const PERF_KEY = 'itrade_perf_mode';

export const getUiPrefs = (): UiPrefs => ({
  dim: localStorage.getItem(DIM_KEY) === 'true',
  performance: localStorage.getItem(PERF_KEY) === 'true'
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
export const setUiPref = (key: 'dim' | 'performance', value: boolean): UiPrefs => {
  localStorage.setItem(key === 'dim' ? DIM_KEY : PERF_KEY, String(value));
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
