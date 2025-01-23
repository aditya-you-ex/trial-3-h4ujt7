/**
 * TaskStream AI
 * -----------------------------------------------------------------------------
 * Custom React Hook: useTheme
 * -----------------------------------------------------------------------------
 * This hook manages application theme state with support for:
 *   - Encrypted localStorage persistence
 *   - System "dark mode" preference listening and fallback
 *   - High contrast accessibility settings
 *   - Smooth theme transitions
 *   - Enterprise-grade comments, error handling, and type safety
 *
 * References from Technical Specifications:
 *   - 3.1.1 Design System Specifications (Light/Dark modes, accessibility)
 *   - 4.2.2 Frontend Frameworks (MUI theme management)
 *   - 7.2.1 Data Security (Encryption at rest for localStorage)
 *   - 7.3.1 Access Control (Local preference flux, user-level override)
 *
 * The hook returns:
 *   {
 *     theme: Theme,
 *     isDarkMode: boolean,
 *     toggleTheme: () => void,
 *     isHighContrast: boolean,
 *     setHighContrast: (enabled: boolean) => void
 *   }
 * which can be used across the application to access and mutate current
 * theme attributes, bridging seamlessly into the MUI Theme ecosystem.
 */

////////////////////////////////////////////////////
//  External Imports (with versions)              //
////////////////////////////////////////////////////
// react version 18.0+
import { useState, useEffect, useCallback } from 'react';
// @mui/material version 5.14+
import { Theme } from '@mui/material';

////////////////////////////////////////////////////
//  Internal Imports                               //
////////////////////////////////////////////////////
// Named exports from theme.config.ts for light & dark modes
import { defaultTheme, darkTheme } from '../config/theme.config';
// Encrypted localStorage utilities with robust error handling
import { getLocalStorage, setLocalStorage } from '../utils/storage.utils';

////////////////////////////////////////////////////
//  Constants & Keys                               //
////////////////////////////////////////////////////
/**
 * THEME_STORAGE_KEY:
 * ---------------------------------------------------------------------------
 * Storage key for persisting user-selected theme mode ('light' or 'dark').
 * If no preference is stored, we fall back to system preference.
 * Data is encrypted for added security at rest in localStorage.
 */
const THEME_STORAGE_KEY = 'app-theme-mode';

/**
 * HIGH_CONTRAST_STORAGE_KEY:
 * ---------------------------------------------------------------------------
 * Storage key for persisting whether the user wants high contrast mode.
 * This follows the same approach, adding extra accessibility for certain
 * visual impairments. Data is encrypted at rest.
 */
const HIGH_CONTRAST_STORAGE_KEY = 'app-high-contrast-mode';

/**
 * THEME_TRANSITION_DURATION:
 * ---------------------------------------------------------------------------
 * Used for CSS transitions when toggling theme or high contrast mode,
 * creating a smooth user experience. The value is in milliseconds.
 */
const THEME_TRANSITION_DURATION = 300;

////////////////////////////////////////////////////
//  Types                                          //
////////////////////////////////////////////////////
/**
 * This interface describes the shape of the object returned by the useTheme hook.
 * We maintain explicit fields for the current theme object, dark mode boolean,
 * a toggle function to switch between light/dark, a high contrast boolean,
 * and a setter function to toggle high contrast mode.
 */
interface UseThemeReturnType {
  theme: Theme;
  isDarkMode: boolean;
  toggleTheme: () => void;
  isHighContrast: boolean;
  setHighContrast: (enabled: boolean) => void;
}

////////////////////////////////////////////////////
//  Hook Definition: useTheme                      //
////////////////////////////////////////////////////
/**
 * useTheme:
 * ---------------------------------------------------------------------------
 * Manages MUI's theme object by initializing global UI states for:
 *   - Light/Dark theme selection with localStorage persistence
 *   - System preference detection (prefers-color-scheme: dark)
 *   - High contrast accessibility toggling
 *   - Smooth transitions using CSS classes
 *
 * Steps Implemented:
 * 1) Attempt to load stored user preference (light/dark) from encrypted localStorage.
 * 2) If no stored preference, detect system preference for dark mode as fallback.
 * 3) Save or update stored preference whenever user manually toggles theme.
 * 4) Expose "isDarkMode" and a "toggleTheme" function to globally switch theme.
 * 5) Track and persist high contrast mode with "isHighContrast" and "setHighContrast".
 * 6) Apply a short CSS transition whenever theme or contrast changes for improved UX.
 * 7) Return the derived MUI theme (light or dark), along with above control states.
 */
