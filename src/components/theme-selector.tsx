'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { IoContrast, IoDesktopOutline, IoMoonOutline, IoSunnyOutline } from 'react-icons/io5';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

export type ThemePreference = 'dark' | 'light' | 'system';

const THEME_STORAGE_KEY = 'fwd-theme';

function resolveTheme(preference: ThemePreference): 'dark' | 'light' {
  if (preference === 'system') {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return preference;
}

const THEME_VARS: Record<'light' | 'dark', Record<string, string>> = {
  light: {
    '--background': '0 0% 100%',
    '--foreground': '0 0% 0%',
    '--muted': '0 0% 100%',
    '--muted-foreground': '0 0% 0%',
    '--popover': '0 0% 100%',
    '--popover-foreground': '0 0% 0%',
    '--border': '240 6% 10%',
    '--input': '240 6% 10%',
    '--card': '0 0% 100%',
    '--card-foreground': '0 0% 0%',
    '--primary': '0 0% 0%',
    '--primary-foreground': '0 0% 100%',
    '--secondary': '0 0% 100%',
    '--secondary-foreground': '0 0% 0%',
    '--accent': '0 0% 100%',
    '--accent-foreground': '0 0% 0%',
    '--destructive': '0 100% 50%',
    '--destructive-foreground': '0 0% 100%',
    '--ring': '240 6% 10%',
  },
  dark: {
    '--background': '0 0% 0%',
    '--foreground': '0 0% 100%',
    '--muted': '0 0% 0%',
    '--muted-foreground': '0 0% 100%',
    '--popover': '0 0% 0%',
    '--popover-foreground': '0 0% 100%',
    '--border': '0 0% 100%',
    '--input': '0 0% 100%',
    '--card': '0 0% 0%',
    '--card-foreground': '0 0% 100%',
    '--primary': '0 0% 100%',
    '--primary-foreground': '0 0% 0%',
    '--secondary': '0 0% 0%',
    '--secondary-foreground': '0 0% 100%',
    '--accent': '0 0% 0%',
    '--accent-foreground': '0 0% 100%',
    '--destructive': '0 63% 31%',
    '--destructive-foreground': '0 0% 100%',
    '--ring': '0 0% 100%',
  },
};

function applyTheme(preference: ThemePreference) {
  const resolved = resolveTheme(preference);
  const root = document.documentElement;
  root.classList.toggle('dark', resolved === 'dark');
  root.style.colorScheme = resolved;
  root.dataset.theme = resolved;

  const vars = THEME_VARS[resolved];
  for (const [k, v] of Object.entries(vars)) {
    root.style.setProperty(k, v);
  }
}

export function useThemePreference() {
  const [preference, setPreference] = useState<ThemePreference>('system');

  useEffect(() => {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    const pref = stored === 'dark' || stored === 'light' || stored === 'system' ? stored : 'system';
    setPreference(pref);
    applyTheme(pref);
  }, []);

  const setPreferenceAndApply = useCallback((value: ThemePreference) => {
    setPreference(value);
    window.localStorage.setItem(THEME_STORAGE_KEY, value);
    applyTheme(value);
  }, []);

  useEffect(() => {
    if (preference !== 'system') return;

    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => applyTheme('system');

    if (mql.addEventListener) mql.addEventListener('change', handler);
    else mql.addListener(handler);

    return () => {
      if (mql.removeEventListener) mql.removeEventListener('change', handler);
      else mql.removeListener(handler);
    };
  }, [preference]);

  return { preference, setPreference: setPreferenceAndApply };
}

export function ThemeMenuRadioGroup({ preference, onChange }: { preference: ThemePreference; onChange: (value: ThemePreference) => void }) {
  return (
    <DropdownMenuRadioGroup value={preference} onValueChange={(v) => onChange(v as ThemePreference)}>
      <DropdownMenuRadioItem value='dark' onSelect={() => onChange('dark')} onClick={() => onChange('dark')}>
        Dark
      </DropdownMenuRadioItem>
      <DropdownMenuRadioItem value='light' onSelect={() => onChange('light')} onClick={() => onChange('light')}>
        Light
      </DropdownMenuRadioItem>
      <DropdownMenuRadioItem value='system' onSelect={() => onChange('system')} onClick={() => onChange('system')}>
        System
      </DropdownMenuRadioItem>
    </DropdownMenuRadioGroup>
  );
}

export function ThemeSelector() {
  const { preference, setPreference } = useThemePreference();

  const buttonLabel = useMemo(() => {
    if (preference === 'dark') return 'Dark';
    if (preference === 'light') return 'Light';
    return 'System';
  }, [preference]);

  const ButtonIcon = preference === 'dark' ? IoMoonOutline : preference === 'light' ? IoSunnyOutline : IoDesktopOutline;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant='outline' className='gap-2'>
          <IoContrast className='h-4 w-4' aria-hidden='true' />
          Theme: {buttonLabel}
          <ButtonIcon className='h-4 w-4' aria-hidden='true' />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end'>
        <ThemeMenuRadioGroup preference={preference} onChange={setPreference} />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
