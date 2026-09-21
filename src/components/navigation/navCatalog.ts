import {
  LayoutDashboard,
  CalendarDays,
  BookOpen,
  BarChart3,
  WalletCards,
  Calculator,
  TrendingUp,
  Flame,
  GraduationCap,
  BookMarked,
  LayoutGrid,
  Target,
  Settings as SettingsIcon
} from 'lucide-react';

export type NavTab =
  | 'dashboard'
  | 'workspace'
  | 'calendar'
  | 'journal'
  | 'analytics'
  | 'playbook'
  | 'queue'
  | 'news'
  | 'accounts'
  | 'calculator'
  | 'coaching'
  | 'settings';

export type ModuleTier = 'core' | 'advanced';

export interface NavModuleDef {
  id: NavTab;
  label: string;
  icon: any;
  tier: ModuleTier;
}

/**
 * The navigation catalog: display order, label, icon and tier for every module.
 * `advanced` modules are hidden until the user opts in from Settings (progressive
 * disclosure - see utils/navPrefs.ts). `settings` is deliberately NOT listed here:
 * it is the escape hatch and always stays reachable.
 */
export const NAV_MODULES: NavModuleDef[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, tier: 'core' },
  { id: 'journal', label: 'Trade Log', icon: BookOpen, tier: 'core' },
  { id: 'calendar', label: 'Calendar View', icon: CalendarDays, tier: 'core' },
  { id: 'accounts', label: 'Account Manager', icon: WalletCards, tier: 'core' },
  { id: 'coaching', label: 'Coaching', icon: GraduationCap, tier: 'core' },
  { id: 'workspace', label: 'Workspace', icon: LayoutGrid, tier: 'advanced' },
  { id: 'analytics', label: 'Analytics & Setups', icon: BarChart3, tier: 'advanced' },
  { id: 'playbook', label: 'Playbook', icon: BookMarked, tier: 'advanced' },
  { id: 'queue', label: 'Setup Queue', icon: Target, tier: 'advanced' },
  { id: 'news', label: 'Economic Calendar', icon: Flame, tier: 'advanced' },
  { id: 'calculator', label: 'Position Size Calc', icon: Calculator, tier: 'advanced' }
];

export const SETTINGS_MODULE: NavModuleDef = {
  id: 'settings',
  label: 'Settings',
  icon: SettingsIcon,
  tier: 'core'
};

const ALL: NavModuleDef[] = [...NAV_MODULES, SETTINGS_MODULE];

/** Label + icon lookup by tab id (Settings included). */
export const NAV_META: Record<NavTab, { label: string; icon: any }> = ALL.reduce((acc, m) => {
  acc[m.id] = { label: m.label, icon: m.icon };
  return acc;
}, {} as Record<NavTab, { label: string; icon: any }>);

export const NAV_MODULE_COUNT = NAV_MODULES.length;
