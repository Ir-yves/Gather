import { useCallback, useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  ArrowUpRight, Bell, BookOpen, Check, ChevronDown, CircleHelp, Eye, LayoutDashboard,
  LogOut, Mail, Menu, Radio, Settings, Shield, Trash2, Users, X
} from 'lucide-react';
import { io } from 'socket.io-client';
import type { AppNotification } from './api';
import { api, socketUrl } from './api';
import { useAuth } from './auth';

export function Avatar({ name, small = false }: { name: string; small?: boolean }) {
  const initials = name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
  return <span className={`avatar ${small ? 'avatar-small' : ''}`}>{initials || 'U'}</span>;
}

function ProfileMenu({ admin = false }: { admin?: boolean }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function dismiss(event: PointerEvent) {
      if (event.target instanceof Node && !menuRef.current?.contains(event.target)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('pointerdown', dismiss);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', dismiss);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  async function handleLogout() {
    try {
      await logout();
      navigate('/login', { replace: true });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to sign out.');
    }
  }
  return (
    <div className="profile-wrap" ref={menuRef}>
      {error && <span className="sr-only" role="alert">{error}</span>}
      <button className="profile-button" onClick={() => setOpen(!open)} aria-expanded={open}>
        <Avatar name={user?.name ?? 'Member'} small />
        <span className="profile-name">{user?.name}</span>
        <ChevronDown size={15} />
      </button>
      {open && <div className="profile-menu">
        <div className="profile-menu-user"><strong>{user?.name}</strong><span>{user?.email}</span></div>
        <button onClick={() => { navigate(admin ? '/admin/settings' : '/app/settings'); setOpen(false); }}><Settings size={15} /> Settings</button>
        {admin && <button onClick={() => { navigate('/app'); setOpen(false); }}><ArrowUpRight size={15} /> Member view</button>}
        <button onClick={() => void handleLogout()}><LogOut size={15} /> Sign out</button>
      </div>}
    </div>
  );
}

function NotificationBell() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const notificationRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function dismiss(event: PointerEvent) {
      if (event.target instanceof Node && !notificationRef.current?.contains(event.target)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('pointerdown', dismiss);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', dismiss);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const refresh = useCallback(async () => {
    try {
      const result = await api<{ notifications: AppNotification[]; unreadCount: number }>('/notifications');
      setNotifications(result.notifications);
      setUnreadCount(result.unreadCount);
      setError('');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to load notifications.');
    }
  }, []);

  useEffect(() => {
    let disposed = false;
    let socket: ReturnType<typeof io> | undefined;
    void refresh();
    void socketUrl().then((url) => {
      if (disposed) return;
      socket = io(url, { withCredentials: true, transports: ['websocket', 'polling'] });
      socket.on('notification:new', (notification: AppNotification) => {
        setNotifications((previous) => [notification, ...previous.filter((item) => item.id !== notification.id)].slice(0, 50));
        if (!notification.readAt) setUnreadCount((count) => count + 1);
      });
    }).catch((reason: unknown) => {
      if (!disposed) setError(reason instanceof Error ? reason.message : 'Unable to connect to notifications.');
    });
    return () => {
      disposed = true;
      socket?.disconnect();
    };
  }, [refresh]);

  async function markAllRead() {
    try {
      await api('/notifications/read-all', { method: 'POST' });
      setNotifications((previous) => previous.map((item) => ({ ...item, readAt: item.readAt ?? new Date().toISOString() })));
      setUnreadCount(0);
      setError('');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to mark notifications as read.');
    }
  }

  async function openNotification(notification: AppNotification) {
    try {
      if (!notification.readAt) {
        await api(`/notifications/${notification.id}/read`, { method: 'PATCH' });
        setNotifications((previous) => previous.map((item) => item.id === notification.id
          ? { ...item, readAt: new Date().toISOString() }
          : item));
        setUnreadCount((count) => Math.max(0, count - 1));
      }
      setOpen(false);
      navigate(notification.href);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to open this notification.');
    }
  }

  async function deleteNotification(notification: AppNotification) {
    setDeletingId(notification.id);
    setError('');
    try {
      await api(`/notifications/${notification.id}`, { method: 'DELETE' });
      setNotifications((previous) => previous.filter((item) => item.id !== notification.id));
      if (!notification.readAt) setUnreadCount((count) => Math.max(0, count - 1));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to delete this notification.');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="notification-wrap" ref={notificationRef}>
      <button type="button" className="icon-button notification-button" aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`} aria-expanded={open} onClick={() => { setOpen((value) => !value); if (!open) void refresh(); }}>
        <Bell size={18} />
        {unreadCount > 0 && <span className="notification-count">{unreadCount > 99 ? '99+' : unreadCount}</span>}
      </button>
      {open && <section className="notification-panel" aria-label="Notifications">
        <header><span><strong>Notifications</strong><small>{unreadCount ? `${unreadCount} unread` : 'You’re all caught up'}</small></span><button type="button" onClick={() => void markAllRead()} disabled={!unreadCount}><Check size={14} /> Mark all read</button></header>
        {error && <p className="notification-error" role="alert">{error}</p>}
        <div className="notification-list">
          {notifications.length ? notifications.map((notification) => <div key={notification.id} className={`notification-item ${notification.readAt ? '' : 'unread'}`}>
            <i />
            <button type="button" className="notification-open" onClick={() => void openNotification(notification)}>
              <span><strong>{notification.title}</strong><small>{notification.body}</small><time>{new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(notification.createdAt))}</time></span>
            </button>
            <button type="button" className="notification-delete" onClick={() => void deleteNotification(notification)} disabled={deletingId === notification.id} aria-label={`Delete notification: ${notification.title}`} title="Delete notification">
              <Trash2 size={15} />
            </button>
          </div>) : <div className="notification-empty">Nothing new right now.</div>}
        </div>
      </section>}
    </div>
  );
}

const memberNav = [
  { to: '/app', label: 'Home', icon: LayoutDashboard, end: true },
  { to: '/app#updates', label: 'Community updates', icon: BookOpen, end: false },
  { to: '/app/messages', label: 'Private messages', icon: Mail, end: false },
  { to: '/app/settings', label: 'Settings', icon: Settings, end: false }
];

export function MemberLayout() {
  const { user, siteSettings, preferences } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const isAdmin = user?.role === 'admin';
  return (
    <div className={`app-shell theme-${preferences.theme}`}>
      <aside className={`sidebar ${mobileOpen ? 'sidebar-open' : ''}`}>
        <div className="brand-lockup"><span className="brand-mark">g</span><span>{siteSettings.siteName}</span></div>
        <div className="sidebar-label">YOUR SPACE</div>
        <nav className="side-nav">
          {memberNav.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => `side-link ${isActive ? 'active' : ''}`} onClick={() => setMobileOpen(false)}>
              <Icon size={18} strokeWidth={1.8} /><span>{label}</span>
            </NavLink>
          ))}
          {isAdmin && <NavLink to="/admin" className="side-link admin-link" onClick={() => setMobileOpen(false)}>
            <Shield size={18} strokeWidth={1.8} /><span>Admin dashboard</span><ArrowUpRight size={14} className="nav-trailing" />
          </NavLink>}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-help"><div className="help-icon"><CircleHelp size={17} /></div><div><strong>Need a hand?</strong><span>We’re here to help.</span></div><ArrowUpRight size={14} /></div>
          <div className="sidebar-user"><Avatar name={user?.name ?? 'Member'} /><div className="sidebar-user-copy"><strong>{user?.name}</strong><span>{isAdmin ? 'Administrator' : 'Community member'}</span></div><ProfileMenu /></div>
        </div>
      </aside>
      {mobileOpen && <button className="mobile-backdrop" aria-label="Close menu" onClick={() => setMobileOpen(false)} />}
      <main className="main-panel">
        <header className="topbar">
          <button className="mobile-menu-button" onClick={() => setMobileOpen(!mobileOpen)} aria-label={mobileOpen ? 'Close menu' : 'Open menu'}>
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div className="breadcrumb"><span>Community</span><span className="crumb-slash">/</span><strong>My space</strong></div>
          <div className="topbar-actions"><span className="topbar-date">A good day to be here</span><NotificationBell /><ProfileMenu /></div>
        </header>
        <div className="page-content"><Outlet /></div>
      </main>
    </div>
  );
}

const adminNav = [
  { to: '/admin', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/admin/content', label: 'Content', icon: BookOpen, end: false },
  { to: '/admin/messages', label: 'Messages', icon: Mail, end: false },
  { to: '/admin/analytics', label: 'Views & likes', icon: Eye, end: false },
  { to: '/admin/users', label: 'Members', icon: Users, end: false },
  { to: '/admin/live', label: 'Livestream', icon: Radio, end: false },
  { to: '/admin/settings', label: 'Settings', icon: Settings, end: false }
];

export function AdminLayout() {
  const { user, siteSettings, preferences } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <div className={`app-shell admin-shell theme-${preferences.theme}`}>
      <aside className={`sidebar admin-sidebar ${mobileOpen ? 'sidebar-open' : ''}`}>
        <div className="brand-lockup"><span className="brand-mark">g</span><span>{siteSettings.siteName}</span></div>
        <div className="admin-workspace"><span className="workspace-icon"><Shield size={17} /></span><span><strong>Workspace</strong><small>ADMIN CONSOLE</small></span><ChevronDown size={15} /></div>
        <div className="sidebar-label">MANAGE</div>
        <nav className="side-nav">
          {adminNav.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => `side-link ${isActive ? 'active' : ''}`} onClick={() => setMobileOpen(false)}>
              <Icon size={18} strokeWidth={1.8} /><span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="admin-rail-divider" />
        <NavLink to="/app" className="side-link member-view-link"><ArrowUpRight size={17} /><span>Go to member view</span></NavLink>
        <div className="sidebar-bottom">
          <div className="sidebar-help"><div className="help-icon"><CircleHelp size={17} /></div><div><strong>Admin guide</strong><span>Learn how to manage.</span></div><ArrowUpRight size={14} /></div>
          <div className="sidebar-user"><Avatar name={user?.name ?? 'Admin'} /><div className="sidebar-user-copy"><strong>{user?.name}</strong><span>Administrator</span></div><ProfileMenu admin /></div>
        </div>
      </aside>
      {mobileOpen && <button className="mobile-backdrop" aria-label="Close menu" onClick={() => setMobileOpen(false)} />}
      <main className="main-panel">
        <header className="topbar">
          <button className="mobile-menu-button" onClick={() => setMobileOpen(!mobileOpen)} aria-label={mobileOpen ? 'Close menu' : 'Open menu'}>
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div className="breadcrumb"><span>Workspace</span><span className="crumb-slash">/</span><strong>Admin console</strong></div>
          <div className="topbar-actions"><span className="secure-label"><Shield size={14} /> Admin access</span><NotificationBell /><ProfileMenu admin /></div>
        </header>
        <div className="page-content"><Outlet /></div>
      </main>
    </div>
  );
}
