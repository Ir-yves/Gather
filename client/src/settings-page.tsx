import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  Bell, Building2, Check, Globe, KeyRound, Moon, Shield, Sun, UserRound, Users
} from 'lucide-react';
import { api } from './api';
import type { SiteSettings, UserPreferences } from './api';
import { useAuth } from './auth';

function SettingsError({ children }: { children: string }) {
  return children ? <div className="form-error" role="alert">{children}</div> : null;
}

export function SettingsPage() {
  const { user, preferences, siteSettings, refresh, savePreferences, saveSiteSettings } = useAuth();
  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [profileBusy, setProfileBusy] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profileNotice, setProfileNotice] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordNotice, setPasswordNotice] = useState('');
  const [preferenceDraft, setPreferenceDraft] = useState<UserPreferences>(preferences);
  const [preferenceBusy, setPreferenceBusy] = useState(false);
  const [preferenceError, setPreferenceError] = useState('');
  const [preferenceNotice, setPreferenceNotice] = useState('');
  const [siteDraft, setSiteDraft] = useState<SiteSettings>(siteSettings);
  const [siteBusy, setSiteBusy] = useState(false);
  const [siteError, setSiteError] = useState('');
  const [siteNotice, setSiteNotice] = useState('');

  useEffect(() => {
    setName(user?.name ?? '');
    setEmail(user?.email ?? '');
  }, [user?.name, user?.email]);

  useEffect(() => {
    setPreferenceDraft(preferences);
  }, [preferences]);

  useEffect(() => {
    setSiteDraft(siteSettings);
  }, [siteSettings]);

  useEffect(() => {
    document.documentElement.dataset.theme = preferenceDraft.theme;
  }, [preferenceDraft.theme]);

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setProfileBusy(true);
    setProfileError('');
    setProfileNotice('');
    try {
      await api('/account/profile', {
        method: 'PATCH',
        body: JSON.stringify({ name, email })
      });
      await refresh();
      setProfileNotice('Your profile has been updated.');
    } catch (reason) {
      setProfileError(reason instanceof Error ? reason.message : 'Unable to update your profile.');
    } finally {
      setProfileBusy(false);
    }
  }

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordError('');
    setPasswordNotice('');
    if (newPassword !== confirmPassword) {
      setPasswordError('The new passwords do not match.');
      return;
    }
    if (newPassword.length < 12) {
      setPasswordError('Your new password must be at least 12 characters.');
      return;
    }
    setPasswordBusy(true);
    try {
      await api('/account/password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword })
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordNotice('Your password has been changed.');
    } catch (reason) {
      setPasswordError(reason instanceof Error ? reason.message : 'Unable to change your password.');
    } finally {
      setPasswordBusy(false);
    }
  }

  async function saveNotificationPreferences(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPreferenceBusy(true);
    setPreferenceError('');
    setPreferenceNotice('');
    try {
      await savePreferences(preferenceDraft);
      setPreferenceNotice('Your appearance and notification preferences have been saved.');
    } catch (reason) {
      document.documentElement.dataset.theme = preferences.theme;
      setPreferenceDraft(preferences);
      setPreferenceError(reason instanceof Error ? reason.message : 'Unable to save your preferences.');
    } finally {
      setPreferenceBusy(false);
    }
  }

  async function saveSite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSiteBusy(true);
    setSiteError('');
    setSiteNotice('');
    try {
      await saveSiteSettings(siteDraft);
      setSiteNotice('Site settings have been updated for everyone.');
    } catch (reason) {
      setSiteError(reason instanceof Error ? reason.message : 'Unable to save site settings.');
    } finally {
      setSiteBusy(false);
    }
  }

  function updatePreference<K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) {
    setPreferenceDraft((previous) => ({ ...previous, [key]: value }));
    setPreferenceNotice('');
  }

  return (
    <div className="admin-page settings-page">
      <div className="page-header">
        <div><div className="eyebrow eyebrow-mint">YOUR ACCOUNT</div><h1>Settings.</h1><p>Manage your profile, privacy, and the way your community space looks.</p></div>
        <span className="settings-role"><Shield size={15} />{user?.role === 'admin' ? 'Administrator' : 'Member'}</span>
      </div>

      <section className="admin-panel settings-card">
        <header className="settings-card-heading"><span><UserRound size={18} /></span><div><h2>Profile details</h2><p>Update the name and email address associated with your account.</p></div></header>
        <form className="settings-form" onSubmit={(event) => void saveProfile(event)}>
          <label><span className="field-label">Display name</span><input className="settings-input" value={name} onChange={(event) => setName(event.target.value)} minLength={2} maxLength={100} autoComplete="name" required /></label>
          <label><span className="field-label">Email address</span><input className="settings-input" type="email" value={email} onChange={(event) => setEmail(event.target.value)} maxLength={254} autoComplete="email" required /></label>
          <SettingsError>{profileError}</SettingsError>
          {profileNotice && <span className="settings-success" role="status"><Check size={14} />{profileNotice}</span>}
          <div className="settings-form-footer"><span>Changing your email updates your sign-in address.</span><button className="button-primary" type="submit" disabled={profileBusy || (name === user?.name && email === user?.email)}>{profileBusy ? 'Saving…' : 'Save profile'}</button></div>
        </form>
      </section>

      <section className="admin-panel settings-card">
        <header className="settings-card-heading"><span><KeyRound size={18} /></span><div><h2>Password & security</h2><p>Use your current password to set a new one. New passwords need at least 12 characters.</p></div></header>
        <form className="settings-form settings-password-form" onSubmit={(event) => void changePassword(event)}>
          <label><span className="field-label">Current password</span><input className="settings-input" type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} autoComplete="current-password" required /></label>
          <label><span className="field-label">New password</span><input className="settings-input" type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} minLength={12} maxLength={128} autoComplete="new-password" required /></label>
          <label><span className="field-label">Confirm new password</span><input className="settings-input" type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} minLength={12} maxLength={128} autoComplete="new-password" required /></label>
          <SettingsError>{passwordError}</SettingsError>
          {passwordNotice && <span className="settings-success" role="status"><Check size={14} />{passwordNotice}</span>}
          <div className="settings-form-footer"><span>Your password is never shown or emailed.</span><button className="button-primary" type="submit" disabled={passwordBusy}>{passwordBusy ? 'Changing…' : 'Change password'}</button></div>
        </form>
      </section>

      <section className="admin-panel settings-card">
        <header className="settings-card-heading"><span><Bell size={18} /></span><div><h2>Appearance & notifications</h2><p>Choose your theme and the in-app updates you want to receive.</p></div></header>
        <form className="settings-form" onSubmit={(event) => void saveNotificationPreferences(event)}>
          <div className="settings-theme-row"><div><strong>Appearance</strong><small>Applies to your member and admin pages.</small></div>
            <div className="settings-theme-options" role="group" aria-label="Choose appearance theme">
              <button type="button" className={preferenceDraft.theme === 'light' ? 'selected' : ''} aria-pressed={preferenceDraft.theme === 'light'} onClick={() => updatePreference('theme', 'light')}><Sun size={15} /> Light</button>
              <button type="button" className={preferenceDraft.theme === 'dark' ? 'selected' : ''} aria-pressed={preferenceDraft.theme === 'dark'} onClick={() => updatePreference('theme', 'dark')}><Moon size={15} /> Dark</button>
            </div>
          </div>
          <div className="settings-notification-list">
            <PreferenceToggle title="Private messages" description="Get an in-app alert when someone sends or forwards you a private message." checked={preferenceDraft.notifyPrivateMessages} onChange={(value) => updatePreference('notifyPrivateMessages', value)} />
            <PreferenceToggle title="Community updates" description="Get an in-app alert when a new update is published." checked={preferenceDraft.notifyContent} onChange={(value) => updatePreference('notifyContent', value)} />
            <PreferenceToggle title="Livestreams" description="Get an in-app alert when a livestream starts." checked={preferenceDraft.notifyLivestreams} onChange={(value) => updatePreference('notifyLivestreams', value)} />
          </div>
          <SettingsError>{preferenceError}</SettingsError>
          {preferenceNotice && <span className="settings-success" role="status"><Check size={14} />{preferenceNotice}</span>}
          <div className="settings-form-footer"><span>Preferences are saved to your account.</span><button className="button-primary" type="submit" disabled={preferenceBusy}>{preferenceBusy ? 'Saving…' : 'Save preferences'}</button></div>
        </form>
      </section>

      {user?.role === 'admin' && <>
        <section className="admin-panel settings-card">
          <header className="settings-card-heading"><span><Globe size={18} /></span><div><h2>Site identity & welcome</h2><p>These details are shared with everyone in the community.</p></div></header>
          <form className="settings-form" onSubmit={(event) => void saveSite(event)}>
            <label><span className="field-label">Site name</span><input className="settings-input" value={siteDraft.siteName} onChange={(event) => setSiteDraft((previous) => ({ ...previous, siteName: event.target.value }))} minLength={2} maxLength={80} required /></label>
            <label><span className="field-label">Member welcome message</span><textarea className="settings-input settings-textarea" value={siteDraft.welcomeMessage} onChange={(event) => setSiteDraft((previous) => ({ ...previous, welcomeMessage: event.target.value }))} minLength={2} maxLength={500} rows={3} required /></label>
            <SettingsError>{siteError}</SettingsError>
            {siteNotice && <span className="settings-success" role="status"><Check size={14} />{siteNotice}</span>}
            <div className="settings-form-footer"><span>The welcome message appears on the member home page.</span><button className="button-primary" type="submit" disabled={siteBusy}>{siteBusy ? 'Saving…' : 'Save site settings'}</button></div>
          </form>
        </section>
        <section className="admin-panel settings-account-link">
          <span className="settings-account-icon"><Building2 size={18} /></span>
          <div><strong>Manage member accounts</strong><p>Review members, update account access, or change account roles.</p></div>
          <Link className="secondary-button" to="/admin/users"><Users size={15} /> Open Members</Link>
        </section>
      </>}
    </div>
  );
}

function PreferenceToggle({
  title,
  description,
  checked,
  onChange
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="settings-toggle">
      <span><strong>{title}</strong><small>{description}</small></span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <i aria-hidden="true" />
    </label>
  );
}
