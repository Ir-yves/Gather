import { LanguageSelect, useI18n } from './i18n';
import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Bell, Building2, Camera, Check, Globe, KeyRound, Moon, Pencil, Shield, Sun, Trash2, UserRound, Users
} from 'lucide-react';
import { api } from './api';
import type { SiteSettings, UserPreferences } from './api';
import { useAuth } from './auth';
import { Avatar } from './components';
import { useToast } from './toast';

function SettingsError({ children }: { children: string }) {
  return children ? <div className="form-error" role="alert">{children}</div> : null;
}

export function SettingsPage() {
  const { user, preferences, siteSettings, refresh, logout, savePreferences, saveSiteSettings } = useAuth();
  const { t } = useI18n();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileBusy, setProfileBusy] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profileNotice, setProfileNotice] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState('');
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarError, setAvatarError] = useState('');
  const [avatarNotice, setAvatarNotice] = useState('');
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [editingPassword, setEditingPassword] = useState(false);
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
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    if (!deletingAccount) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !deleteBusy) setDeletingAccount(false);
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [deletingAccount, deleteBusy]);

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

  useEffect(() => () => { if (avatarPreview) URL.revokeObjectURL(avatarPreview); }, [avatarPreview]);

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
      setProfileNotice(t('Your profile has been updated.'));
      showToast(t('Your profile has been updated.'));
      setEditingProfile(false);
    } catch (reason) {
      setProfileError(reason instanceof Error ? reason.message : 'Unable to update your profile.');
    } finally {
      setProfileBusy(false);
    }
  }

  function cancelProfileEdit() {
    setName(user?.name ?? '');
    setEmail(user?.email ?? '');
    setProfileError('');
    setProfileNotice('');
    setEditingProfile(false);
  }

  function pickAvatar(event: FormEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
    setAvatarError('');
    setAvatarNotice('');
  }

  function cancelAvatar() {
    setAvatarFile(null);
    setAvatarPreview('');
    setAvatarError('');
  }

  async function saveAvatar() {
    if (!avatarFile) return;
    setAvatarBusy(true);
    setAvatarError('');
    setAvatarNotice('');
    try {
      const body = new FormData();
      body.append('avatar', avatarFile);
      await api('/account/avatar', { method: 'POST', body });
      await refresh();
      setAvatarFile(null);
      setAvatarPreview('');
      setAvatarNotice(t('Your profile photo has been saved.'));
      showToast(t('Your profile photo has been saved.'));
    } catch (reason) {
      setAvatarError(reason instanceof Error ? reason.message : 'Unable to save your profile photo.');
    } finally {
      setAvatarBusy(false);
    }
  }

  async function removeAvatar() {
    setAvatarBusy(true);
    setAvatarError('');
    setAvatarNotice('');
    try {
      await api('/account/avatar', { method: 'DELETE' });
      await refresh();
      setAvatarFile(null);
      setAvatarPreview('');
      setAvatarNotice(t('Your profile photo has been removed.'));
      showToast(t('Your profile photo has been removed.'));
    } catch (reason) {
      setAvatarError(reason instanceof Error ? reason.message : 'Unable to remove your profile photo.');
    } finally {
      setAvatarBusy(false);
    }
  }

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordError('');
    setPasswordNotice('');
    if (newPassword !== confirmPassword) {
      setPasswordError(t('The new passwords do not match.'));
      return;
    }
    if (newPassword.length < 12) {
      setPasswordError(t('Your new password must be at least 12 characters.'));
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
      setPasswordNotice(t('Your password has been changed.'));
      showToast(t('Your password has been changed.'));
      setEditingPassword(false);
    } catch (reason) {
      setPasswordError(reason instanceof Error ? reason.message : 'Unable to change your password.');
    } finally {
      setPasswordBusy(false);
    }
  }

  function cancelPasswordEdit() {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordError('');
    setPasswordNotice('');
    setEditingPassword(false);
  }

  async function saveNotificationPreferences(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPreferenceBusy(true);
    setPreferenceError('');
    setPreferenceNotice('');
    try {
      await savePreferences(preferenceDraft);
      setPreferenceNotice(t('Your appearance and notification preferences have been saved.'));
      showToast(t('Your appearance and notification preferences have been saved.'));
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
      setSiteNotice(t('Site settings have been updated for everyone.'));
      showToast(t('Site settings have been updated for everyone.'));
    } catch (reason) {
      setSiteError(reason instanceof Error ? reason.message : 'Unable to save site settings.');
    } finally {
      setSiteBusy(false);
    }
  }

  async function deleteAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!deletePassword || deleteBusy) return;
    setDeleteBusy(true);
    setDeleteError('');
    try {
      await api<void>('/account', {
        method: 'DELETE',
        body: JSON.stringify({ password: deletePassword })
      });
      await logout();
      setDeletingAccount(false);
      setDeletePassword('');
      showToast(t('Your account has been deleted.'));
      navigate('/login', { replace: true });
    } catch (reason) {
      setDeleteError(reason instanceof Error ? reason.message : 'Your account could not be deleted.');
    } finally {
      setDeleteBusy(false);
    }
  }

  function updatePreference<K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) {
    setPreferenceDraft((previous) => ({ ...previous, [key]: value }));
    setPreferenceNotice('');
  }

  return (
    <div className="admin-page settings-page">
      <div className="page-header">
        <div><div className="eyebrow eyebrow-mint">{t('YOUR ACCOUNT')}</div><h1>{t('Settings.')}</h1><p>{t('Manage your profile, privacy, and the way your community space looks.')}</p></div>
        <div className="settings-header-actions">
          <LanguageSelect compact />
          <span className="settings-role"><Shield size={15} />{user?.role === 'admin' ? t('Administrator') : t('Member')}</span>
        </div>
      </div>

      <section className="admin-panel settings-card">
        <header className="settings-card-heading"><span><UserRound size={18} /></span><div><h2>{t('Profile details')}</h2><p>{t('Update your photo, name, and email address.')}</p></div></header>
        <div className="settings-avatar-row">
          <Avatar name={user?.name ?? t('Member')} src={avatarPreview || user?.avatarUrl} />
          <div className="settings-avatar-copy">
            <strong>{t('Profile photo')}</strong>
            <small>{avatarPreview ? t('Previewing your new photo — save to keep it.') : user?.avatarUrl ? t('Shown next to your name around the community.') : t('Add a photo to replace the initials next to your name.')}</small>
            <div className="settings-avatar-actions">
              <button type="button" className="secondary-button" onClick={() => avatarInputRef.current?.click()} disabled={avatarBusy}><Camera size={15} /> {t('Change photo')}</button>
              {avatarFile && <button type="button" className="button-primary" onClick={() => void saveAvatar()} disabled={avatarBusy}>{avatarBusy ? t('Saving…') : t('Save photo')}</button>}
              {avatarFile && <button type="button" className="text-icon-button" onClick={cancelAvatar} disabled={avatarBusy}>{t('Cancel')}</button>}
              {!avatarFile && user?.avatarUrl && <button type="button" className="text-icon-button" onClick={() => void removeAvatar()} disabled={avatarBusy}><Trash2 size={14} /> {t('Remove')}</button>}
            </div>
            <input ref={avatarInputRef} className="sr-only" type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={pickAvatar} aria-label={t('Choose a profile photo')} />
            <SettingsError>{avatarError}</SettingsError>
            {avatarNotice && <span className="settings-success" role="status"><Check size={14} />{avatarNotice}</span>}
          </div>
        </div>
        {profileNotice && <span className="settings-success settings-notice" role="status"><Check size={14} />{profileNotice}</span>}
        {!editingProfile ? (
          <div className="settings-summary">
            <div className="settings-readonly"><span className="field-label">{t('Display name')}</span><strong>{user?.name ?? '—'}</strong></div>
            <div className="settings-readonly"><span className="field-label">{t('Email address')}</span><strong>{user?.email ?? '—'}</strong></div>
            <button type="button" className="secondary-button settings-change-button" onClick={() => { setProfileNotice(''); setProfileError(''); setEditingProfile(true); }}><Pencil size={15} /> {t('Change profile')}</button>
          </div>
        ) : (
          <form className="settings-form settings-edit-form" onSubmit={(event) => void saveProfile(event)}>
            <label><span className="field-label">{t('Display name')}</span><input className="settings-input" value={name} onChange={(event) => setName(event.target.value)} minLength={2} maxLength={100} autoComplete="name" required /></label>
            <label><span className="field-label">{t('Email address')}</span><input className="settings-input" type="email" value={email} onChange={(event) => setEmail(event.target.value)} maxLength={254} autoComplete="email" required /></label>
            <SettingsError>{profileError}</SettingsError>
            <div className="settings-form-footer"><span>{t('Changing your email updates your sign-in address.')}</span><div className="settings-form-actions"><button type="button" className="text-icon-button" onClick={cancelProfileEdit}>{t('Cancel')}</button><button className="button-primary" type="submit" disabled={profileBusy || (name === user?.name && email === user?.email)}>{profileBusy ? t('Saving…') : t('Save profile')}</button></div></div>
          </form>
        )}
      </section>

      <section className="admin-panel settings-card">
        <header className="settings-card-heading"><span><KeyRound size={18} /></span><div><h2>{t('Password &amp; security')}</h2><p>{t('Use your current password to set a new one. New passwords need at least 12 characters.')}</p></div></header>
        {passwordNotice && <span className="settings-success settings-notice" role="status"><Check size={14} />{passwordNotice}</span>}
        {!editingPassword ? (
          <div className="settings-summary">
            <div className="settings-readonly"><span className="field-label">{t('Password')}</span><strong>••••••••••••</strong></div>
            <button type="button" className="secondary-button settings-change-button" onClick={() => { setPasswordNotice(''); setPasswordError(''); setEditingPassword(true); }}><KeyRound size={15} /> {t('Change password')}</button>
          </div>
        ) : (
          <form className="settings-form settings-password-form settings-edit-form" onSubmit={(event) => void changePassword(event)}>
            <label><span className="field-label">{t('Current password')}</span><input className="settings-input" type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} autoComplete="current-password" required /></label>
            <label><span className="field-label">{t('New password')}</span><input className="settings-input" type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} minLength={12} maxLength={128} autoComplete="new-password" required /></label>
            <label><span className="field-label">{t('Confirm new password')}</span><input className="settings-input" type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} minLength={12} maxLength={128} autoComplete="new-password" required /></label>
            <SettingsError>{passwordError}</SettingsError>
            <div className="settings-form-footer"><span>{t('Your password is never shown or emailed.')}</span><div className="settings-form-actions"><button type="button" className="text-icon-button" onClick={cancelPasswordEdit}>{t('Cancel')}</button><button className="button-primary" type="submit" disabled={passwordBusy}>{passwordBusy ? t('Changing…') : t('Change password')}</button></div></div>
          </form>
        )}
      </section>

      <section className="admin-panel settings-card">
        <header className="settings-card-heading"><span><Bell size={18} /></span><div><h2>{t('Appearance & notifications')}</h2><p>{t('Choose your theme and the in-app updates you want to receive.')}</p></div></header>
        <form className="settings-form" onSubmit={(event) => void saveNotificationPreferences(event)}>
          <div className="settings-theme-row"><div><strong>{t('Appearance')}</strong><small>{t('Applies to your member and admin pages.')}</small></div>
            <div className="settings-theme-options" role="group" aria-label={t('Choose appearance theme')}>
              <button type="button" className={preferenceDraft.theme === 'light' ? 'selected' : ''} aria-pressed={preferenceDraft.theme === 'light'} onClick={() => updatePreference('theme', 'light')}><Sun size={15} /> {t('Light')}</button>
              <button type="button" className={preferenceDraft.theme === 'dark' ? 'selected' : ''} aria-pressed={preferenceDraft.theme === 'dark'} onClick={() => updatePreference('theme', 'dark')}><Moon size={15} /> {t('Dark')}</button>
            </div>
          </div>
          <div className="settings-notification-list">
            <PreferenceToggle title={t('Private messages')} description={t('Get an in-app alert when someone sends or forwards you a private message.')} checked={preferenceDraft.notifyPrivateMessages} onChange={(value) => updatePreference('notifyPrivateMessages', value)} />
            <PreferenceToggle title={t('Community updates')} description={t('Get an in-app alert when a new update is published.')} checked={preferenceDraft.notifyContent} onChange={(value) => updatePreference('notifyContent', value)} />
            <PreferenceToggle title={t('Livestreams')} description={t('Get an in-app alert when a livestream starts.')} checked={preferenceDraft.notifyLivestreams} onChange={(value) => updatePreference('notifyLivestreams', value)} />
          </div>
          <SettingsError>{preferenceError}</SettingsError>
          {preferenceNotice && <span className="settings-success" role="status"><Check size={14} />{preferenceNotice}</span>}
          <div className="settings-form-footer"><span>{t('Preferences are saved to your account.')}</span><button className="button-primary" type="submit" disabled={preferenceBusy}>{preferenceBusy ? t('Saving…') : t('Save preferences')}</button></div>
        </form>
      </section>

      {user?.role === 'admin' && <>
        <section className="admin-panel settings-card">
          <header className="settings-card-heading"><span><Globe size={18} /></span><div><h2>{t('Site identity & welcome')}</h2><p>{t('These details are shared with everyone in the community.')}</p></div></header>
          <form className="settings-form" onSubmit={(event) => void saveSite(event)}>
            <label><span className="field-label">{t('Site name')}</span><input className="settings-input" value={siteDraft.siteName} onChange={(event) => setSiteDraft((previous) => ({ ...previous, siteName: event.target.value }))} minLength={2} maxLength={80} required /></label>
            <label><span className="field-label">{t('Member welcome message')}</span><textarea className="settings-input settings-textarea" value={siteDraft.welcomeMessage} onChange={(event) => setSiteDraft((previous) => ({ ...previous, welcomeMessage: event.target.value }))} minLength={2} maxLength={500} rows={3} required /></label>
            <SettingsError>{siteError}</SettingsError>
            {siteNotice && <span className="settings-success" role="status"><Check size={14} />{siteNotice}</span>}
            <div className="settings-form-footer"><span>{t('The welcome message appears on the member home page.')}</span><button className="button-primary" type="submit" disabled={siteBusy}>{siteBusy ? t('Saving…') : t('Save site settings')}</button></div>
          </form>
        </section>
        <section className="admin-panel settings-account-link">
          <span className="settings-account-icon"><Building2 size={18} /></span>
          <div><strong>{t('Manage member accounts')}</strong><p>{t('Review members, update account access, or change account roles.')}</p></div>
          <Link className="secondary-button" to="/admin/users"><Users size={15} /> {t('Open Members')}</Link>
        </section>
      </>}

      <section className="admin-panel settings-card danger-card">
        <header className="settings-card-heading"><span><Trash2 size={18} /></span><div><h2>{t('Delete account')}</h2><p>{t('Permanently remove your account, messages, and community content.')}</p></div></header>
        <div className="settings-summary">
          <div className="settings-readonly"><span className="field-label">{t('This action cannot be undone')}</span><strong>{t('You will be signed out immediately.')}</strong></div>
          <button type="button" className="danger-button" onClick={() => { setDeleteError(''); setDeletePassword(''); setDeletingAccount(true); }}><Trash2 size={15} /> {t('Delete account')}</button>
        </div>
      </section>

      {deletingAccount && <div className="delete-confirm-backdrop" onMouseDown={(event) => {
        if (event.target === event.currentTarget && !deleteBusy) setDeletingAccount(false);
      }}>
        <section className="delete-confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="delete-account-title">
          <span className="delete-confirm-icon"><Trash2 size={20} /></span>
          <h2 id="delete-account-title">{t('Delete your account?')}</h2>
          <p>{t('This permanently removes your account, messages, and content. Enter your password to continue.')}</p>
          <form className="settings-form settings-edit-form" onSubmit={(event) => void deleteAccount(event)}>
            <label><span className="field-label">{t('Your password')}</span><input className="settings-input" type="password" value={deletePassword} onChange={(event) => setDeletePassword(event.target.value)} autoComplete="current-password" required autoFocus /></label>
            <SettingsError>{deleteError}</SettingsError>
            <div className="delete-confirm-actions">
              <button type="button" className="text-icon-button" onClick={() => setDeletingAccount(false)} disabled={deleteBusy}>{t('Cancel')}</button>
              <button className="danger-button" type="submit" disabled={deleteBusy || !deletePassword}>{deleteBusy ? t('Deleting…') : t('Delete my account')}</button>
            </div>
          </form>
        </section>
      </div>}
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
