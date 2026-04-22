import Script from 'next/script';

const THEME_STORAGE_KEY = 'fwd-theme';

export function ThemeInitScript() {
  const code = `(() => {
  try {
    const key = '${THEME_STORAGE_KEY}';
    const path = window.location.pathname;
    // Force light mode on marketing pages (homepage and other public pages)
    const isMarketingPage = path === '/' || path === '/privacy' || path === '/support' || path.startsWith('/login') || path.startsWith('/signup') || path.startsWith('/onboarding');
    
    let resolved;
    if (isMarketingPage) {
      resolved = 'light';
    } else {
      const stored = window.localStorage.getItem(key);
      const theme = stored === 'dark' || stored === 'light' || stored === 'system' ? stored : 'system';
      const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      resolved = theme === 'system' ? (prefersDark ? 'dark' : 'light') : theme;
    }
    const root = document.documentElement;
    root.classList.toggle('dark', resolved === 'dark');
    root.style.colorScheme = resolved;
    root.dataset.theme = resolved;

    const vars = resolved === 'dark'
      ? {
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
      }
      : {
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
      };

    for (const k in vars) root.style.setProperty(k, vars[k]);
  } catch (_) {}
})();`;

  return <Script id='theme-init' strategy='beforeInteractive' dangerouslySetInnerHTML={{ __html: code }} />;
}
