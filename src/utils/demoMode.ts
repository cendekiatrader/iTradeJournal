const DEMO_KEY = 'itrade_demo_mode';

/** True when the visitor explicitly entered the no-login demo sandbox. */
export const isDemoModeEnabled = (): boolean => {
  try {
    return localStorage.getItem(DEMO_KEY) === 'true';
  } catch {
    return false;
  }
};

export const setDemoModeFlag = (value: boolean): void => {
  try {
    localStorage.setItem(DEMO_KEY, String(value));
  } catch {
    /* ignore */
  }
};
