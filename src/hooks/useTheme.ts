import { useEffect, useState, useCallback } from 'react';

type ThemeMode = 'light' | 'dark' | 'system';

const THEME_KEY = 'theme';

const isChromeStorageAvailable = (): boolean => {
  try {
    // Some environments (dev server) won't have chrome.* APIs available
    return typeof chrome !== 'undefined' && !!chrome.storage && !!chrome.storage.sync;
  } catch {
    return false;
  }
};

export const useTheme = () => {
  const [theme, setTheme] = useState<ThemeMode>('system');
  const [isDark, setIsDark] = useState(false);

  // Apply theme to DOM
  const applyTheme = useCallback((themeMode: ThemeMode) => {
    const htmlElement = document.documentElement;
    let shouldBeDark = themeMode === 'dark';

    if (themeMode === 'system') {
      shouldBeDark = !!window.matchMedia?.('(prefers-color-scheme: dark)').matches;
    }

    // Always explicitly set the class state
    if (shouldBeDark) {
      htmlElement.classList.add('dark');
    } else {
      htmlElement.classList.remove('dark');
    }

    // Help native UI elements match the theme
    htmlElement.style.colorScheme = shouldBeDark ? 'dark' : 'light';
    
    // Update the isDark state to trigger re-renders
    setIsDark(shouldBeDark);
  }, []);

  // Initialize theme on mount (chrome.storage.sync when available, else localStorage)
  useEffect(() => {
    const init = () => {
      const fromChrome = isChromeStorageAvailable();

      if (fromChrome) {
        try {
          chrome.storage.sync.get([THEME_KEY], (result) => {
            const storedTheme = result[THEME_KEY] as ThemeMode | undefined;
            const initialTheme = storedTheme || 'system';
            setTheme(initialTheme);
            applyTheme(initialTheme);
          });
        } catch {
          // Fallback if chrome API throws for any reason
          const ls = (window.localStorage.getItem(THEME_KEY) as ThemeMode | null) || 'system';
          setTheme(ls);
          applyTheme(ls);
        }
      } else {
        const ls = (window.localStorage.getItem(THEME_KEY) as ThemeMode | null) || 'system';
        setTheme(ls);
        applyTheme(ls);
      }
    };

    init();
  }, [applyTheme]);

  // Custom setTheme that saves to storage and applies immediately
  const updateTheme = useCallback(
    (newTheme: ThemeMode) => {
      // Update state first to trigger re-render
      setTheme(newTheme);
      
      // Apply theme immediately
      applyTheme(newTheme);
      
      const fromChrome = isChromeStorageAvailable();
      try {
        if (fromChrome) {
          chrome.storage.sync.set({ [THEME_KEY]: newTheme });
        } else {
          window.localStorage.setItem(THEME_KEY, newTheme);
          // Broadcast to other pages (options/popup during dev)
          window.dispatchEvent(new StorageEvent('storage', { key: THEME_KEY, newValue: newTheme }));
        }
      } catch {
        // Ignore storage failures; UI already updated
      }
    },
    [applyTheme]
  );

  // Apply theme whenever theme state changes
  useEffect(() => {
    applyTheme(theme);
  }, [theme, applyTheme]);

  // Listen for storage changes from other extension pages or dev tabs
  useEffect(() => {
    const fromChrome = isChromeStorageAvailable();

    if (fromChrome) {
      const handleStorageChange = (
        changes: { [key: string]: chrome.storage.StorageChange },
        areaName: string
      ) => {
        if (areaName === 'sync' && changes[THEME_KEY]) {
          const newTheme = changes[THEME_KEY].newValue as ThemeMode;
          setTheme(newTheme);
        }
      };

      chrome.storage.onChanged.addListener(handleStorageChange);
      return () => chrome.storage.onChanged.removeListener(handleStorageChange);
    } else {
      const handleLocal = (e: StorageEvent) => {
        if (e.key === THEME_KEY && e.newValue) {
          const newTheme = e.newValue as ThemeMode;
          setTheme(newTheme);
        }
      };
      window.addEventListener('storage', handleLocal);
      return () => window.removeEventListener('storage', handleLocal);
    }
  }, []);

  // Listen for system theme changes
  useEffect(() => {
    if (theme !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => applyTheme('system');

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    } else {
      // Older browsers fallback (deprecated addListener)
      const mql = mediaQuery as unknown as {
        addListener?: (fn: () => void) => void;
        removeListener?: (fn: () => void) => void;
      };
      if (typeof mql.addListener === 'function') {
        mql.addListener(handleChange);
        return () => {
          if (typeof mql.removeListener === 'function') {
            mql.removeListener(handleChange);
          }
        };
      }
      return;
    }
  }, [theme, applyTheme]);

  return {
    theme,
    setTheme: updateTheme,
    isDark,
  };
};