export function useTheme(): UseThemeReturnType {
  /**
   * Stored mode state:
   * -------------------------------------------------------------------------
   * This represents the user-chosen mode: either 'light' or 'dark'.
   * If the user has never chosen, we keep it null (no override),
   * which means the system preference is used. If the user sets a preference,
   * we store that to localStorage and thereby override system changes.
   */
  const [savedMode, setSavedMode] = useState<'light' | 'dark' | null>(null);

  /**
   * isDarkMode:
   * -------------------------------------------------------------------------
   * Boolean representing the active dark mode status. If no preference
   * is found in localStorage and savedMode is null, we rely on
   * system preference to determine whether isDarkMode is true or false.
   */
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);

  /**
   * isHighContrast:
   * -------------------------------------------------------------------------
   * Boolean representing whether high contrast mode is enabled. We persist it
   * to localStorage for multi-session consistency.
   */
  const [isHighContrast, setIsHighContrastState] = useState<boolean>(false);

  /**
   * Helper function to read persistent theme mode from localStorage:
   * -------------------------------------------------------------------------
   * This effect runs once on mount to load any stored preference.
   * If valid, we set savedMode to 'light' or 'dark'. Otherwise, we keep it null.
   */
  useEffect(() => {
    (async () => {
      try {
        const storedValue = await getLocalStorage<string>(THEME_STORAGE_KEY, true);
        if (storedValue === 'light' || storedValue === 'dark') {
          setSavedMode(storedValue);
        }
      } catch (err) {
        // If there's an error reading from localStorage, we'll default to system preference.
        // We log the error, but do not block the UI from proceeding.
        // eslint-disable-next-line no-console
        console.error('[useTheme] Error loading stored theme mode:', err);
      }
    })();
  }, []);

  /**
   * Effect to read high contrast mode from localStorage on initial mount:
   * -------------------------------------------------------------------------
   * If not found, we assume standard contrast. If found, we parse the boolean value.
   */
  useEffect(() => {
    (async () => {
      try {
        const hcVal = await getLocalStorage<string>(HIGH_CONTRAST_STORAGE_KEY, true);
        if (hcVal === 'true') {
          setIsHighContrastState(true);
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[useTheme] Error loading high contrast preference:', err);
      }
    })();
  }, []);

  /**
   * System preference detection:
   * -------------------------------------------------------------------------
   * We set up a MediaQueryList to detect if the user’s system is set to dark mode.
   * If savedMode is null, prefer system settings. If the user explicitly toggles
   * the theme, we store that and do not override it with future system changes.
   */
  useEffect(() => {
    const systemDarkQuery = window.matchMedia('(prefers-color-scheme: dark)');

    // Internal function that updates isDarkMode only if no manual override is set:
    const systemPreferenceListener = (event: MediaQueryListEvent) => {
      if (savedMode === null) {
        setIsDarkMode(event.matches);
      }
    };

    // Initialization: If no saved mode, set isDarkMode from system preference:
    if (savedMode === null) {
      setIsDarkMode(systemDarkQuery.matches);
    } else {
      // If we do have a saved mode, override system preference:
      setIsDarkMode(savedMode === 'dark');
    }

    // Add event listener for changes in system preference:
    systemDarkQuery.addEventListener('change', systemPreferenceListener);

    // Cleanup event listener when unmounting or re-running effect:
    return () => {
      systemDarkQuery.removeEventListener('change', systemPreferenceListener);
    };
  }, [savedMode]);

  /**
   * toggleTheme:
   * -------------------------------------------------------------------------
   * A memoized function that flips the theme between light and dark modes.
   * We store the user’s choice in localStorage with encryption, overriding
   * any system preference. This also triggers an immediate re-render to reflect
   * the new theme in the UI.
   */
  const toggleTheme = useCallback((): void => {
    setIsDarkMode((prevMode) => {
      const newMode = !prevMode;
      const persistMode = newMode ? 'dark' : 'light';

      // Store the explicit user choice so we no longer rely on system preference:
      setSavedMode(persistMode);

      // Persist it to localStorage with encryption, no compression needed for short "light/dark" strings:
      setLocalStorage<string>(THEME_STORAGE_KEY, persistMode, true, false).catch((err) => {
        // eslint-disable-next-line no-console
        console.error('[useTheme] Error persisting theme mode preference:', err);
      });
      return newMode;
    });
  }, []);

  /**
   * setHighContrast:
   * -------------------------------------------------------------------------
   * Toggles high contrast mode on or off, storing the preference in localStorage.
   * This can be used in the UI for additional accessibility options.
   */
  const setHighContrast = useCallback(
    (enabled: boolean): void => {
      setIsHighContrastState(enabled);
      setLocalStorage<string>(
        HIGH_CONTRAST_STORAGE_KEY,
        enabled ? 'true' : 'false',
        true,
        false
      ).catch((err) => {
        // eslint-disable-next-line no-console
        console.error('[useTheme] Error persisting high contrast preference:', err);
      });
    },
    []
  );

  /**
   * Smooth theme transitions:
   * -------------------------------------------------------------------------
   * Whenever the user toggles between dark/light or changes high contrast,
   * we attach a short 'theme-transition' class to <body>, applying
   * a transition effect for background, color, etc. After THEME_TRANSITION_DURATION ms,
   * we remove the class to keep interactions snappy.
   *
   * Assume that the relevant CSS (likely in a global stylesheet) includes:
   *   .theme-transition {
   *     transition: background-color 300ms, color 300ms;
   *   }
   */
  useEffect(() => {
    document.body.classList.add('theme-transition');
    const timer = setTimeout(() => {
      document.body.classList.remove('theme-transition');
    }, THEME_TRANSITION_DURATION);

    return () => {
      clearTimeout(timer);
    };
  }, [isDarkMode, isHighContrast]);

  /**
   * Conditionally return the appropriate MUI theme:
   * -------------------------------------------------------------------------
   * If isDarkMode is true, return darkTheme. Otherwise return defaultTheme.
   * The actual theme merges seamlessly with MUI's <ThemeProvider>.
   */
  const theme = isDarkMode ? darkTheme : defaultTheme;

  // Optionally, you could enhance "theme" object with high contrast style overrides,
  // but for brevity we keep that logic external or rely on MUI's theme overrides.

  ////////////////////////////////////////////////////
  // Final returned object for the hook consumer    //
  ////////////////////////////////////////////////////
  return {
    theme,
    isDarkMode,
    toggleTheme,
    isHighContrast,
    setHighContrast,
  };
}