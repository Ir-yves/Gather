import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { ApiError, api } from './api';
import type { SiteSettings, User, UserPreferences } from './api';

const defaultPreferences: UserPreferences = {
  theme: 'light',
  notifyPrivateMessages: true,
  notifyContent: true,
  notifyLivestreams: true
};
const defaultSiteSettings: SiteSettings = {
  siteName: 'gather.',
  welcomeMessage: 'Your people, your ideas, your moment. Everything in one place.'
};

interface AuthContextValue {
  user: User | null;
  preferences: UserPreferences;
  siteSettings: SiteSettings;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<User>;
  register: (name: string, email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  savePreferences: (preferences: UserPreferences) => Promise<void>;
  saveSiteSettings: (settings: SiteSettings) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [preferences, setPreferences] = useState<UserPreferences>(defaultPreferences);
  const [siteSettings, setSiteSettings] = useState<SiteSettings>(defaultSiteSettings);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSettings = useCallback(async () => {
    const [preferenceResult, siteResult] = await Promise.all([
      api<{ preferences: UserPreferences }>('/account/preferences'),
      api<{ settings: SiteSettings }>('/settings/site')
    ]);
    setPreferences(preferenceResult.preferences);
    setSiteSettings(siteResult.settings);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const result = await api<{ user: User }>('/auth/me');
      setUser(result.user);
      setError(null);
      await loadSettings();
    } catch (reason) {
      if (reason instanceof ApiError && reason.status === 401) {
        setUser(null);
        setError(null);
        return;
      }
      setError(reason instanceof Error ? reason.message : 'Unable to connect to the server.');
    }
  }, [loadSettings]);

  useEffect(() => {
    document.documentElement.dataset.theme = preferences.theme;
  }, [preferences.theme]);

  useEffect(() => {
    void refresh().finally(() => setLoading(false));
  }, [refresh]);

  const login = useCallback(async (email: string, password: string) => {
    const result = await api<{ user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    setUser(result.user);
    setError(null);
    try {
      await loadSettings();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to load your settings.');
    }
    return result.user;
  }, [loadSettings]);

  const register = useCallback(async (name: string, email: string, password: string) => {
    const result = await api<{ user: User }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password })
    });
    setUser(result.user);
    setError(null);
    try {
      await loadSettings();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to load your settings.');
    }
    return result.user;
  }, [loadSettings]);

  const logout = useCallback(async () => {
    await api<void>('/auth/logout', { method: 'POST' });
    setUser(null);
    setPreferences(defaultPreferences);
  }, []);

  const savePreferences = useCallback(async (updated: UserPreferences) => {
    const result = await api<{ preferences: UserPreferences }>('/account/preferences', {
      method: 'PUT',
      body: JSON.stringify(updated)
    });
    setPreferences(result.preferences);
  }, []);

  const saveSiteSettings = useCallback(async (updated: SiteSettings) => {
    const result = await api<{ settings: SiteSettings }>('/admin/settings/site', {
      method: 'PUT',
      body: JSON.stringify(updated)
    });
    setSiteSettings(result.settings);
  }, []);

  const value = useMemo(() => ({
    user, preferences, siteSettings, loading, error, login, register, logout, refresh, savePreferences, saveSiteSettings
  }), [
    user, preferences, siteSettings, loading, error, login, register, logout, refresh, savePreferences, saveSiteSettings
  ]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider.');
  return context;
}

export function useFormSubmit(
  submit: (event: FormEvent<HTMLFormElement>) => Promise<void>,
  setError: (message: string) => void
) {
  return async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    try {
      await submit(event);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Something went wrong. Please try again.');
    }
  };
}
