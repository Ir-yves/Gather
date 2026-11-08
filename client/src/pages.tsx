import { useEffect, useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import type { Socket } from 'socket.io-client';
import {
  ArrowRight, ArrowUpRight, BookOpen, Camera, CameraOff, CircleHelp, Clock3, Download, Eye, EyeOff,
  FileText, Forward, LoaderCircle, LockKeyhole, Mail, MessageCircle, MessageSquareReply, Mic, MicOff,
  Radio, Send, Shield, Maximize2, Minimize2, Sparkles, ThumbsUp, Trash2, Users, Video, VideoOff, X
} from 'lucide-react';
import {
  LiveKitRoom, ParticipantTile, RoomAudioRenderer, TrackLoop, useConnectionState, useLocalParticipant, useParticipants, useTracks
} from '@livekit/components-react';
import { ConnectionState, RoomEvent, Track } from 'livekit-client';
import { api, mediaUrl, socketUrl } from './api';
import type { ContentAsset, ContentItem, Stream } from './api';
import { useAuth, useFormSubmit } from './auth';
import { Avatar } from './components';

function FieldError({ children }: { children: string }) {
  return children ? <div className="form-error" role="alert">{children}</div> : null;
}

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const submit = useFormSubmit(async () => {
    setBusy(true);
    try {
      const user = await login(email, password);
      const intendedPath = (location.state as { from?: string } | null)?.from;
      navigate(user.role === 'admin' ? '/admin' : (intendedPath?.startsWith('/app') ? intendedPath : '/app'), { replace: true });
    } finally {
      setBusy(false);
    }
  }, setError);

  return (
    <div className="auth-page">
      <div className="auth-topbar"><Link to="/" className="brand-lockup"><span className="brand-mark">g</span><span>gather<span className="brand-dot">.</span></span></Link><span>NEW TO GATHER? <Link to="/register">Create account <ArrowUpRight size={13} /></Link></span></div>
      <div className="auth-layout">
        <section className="auth-story">
          <div className="story-glow" />
          <div className="story-label"><span className="story-label-dot" /> A LITTLE MORE TOGETHER</div>
          <div className="story-heading">Good things<br />happen <span>here.</span></div>
          <p>Your people, your ideas, your moment.<br />Everything in one place.</p>
          <div className="story-spark"><Sparkles size={16} /><span>Space to connect, grow, and go live.</span></div>
          <div className="auth-story-art" aria-hidden="true">
            <div className="art-ring art-ring-one" /><div className="art-ring art-ring-two" /><div className="art-orbit orbit-one" /><div className="art-orbit orbit-two" />
            <span className="art-node node-a" /><span className="art-node node-b" /><span className="art-node node-c" /><span className="art-node node-d" /><span className="art-node node-e" />
            <span className="art-label">YOUR COMMUNITY<br />IN ONE PLACE</span>
          </div>
          <div className="story-footnote">MADE FOR THE MOMENTS THAT MATTER</div>
        </section>
        <section className="auth-form-side">
          <div className="auth-card">
            <div className="auth-card-icon"><span className="icon-spark">✳</span></div>
            <div className="eyebrow">WELCOME BACK</div>
            <h1>Come on in.</h1>
            <p className="auth-subtitle">Your space is right where you left it.</p>
            <form onSubmit={submit} className="auth-form">
              <label className="field-label" htmlFor="login-email">Email address</label>
              <div className="input-wrap"><Mail size={17} /><input id="login-email" type="email" placeholder="you@example.com" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></div>
              <div className="field-label-row"><label className="field-label" htmlFor="login-password">Password</label><a href="#forgot-password" className="text-link">Forgot?</a></div>
              <div className="input-wrap"><LockKeyhole size={17} /><input id="login-password" type={showPassword ? 'text' : 'password'} placeholder="Enter your password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required /><button type="button" className="input-action" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div>
              <FieldError>{error}</FieldError>
              <button className="button-primary auth-submit" type="submit" disabled={busy}>{busy ? <><LoaderCircle size={17} className="spin" /> Signing you in…</> : <>Sign in <ArrowRight size={16} /></>}</button>
            </form>
            <div className="auth-bottom">New around here? <Link to="/register">Create an account <ArrowUpRight size={13} /></Link></div>
            <div className="auth-privacy"><Shield size={13} /> Your little corner of the internet, kept private.</div>
          </div>
        </section>
      </div>
      <footer className="auth-footer"><span>© 2026 Gather community
        && yvex ltd</span><span><a href="#privacy">Privacy</a><a href="#terms">Terms</a><span>MADE WITH INTENTION ✳</span></span></footer>
    </div>
  );
}

export function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const submit = useFormSubmit(async () => {
    setBusy(true);
    try {
      const user = await register(name, email, password);
      navigate(user.role === 'admin' ? '/admin' : '/app', { replace: true });
    } finally {
      setBusy(false);
    }
  }, setError);

  return (
    <div className="auth-page">
      <div className="auth-topbar"><Link to="/" className="brand-lockup"><span className="brand-mark">g</span><span>gather<span className="brand-dot">.</span></span></Link><span>ALREADY ONE OF US? <Link to="/login">Sign in <ArrowUpRight size={13} /></Link></span></div>
      <div className="auth-layout">
        <section className="auth-story">
          <div className="story-glow" /><div className="story-label"><span className="story-label-dot" /> FIND YOUR PEOPLE</div>
          <div className="story-heading">Your next<br /><span>thing starts</span><br />here.</div>
          <p>Good conversations. Big ideas.<br />A community that gets you.</p>
          <div className="story-spark"><Sparkles size={16} /><span>Come as you are. Find your people.</span></div>
          <div className="auth-story-art" aria-hidden="true"><div className="art-ring art-ring-one" /><div className="art-ring art-ring-two" /><div className="art-orbit orbit-one" /><div className="art-orbit orbit-two" /><span className="art-node node-a" /><span className="art-node node-b" /><span className="art-node node-c" /><span className="art-node node-d" /><span className="art-node node-e" /><span className="art-label">FIND YOUR PEOPLE<br />FIND YOUR PLACE</span></div>
          <div className="story-footnote">MADE FOR THE MOMENTS THAT MATTER</div>
        </section>
        <section className="auth-form-side">
          <div className="auth-card register-card">
            <div className="auth-card-icon"><span className="icon-spark">✳</span></div><div className="eyebrow">YOUR SPACE AWAITS</div><h1>Let’s get started.</h1><p className="auth-subtitle">It’s a little nicer in here with you.</p>
            <form onSubmit={submit} className="auth-form">
              <label className="field-label" htmlFor="register-name">Your name</label><div className="input-wrap"><Users size={17} /><input id="register-name" placeholder="What should we call you?" autoComplete="name" minLength={2} maxLength={100} value={name} onChange={(event) => setName(event.target.value)} required /></div>
              <label className="field-label" htmlFor="register-email">Email address</label><div className="input-wrap"><Mail size={17} /><input id="register-email" type="email" placeholder="you@example.com" autoComplete="email" maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} required /></div>
              <label className="field-label" htmlFor="register-password">Password <span className="field-hint">12 characters minimum</span></label><div className="input-wrap"><LockKeyhole size={17} /><input id="register-password" type={showPassword ? 'text' : 'password'} placeholder="Choose a strong password" autoComplete="new-password" minLength={12} maxLength={128} value={password} onChange={(event) => setPassword(event.target.value)} required /><button type="button" className="input-action" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div>
              <FieldError>{error}</FieldError><button className="button-primary auth-submit" type="submit" disabled={busy}>{busy ? <><LoaderCircle size={17} className="spin" /> Creating your account…</> : <>Find your space <ArrowRight size={16} /></>}</button>
            </form>
            <div className="auth-bottom">By joining, you agree to our <a href="#terms">community guidelines</a>.</div><div className="auth-privacy"><Shield size={13} /> Your little corner of the internet, kept private.</div>
          </div>
        </section>
      </div>
      <footer className="auth-footer"><span>© 2025 Gather community</span><span><a href="#privacy">Privacy</a><a href="#terms">Terms</a><span>MADE WITH INTENTION ✳</span></span></footer>
    </div>
  );
}

function formatDate(dateString: string): string {
  return new Intl.DateTimeFormat('en', { month: 'long', day: 'numeric', year: 'numeric' }).format(new Date(dateString));
}

function formatFileSize(size: number): string {
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export function AdminHomePage() {
  const [stats, setStats] = useState<{
    users: number;
    content: number;
    views: number;
    likes: number;
    live: boolean;
    streamTitle: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    Promise.all([
      api<{ users: Array<{ id: string; name: string; email: string; role: 'admin' | 'user'; active: boolean }> }>('/admin/users'),
      api<{ content: ContentItem[] }>('/admin/content'),
      api<{ stream: Stream | null }>('/stream'),
      api<{ views: number; likes: number }>('/admin/analytics/summary')
    ]).then(([usersResult, contentResult, streamResult, engagement]) => {
      if (!active) return;
      setStats({
        users: usersResult.users.filter((user) => user.role === 'user' && user.active).length,
        content: contentResult.content.filter((item) => item.published).length,
        views: engagement.views,
        likes: engagement.likes,
        live: Boolean(streamResult.stream),
        streamTitle: streamResult.stream?.title ?? null
      });
      setError('');
    }).catch((reason: unknown) => {
      if (active) setError(reason instanceof Error ? reason.message : 'Unable to load dashboard metrics.');
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  if (loading) return <div className="screen-loading"><span className="spinner" /> Loading dashboard…</div>;
  if (error) return <div className="empty-card"><h3>Dashboard unavailable</h3><p>{error}</p></div>;

  return (
    <div className="admin-page">
      <section className="admin-welcome">
        <div className="admin-welcome-copy">
          <span className="eyebrow eyebrow-mint"><span className="eyebrow-dot" /> ADMIN WORKSPACE</span>
          <h1>Make good things happen.</h1>
          <p>Keep your community connected with fresh updates, helpful resources, and live events.</p>
          <div className="admin-welcome-actions">
            <Link className="button-primary" to="/admin/content"><Sparkles size={16} /> Create an update</Link>
            <Link className="admin-secondary-link" to="/admin/analytics"><Eye size={16} /> See engagement</Link>
          </div>
        </div>
        <Link className={`admin-live-summary ${stats?.live ? 'is-live' : ''}`} to="/admin/live">
          <span className="admin-live-summary-icon"><Radio size={20} /></span>
          <span><small>{stats?.live ? 'ON AIR RIGHT NOW' : 'LIVESTREAM'}</small><strong>{stats?.live ? stats.streamTitle : 'Bring everyone together'}</strong><em>{stats?.live ? 'Manage your broadcast' : 'Start a community broadcast'}</em></span>
          <ArrowUpRight size={18} />
        </Link>
      </section>
      <div className="admin-metrics-grid">
        <MetricCard label="Active members" value={String(stats?.users ?? 0)} trend="Enabled member accounts" tone="mint" icon={<Users size={18} />} />
        <MetricCard label="Published updates" value={String(stats?.content ?? 0)} trend="Visible to your community" tone="blue" icon={<BookOpen size={18} />} />
        <MetricCard label="Unique views" value={String(stats?.views ?? 0)} trend="Across posts, files, and live" tone="amber" icon={<Eye size={18} />} />
        <MetricCard label="Community likes" value={String(stats?.likes ?? 0)} trend="Across all community content" tone="rose" icon={<ThumbsUp size={18} />} />
      </div>
      <div className="admin-quick-grid">
        <div className="admin-panel admin-highlight-panel"><div className="admin-panel-kicker">YOUR COMMUNITY</div><h3>A little progress, every day.</h3><p>Share something useful, celebrate a member, or make space for the next great conversation.</p><div className="admin-highlight-links"><Link to="/admin/users"><Users size={16} /> Manage members <ArrowUpRight size={14} /></Link><Link to="/admin/content"><BookOpen size={16} /> Organize content <ArrowUpRight size={14} /></Link></div></div>
        <div className="admin-panel admin-actions-panel"><div><div className="admin-panel-kicker">QUICK ACTIONS</div><h3>What would you like to do?</h3></div><div className="action-stack"><Link className="action-button" to="/admin/analytics"><Eye size={17} /><span><strong>Review views and likes</strong><small>See what members are engaging with</small></span><ArrowUpRight size={15} /></Link><Link className="action-button" to="/admin/live"><Radio size={17} /><span><strong>Manage livestream</strong><small>Start or manage a broadcast</small></span><ArrowUpRight size={15} /></Link><Link className="action-button" to="/admin/content"><BookOpen size={17} /><span><strong>Upload a document or video</strong><small>Share a resource with members</small></span><ArrowUpRight size={15} /></Link></div></div>
      </div>
    </div>
  );
}

type AnalyticsType = 'content' | 'document' | 'video' | 'stream';
interface AnalyticsItem {
  id: string;
  type: AnalyticsType;
  title: string;
  parentTitle?: string;
  createdAt: string | null;
  published?: boolean;
  active?: boolean;
  views: number;
  likes: number;
  likers: Array<{ id: string; name: string; email: string }>;
}

export function AdminAnalyticsPage() {
  const [items, setItems] = useState<AnalyticsItem[]>([]);
  const [filter, setFilter] = useState<'all' | AnalyticsType>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  async function loadAnalytics() {
    setRefreshing(true);
    try {
      const result = await api<{ items: AnalyticsItem[] }>('/admin/analytics');
      setItems(result.items);
      setError('');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to load engagement analytics.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void loadAnalytics();
  }, []);

  const totalViews = items.reduce((total, item) => total + item.views, 0);
  const totalLikes = items.reduce((total, item) => total + item.likes, 0);
  const filteredItems = filter === 'all' ? items : items.filter((item) => item.type === filter);
  const filters: Array<{ id: 'all' | AnalyticsType; label: string }> = [
    { id: 'all', label: 'All activity' },
    { id: 'content', label: 'Updates' },
    { id: 'document', label: 'Documents' },
    { id: 'video', label: 'Videos' },
    { id: 'stream', label: 'Livestreams' }
  ];

  return (
    <div className="admin-page">
      <div className="page-header">
        <div><div className="eyebrow eyebrow-mint">COMMUNITY ENGAGEMENT</div><h1>Views and likes.</h1><p>See what members are viewing and who likes each item.</p></div>
        <button type="button" className="secondary-button analytics-refresh" onClick={() => void loadAnalytics()} disabled={refreshing}>
          <ArrowUpRight size={15} />{refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>
      <div className="admin-metrics-grid">
        <MetricCard label="Unique item views" value={String(totalViews)} trend="One view per member and item" tone="blue" icon={<Eye size={18} />} />
        <MetricCard label="Likes" value={String(totalLikes)} trend="Across updates, files, and streams" tone="rose" icon={<ThumbsUp size={18} />} />
        <MetricCard label="Tracked items" value={String(items.length)} trend="Recent activity" tone="mint" icon={<BookOpen size={18} />} />
        <MetricCard label="Live now" value={String(items.filter((item) => item.type === 'stream' && item.active).length)} trend="Active livestreams" tone="amber" icon={<Radio size={18} />} />
      </div>
      <div className="analytics-filters" role="group" aria-label="Filter analytics by item type">
        {filters.map((option) => (
          <button key={option.id} type="button" className={filter === option.id ? 'analytics-filter active' : 'analytics-filter'} onClick={() => setFilter(option.id)}>
            {option.label}
          </button>
        ))}
      </div>
      {error && <FieldError>{error}</FieldError>}
      {loading
        ? <div className="screen-loading"><span className="spinner" /> Loading engagement…</div>
        : filteredItems.length
          ? <div className="analytics-list">
            {filteredItems.map((item) => <AnalyticsItemCard key={`${item.type}-${item.id}`} item={item} />)}
          </div>
          : <div className="empty-card"><h3>No activity to show yet.</h3><p>Views and likes will appear here as members explore the community.</p></div>}
    </div>
  );
}

function AnalyticsItemCard({ item }: { item: AnalyticsItem }) {
  const typeLabel = {
    content: 'Community update',
    document: 'Document',
    video: 'Video',
    stream: 'Livestream'
  }[item.type];
  return (
    <article className="admin-panel analytics-item">
      <header className="analytics-item-heading">
        <div>
          <span className={`analytics-type analytics-type-${item.type}`}>{typeLabel}</span>
          <h2>{item.title}</h2>
          {item.parentTitle && <p>Attached to <strong>{item.parentTitle}</strong></p>}
        </div>
        <span className={`member-pill ${item.type === 'stream' ? (item.active ? 'active' : 'inactive') : (item.published ? 'active' : 'inactive')}`}>
          {item.type === 'stream' ? (item.active ? 'Live now' : 'Ended') : (item.published ? 'Published' : 'Draft')}
        </span>
      </header>
      <div className="analytics-item-stats">
        <span><Eye size={16} /><strong>{item.views}</strong> unique views</span>
        <span><ThumbsUp size={16} /><strong>{item.likes}</strong> likes</span>
        {item.createdAt && <small>{formatDate(item.createdAt)}</small>}
      </div>
      <div className="analytics-likers">
        <h3>Members who liked this</h3>
        {item.likers.length
          ? <ul>{item.likers.map((member) => <li key={member.id}><Avatar name={member.name} small /><span><strong>{member.name}</strong><small>{member.email}</small></span></li>)}</ul>
          : <p>No likes yet.</p>}
      </div>
    </article>
  );
}

function MetricCard({ label, value, trend, tone, icon }: { label: string; value: string; trend: string; tone: 'mint' | 'blue' | 'rose' | 'amber'; icon: ReactNode }) {
  return (
    <div className={`metric-card metric-${tone}`}>
      <div className="metric-header"><span className="metric-icon">{icon}</span><span className="metric-trend">{trend}</span></div>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

export function AdminContentPage() {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [published, setPublished] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    api<{ content: ContentItem[] }>('/admin/content').then((result) => {
      if (!active) return;
      setItems(result.content); setError('');
    }).catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : 'Unable to load content.'); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setBusy(true);
    const form = new FormData();
    form.set('title', title);
    form.set('body', body);
    form.set('imageUrl', imageUrl);
    form.set('published', String(published));
    files.forEach((file) => form.append('files', file));
    try {
      const result = await api<{ id: string; assets: ContentItem['assets'] }>('/admin/content', {
        method: 'POST',
        body: form
      });
      const now = new Date().toISOString();
      setItems((previous) => [{
        id: result.id,
        title,
        body,
        imageUrl: imageUrl || null,
        published,
        createdAt: now,
        updatedAt: now,
        authorName: 'You',
        likesCount: 0,
        liked: false,
        assets: result.assets
      }, ...previous]);
      setTitle('');
      setBody('');
      setImageUrl('');
      setFiles([]);
      setPublished(true);
      const fileInput = document.getElementById('content-files') as HTMLInputElement | null;
      if (fileInput) fileInput.value = '';
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to save this update.');
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    try {
      await api<void>(`/admin/content/${id}`, { method: 'DELETE' });
      setItems((previous) => previous.filter((item) => item.id !== id));
      setError('');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to delete this update.');
    }
  }

  return (
    <div className="admin-page">
      <div className="page-header"><div><div className="eyebrow eyebrow-mint">CONTENT</div><h1>Manage community updates.</h1></div></div>
      <div className="admin-split-grid">
        <form className="admin-panel form-panel" onSubmit={submit}>
          <h3>Create article</h3>
          <label className="field-label">Title<input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="New update headline" required maxLength={180} /></label>
          <label className="field-label">Body<textarea value={body} onChange={(event) => setBody(event.target.value)} placeholder="Share what matters most…" rows={6} required maxLength={20000} /></label>
          <label className="field-label">Feature image URL<input value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} placeholder="https://..." /></label>
          <label className="field-label upload-field" htmlFor="content-files">Documents and videos
            <input id="content-files" type="file" multiple accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.rtf,.mp4,.webm" onChange={(event) => setFiles(Array.from(event.currentTarget.files ?? []))} />
            <small>PDF, Office, TXT, RTF, MP4, or WebM · up to 5 files · 100 MB each</small>
          </label>
          {files.length > 0 && <ul className="selected-files">{files.map((file, index) => <li key={`${file.name}-${index}`}><FileText size={15} /><span>{file.name} · {formatFileSize(file.size)}</span><button type="button" className="text-icon-button" aria-label={`Remove ${file.name}`} onClick={() => setFiles((previous) => previous.filter((_, fileIndex) => fileIndex !== index))}><X size={15} /></button></li>)}</ul>}
          <label className="check-row"><input type="checkbox" checked={published} onChange={(event) => setPublished(event.target.checked)} /> Publish immediately</label>
          <FieldError>{error}</FieldError>
          <button className="button-primary" type="submit" disabled={busy}>{busy ? 'Uploading…' : 'Save update'}</button>
        </form>
        <div className="admin-panel list-panel">
          <h3>Recent updates</h3>
          {loading ? <div className="screen-loading small"><span className="spinner" /> Loading…</div> : items.length === 0 ? <div className="empty-card small"><p>No updates yet.</p></div> : <div className="admin-list">
            {items.map((item) => <div className="list-row" key={item.id}><div><strong>{item.title}</strong><small>{item.published ? 'Published' : 'Draft'} · {formatDate(item.createdAt)} · {item.assets.length} attachments</small></div><button type="button" className="danger-button" onClick={() => void remove(item.id)}>Delete</button></div>)}
          </div>}
        </div>
      </div>
    </div>
  );
}

export function AdminUsersPage() {
  const [users, setUsers] = useState<Array<{ id: string; name: string; email: string; role: 'admin' | 'user'; active: boolean }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    api<{ users: typeof users }>('/admin/users').then((result) => {
      if (!active) return;
      setUsers(result.users);
    }).catch((reason: unknown) => {
      if (active) setError(reason instanceof Error ? reason.message : 'Unable to load users.');
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function toggleUser(id: string, role: 'admin' | 'user', active: boolean) {
    await api<void>(`/admin/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ role, active })
    });
    setUsers((previous) => previous.map((user) => user.id === id ? { ...user, role, active } : user));
  }

  return (
    <div className="admin-page">
      <div className="page-header"><div><div className="eyebrow eyebrow-mint">USERS</div><h1>Manage members.</h1></div></div>
      {loading ? <div className="screen-loading small"><span className="spinner" /> Loading members…</div> : <div className="admin-panel list-panel"><FieldError>{error}</FieldError><div className="admin-list">
        {users.map((user) => <div className="member-row" key={user.id}><div><strong>{user.name}</strong><small>{user.email}</small></div><div className="member-actions"><span className={`member-pill ${user.active ? 'active' : 'inactive'}`}>{user.active ? 'Active' : 'Inactive'}</span><select value={user.role} onChange={(event) => void toggleUser(user.id, event.target.value as 'admin' | 'user', user.active)}><option value="user">User</option><option value="admin">Admin</option></select><button type="button" className="secondary-button" onClick={() => void toggleUser(user.id, user.role, !user.active)}>{user.active ? 'Disable' : 'Enable'}</button></div></div>)}
      </div></div>}
    </div>
  );
}

export function AdminLivePage() {
  const [title, setTitle] = useState('');
  const [stream, setStream] = useState<Stream | null>(null);
  const [livekitUrl, setLivekitUrl] = useState('');
  const [publisherToken, setPublisherToken] = useState('');
  const [broadcastConnected, setBroadcastConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    void api<{ stream: Stream | null; livekitUrl: string }>('/stream').then(async (result) => {
      if (!active) return;
      setStream(result.stream);
      setLivekitUrl(result.livekitUrl);
      if (result.stream) {
        try {
          const token = await api<{ token: string }>('/stream/token', { method: 'POST' });
          if (active) setPublisherToken(token.token);
        } catch (reason) {
          if (active) setError(reason instanceof Error ? reason.message : 'Unable to connect to the livestream.');
        }
      }
    }).catch((reason: unknown) => {
      if (active) setError(reason instanceof Error ? reason.message : 'Unable to load livestream status.');
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function startStream(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api<{ success: true }>('/admin/stream/start', { method: 'POST', body: JSON.stringify({ title }) });
      const current = await api<{ stream: Stream | null; livekitUrl: string }>('/stream');
      if (!current.stream) throw new Error('The livestream room was not created. Please try again.');
      setStream(current.stream);
      setLivekitUrl(current.livekitUrl);
      setTitle('');
      const token = await api<{ token: string }>('/stream/token', { method: 'POST' });
      setPublisherToken(token.token);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to start the livestream.');
    } finally {
      setBusy(false);
    }
  }

  async function endStream() {
    setBusy(true);
    setError('');
    try {
      await api<{ success: true }>('/admin/stream/end', { method: 'POST' });
      setPublisherToken('');
      setBroadcastConnected(false);
      setStream(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to end the livestream.');
    } finally {
      setBusy(false);
    }
  }

  async function reconnectPublisher() {
    setBusy(true);
    setError('');
    try {
      const current = await api<{ stream: Stream | null; livekitUrl: string }>('/stream');
      if (!current.stream) throw new Error('There is no active livestream to connect to.');
      const result = await api<{ token: string }>('/stream/token', { method: 'POST' });
      setStream(current.stream);
      setLivekitUrl(current.livekitUrl);
      setPublisherToken(result.token);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to connect to the livestream.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="admin-page">
      <div className="page-header"><div><div className="eyebrow eyebrow-mint">LIVE</div><h1>Manage the livestream.</h1></div></div>
      <div className="admin-split-grid">
        <form className="admin-panel form-panel" onSubmit={startStream}>
          <h3>{stream ? 'You’re hosting live' : 'Start a livestream'}</h3>
          {!stream && <label className="field-label">Session title<input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Community AMA / Q&A / Training" required maxLength={180} /> </label>}
          {stream && <p className="broadcast-help">Keep this page open while you’re broadcasting. Members can join from their community page.</p>}
          <FieldError>{error}</FieldError>
          {!stream
            ? <button className="button-primary" type="submit" disabled={busy || loading}>{busy ? 'Starting…' : 'Start livestream'}</button>
            : <button className="danger-button" type="button" onClick={() => void endStream()} disabled={busy}>{busy ? 'Ending…' : 'End livestream for everyone'}</button>}
        </form>
        <div className="admin-panel list-panel">
          <h3>Current status</h3>
          {loading ? <div className="screen-loading small"><span className="spinner" /> Checking…</div> : stream ? <div className="live-status-box"><span className="live-pill">LIVE NOW</span><strong>{stream.title}</strong><small>Live room is ready for members.</small></div> : <div className="empty-card small"><p>No active livestream.</p></div>}
        </div>
      </div>
      {stream && <section className="admin-panel broadcaster-panel">
        <div className="section-heading-row broadcaster-heading">
          <div><div className="eyebrow eyebrow-mint">BROADCAST</div><h2>{stream.title}</h2><p>{broadcastConnected ? 'Your camera and microphone are streaming to members.' : 'Connecting your camera and microphone. Your browser may ask for permission.'}</p></div>
          <span className={`stream-status ${broadcastConnected ? 'is-live' : ''}`}><i />{broadcastConnected ? 'BROADCASTING' : 'CONNECTING'}</span>
        </div>
        {publisherToken
          ? <LiveKitRoom
            token={publisherToken}
            serverUrl={livekitUrl}
            connect
            audio
            video
            onConnected={() => { setBroadcastConnected(true); setError(''); }}
            onDisconnected={() => setBroadcastConnected(false)}
            onError={(reason) => { setBroadcastConnected(false); setError(`Live connection failed: ${reason.message}`); }}
            onMediaDeviceFailure={(failure, kind) => {
              setError(`${kind ?? 'Camera or microphone'} is unavailable (${failure ?? 'unknown issue'}). Check the device connection and browser permissions.`);
            }}
            className="broadcaster-room"
          >
            <div className="broadcaster-stage"><StreamTiles /><RoomAudioRenderer /></div>
            <BroadcasterControls />
            <LiveAttendeeCount />
          </LiveKitRoom>
          : <div className="empty-card small"><p>Broadcaster is not connected. You can retry the connection.</p><button className="button-primary" type="button" onClick={() => void reconnectPublisher()} disabled={busy}>{busy ? 'Connecting…' : 'Connect broadcaster'}</button></div>}
      </section>}
    </div>
  );
}

export function MemberPage() {
  const { user, siteSettings } = useAuth();
  const [content, setContent] = useState<ContentItem[]>([]);
  const [stream, setStream] = useState<Stream | null>(null);
  const [livekitUrl, setLivekitUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([
      api<{ content: ContentItem[] }>('/content'),
      api<{ stream: Stream | null; livekitUrl: string }>('/stream')
    ]).then(([contentResult, streamResult]) => {
      if (!active) return;
      setContent(contentResult.content);
      setStream(streamResult.stream);
      setLivekitUrl(streamResult.livekitUrl);
      setError('');
    }).catch((reason: unknown) => {
      if (active) setError(reason instanceof Error ? reason.message : 'Unable to load your space.');
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    const refreshStream = () => {
      void api<{ stream: Stream | null }>('/stream').then((result) => {
        if (active) setStream(result.stream);
      }).catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : 'Unable to check livestream status.');
      });
    };
    const intervalId = window.setInterval(refreshStream, 10000);
    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, []);

  const greetingName = user?.name.split(/\s+/)[0] ?? 'there';
  return (
    <div className="member-dashboard">
      <div className="member-welcome">
        <div className="welcome-copy">
          <span className="eyebrow eyebrow-mint"><span className="eyebrow-dot" /> YOUR COMMUNITY SPACE</span>
          <h1>Good to see you,<br /><span>{greetingName}.</span></h1>
          <p>{siteSettings.welcomeMessage}</p>
          <a className="button-dark" href="#updates">Explore your space <ArrowRight size={15} /></a>
        </div>
        <div className="welcome-art" aria-hidden="true"><div className="welcome-art-disc" /><div className="welcome-art-sun" /><div className="welcome-art-arc" /><div className="welcome-art-orbit"><span /><i /><b /></div><div className="welcome-art-badge"><span>✳</span> GOOD TO<br />HAVE YOU HERE</div><div className="welcome-art-caption">ALL THE GOOD<br />THINGS, IN ONE PLACE</div></div>
      </div>
      <section className="member-stats" aria-label="Community shortcuts">
        <a className="member-stat" href="#updates">
          <span className="stat-icon mint"><Sparkles size={18} /></span>
          <span><strong>{content.length} {content.length === 1 ? 'community update' : 'community updates'}</strong><small>{content[0]?.title ?? 'Catch up on the latest from your community.'}</small></span>
          <ArrowUpRight className="stat-arrow" size={17} />
        </a>
        <a className="member-stat" href="#community-chat">
          <span className="stat-icon lavender"><MessageCircle size={18} /></span>
          <span><strong>Community chat</strong><small>Say hello and join the conversation.</small></span>
          <ArrowUpRight className="stat-arrow" size={17} />
        </a>
        <a className={`member-stat ${stream ? 'member-stat-live' : ''}`} href="#community-live">
          <span className={`stat-icon ${stream ? 'live-stat-icon' : 'amber'}`}>{stream ? <Radio size={18} /> : <Video size={18} />}</span>
          <span><strong>{stream ? 'Live now' : 'Livestream'}</strong><small>{stream ? stream.title : 'Check in for the next community event.'}</small></span>
          {stream ? <i className="status-dot status-live" /> : <ArrowUpRight className="stat-arrow" size={17} />}
        </a>
      </section>
      <div className="member-columns">
        <section className="updates-section" id="updates">
          <div className="section-heading-row"><div><div className="eyebrow eyebrow-mint">THE LATEST</div><h2>Community updates</h2><p>Fresh from the community, just for you.</p></div><span className="updates-count">{content.length} {content.length === 1 ? 'update' : 'updates'}</span></div>
          <FieldError>{error}</FieldError>
          {loading && <div className="empty-card"><span className="spinner" /><p>Finding the latest updates…</p></div>}
          {!loading && content.length === 0 && <div className="empty-card"><span className="empty-illustration"><Sparkles size={23} /></span><h3>A little quiet for now.</h3><p>Your community’s next update will show up right here.</p></div>}
          <div className="update-list">
            {content.map((item, index) => (
              <article className={`update-card ${index === 0 && item.imageUrl ? 'update-card-featured' : ''}`} key={item.id}>
                {item.imageUrl && <div className="update-image"><img src={item.imageUrl} alt="" loading="lazy" /></div>}
                <div className="update-content"><div className="update-meta"><span className="update-tag"><span /> COMMUNITY NOTE</span><span className="update-date"><Clock3 size={13} /> {formatDate(item.createdAt)}</span></div><h3>{item.title}</h3><p>{item.body}</p>
                  {item.assets.length > 0 && <div className="update-assets">{item.assets.map((asset) => <ContentAttachment key={asset.id} asset={asset} />)}</div>}
                  <div className="update-card-footer"><Avatar name={item.authorName} small /><span>Shared by <strong>{item.authorName}</strong></span><LikeButton type="content" targetId={item.id} likesCount={item.likesCount} liked={item.liked} /><span className="update-footer-spacer" /><button className="text-icon-button" onClick={() => document.getElementById('community-chat')?.scrollIntoView({ behavior: 'smooth' })}><MessageCircle size={15} /> Say something</button></div></div>
              </article>
            ))}
          </div>
        </section>
        <aside className="member-rail">
          <StreamCard stream={stream} livekitUrl={livekitUrl} />
          <ChatCard />
          <div className="member-rail-note"><CircleHelp size={15} /><span>Good spaces are built together.</span><a href="#about" aria-label="About this community"><ArrowUpRight size={14} /></a></div>
        </aside>
      </div>
    </div>
  );
}

function ContentAttachment({ asset }: { asset: ContentAsset }) {
  const [isOpen, setIsOpen] = useState(false);
  const downloadUrl = mediaUrl(`${asset.url}?download=1`);

  return (
    <>
      <div className="asset-download">
        {asset.category === 'video' ? <Video size={18} /> : <FileText size={18} />}
        <span><strong>{asset.name}</strong><small>{formatFileSize(asset.sizeBytes)}</small></span>
        <button type="button" className="text-icon-button" onClick={() => setIsOpen(true)}>
          {asset.category === 'video' ? 'Watch' : 'Open'}
        </button>
        <LikeButton type="asset" targetId={asset.id} likesCount={asset.likesCount} liked={asset.liked} compact />
        <a className="asset-download-link" href={downloadUrl} download={asset.name} aria-label={`Download ${asset.name}`}><Download size={17} /></a>
      </div>
      {asset.category === 'video' && (
        <video controls preload="metadata" src={mediaUrl(asset.url)} aria-label={asset.name}>
          Your browser does not support video playback.
        </video>
      )}
      {isOpen && <AttachmentViewer asset={asset} onClose={() => setIsOpen(false)} />}
    </>
  );
}

function LikeButton({
  type,
  targetId,
  likesCount,
  liked,
  compact = false
}: {
  type: 'content' | 'asset' | 'stream';
  targetId: string;
  likesCount: number;
  liked: boolean;
  compact?: boolean;
}) {
  const [reaction, setReaction] = useState({ likesCount, liked });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setReaction({ likesCount, liked });
  }, [targetId, likesCount, liked]);

  async function toggleLike() {
    if (pending) return;
    const previous = reaction;
    const nextLiked = !previous.liked;
    setReaction({
      liked: nextLiked,
      likesCount: Math.max(0, previous.likesCount + (nextLiked ? 1 : -1))
    });
    setPending(true);
    setError('');
    try {
      const result = await api<{ likesCount: number; liked: boolean }>(
        `/reactions/${type}/${targetId}`,
        { method: 'PATCH', body: JSON.stringify({ liked: nextLiked }) }
      );
      setReaction(result);
    } catch (reason) {
      setReaction(previous);
      setError(reason instanceof Error ? reason.message : 'Unable to update your like.');
    } finally {
      setPending(false);
    }
  }

  return (
    <span className={`like-control ${compact ? 'like-control-compact' : ''}`}>
      <button
        type="button"
        className={`like-button ${reaction.liked ? 'is-liked' : ''}`}
        aria-label={`${reaction.liked ? 'Unlike' : 'Like'} (${reaction.likesCount} likes)`}
        aria-pressed={reaction.liked}
        title={reaction.liked ? 'Unlike' : 'Like'}
        onClick={() => void toggleLike()}
        disabled={pending}
      >
        <ThumbsUp size={15} fill={reaction.liked ? 'currentColor' : 'none'} />
        <span>{reaction.liked ? 'Unlike' : 'Like'}</span>
        <span className="like-count">{reaction.likesCount}</span>
      </button>
      {error && <span className="like-error" role="alert">{error}</span>}
    </span>
  );
}

function AttachmentViewer({ asset, onClose }: { asset: ContentAsset; onClose: () => void }) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const extension = asset.name.split('.').pop()?.toLowerCase();
  const isPdf = asset.mimeType === 'application/pdf';
  const isVideo = asset.category === 'video';
  const isText = extension === 'txt';
  const isWordDocument = extension === 'docx';

  useEffect(() => {
    if (!isText && !isWordDocument) return;
    let active = true;
    setLoading(true);
    void fetch(mediaUrl(asset.url), { credentials: 'include' }).then(async (response) => {
      if (!response.ok) throw new Error('Unable to open this document. Please try again.');
      const buffer = await response.arrayBuffer();
      if (isWordDocument) {
        const { default: mammoth } = await import('mammoth');
        return (await mammoth.extractRawText({ arrayBuffer: buffer })).value;
      }
      return new TextDecoder().decode(buffer);
    }).then((result) => {
      if (active) setText(result);
    }).catch((reason: unknown) => {
      if (active) setError(reason instanceof Error ? reason.message : 'Unable to open this document.');
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [asset.url, isText, isWordDocument]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div className="attachment-viewer-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section className="attachment-viewer" role="dialog" aria-modal="true" aria-labelledby="attachment-viewer-title">
        <header className="attachment-viewer-header">
          <div><span className="eyebrow eyebrow-mint">{isVideo ? 'VIDEO' : 'DOCUMENT'}</span><h2 id="attachment-viewer-title">{asset.name}</h2></div>
          <div className="attachment-viewer-actions">
            <a className="secondary-button" href={mediaUrl(`${asset.url}?download=1`)}><Download size={15} /> Download</a>
            <button type="button" className="text-icon-button" aria-label="Close preview" onClick={onClose}><X size={18} /></button>
          </div>
        </header>
        <div className="attachment-viewer-body">
          {isVideo && <video controls autoPlay preload="metadata" src={mediaUrl(asset.url)} aria-label={asset.name} />}
          {isPdf && <iframe title={asset.name} src={mediaUrl(asset.url)} />}
          {(isText || isWordDocument) && (loading
            ? <div className="empty-card"><span className="spinner" /><p>Opening document…</p></div>
            : error ? <div className="empty-card"><p>{error}</p></div> : <pre className="document-text-preview">{text}</pre>)}
          {!isVideo && !isPdf && !isText && !isWordDocument && <div className="document-open-fallback">
            <FileText size={30} />
            <h3>This file needs a compatible document app to preview.</h3>
            <p>Download it to open it with a document viewer on your device.</p>
            <a className="button-primary" href={mediaUrl(`${asset.url}?download=1`)}><Download size={16} /> Download and open</a>
          </div>}
        </div>
      </section>
    </div>
  );
}

function StreamCard({ stream, livekitUrl }: { stream: Stream | null; livekitUrl: string }) {
  const [active, setActive] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setActive(false);
    setExpanded(false);
    setToken('');
    setError('');
  }, [stream?.id]);

  useEffect(() => {
    if (!expanded) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setExpanded(false);
    }
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [expanded]);

  async function join() {
    if (!stream) return;
    setBusy(true);
    setError('');
    try {
      const result = await api<{ token: string }>('/stream/token', { method: 'POST' });
      setToken(result.token);
      setActive(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to join the livestream.');
    } finally {
      setBusy(false);
    }
  }

  async function recordStreamView() {
    try {
      await api<{ success: true }>('/stream/view', { method: 'POST' });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to record the livestream view.');
    }
  }

  if (active && stream) return (
    <div
      className={`live-viewer-overlay ${expanded ? 'is-expanded' : ''}`}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) setExpanded(false);
      }}
    >
      <section className="rail-card live-viewer-card" role={expanded ? 'dialog' : undefined} aria-modal={expanded || undefined} aria-label={expanded ? `${stream.title} livestream` : undefined}>
        <div className="rail-card-head">
          <span className="rail-eyebrow"><span className="live-pulse" /> LIVE RIGHT NOW</span>
          <div className="live-viewer-actions">
            <button type="button" className="quiet-icon-button" onClick={() => setExpanded((value) => !value)} aria-label={expanded ? 'Minimize livestream' : 'Expand livestream'} title={expanded ? 'Minimize' : 'Expand'}>
              {expanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
            <button type="button" className="quiet-icon-button" onClick={() => { setActive(false); setExpanded(false); setToken(''); }} aria-label="Close stream" title="Close stream"><X size={16} /></button>
          </div>
        </div>
        <h3>{stream.title}</h3>
        <LikeButton type="stream" targetId={stream.id} likesCount={stream.likesCount} liked={stream.liked} />
        {token && <LiveKitRoom token={token} serverUrl={livekitUrl} connect className="livekit-shell" onConnected={() => { void recordStreamView(); }} onError={(reason) => setError(`Unable to connect to the livestream: ${reason.message}`)}><div className="livekit-attendee-bar"><LiveAttendeeCount /></div><div className="livekit-stage"><StreamTiles /><RoomAudioRenderer /></div></LiveKitRoom>}
        <button className="stream-leave-button" onClick={() => { setActive(false); setExpanded(false); setToken(''); }}>Leave livestream <ArrowUpRight size={14} /></button>
        <FieldError>{error}</FieldError>
      </section>
    </div>
  );

  return (
    <section className="rail-card stream-card" id="community-live">
      <div className="rail-card-head"><span className="rail-eyebrow"><Radio size={13} /> LIVE FROM THE COMMUNITY</span><span className={stream ? 'stream-status is-live' : 'stream-status'}><i />{stream ? 'LIVE' : 'OFFLINE'}</span></div>
      <div className={`stream-art ${stream ? 'stream-art-live' : ''}`}><div className="stream-art-center"><span>{stream ? <Radio size={25} /> : <Video size={25} />}</span><i /><b /></div><span className="stream-art-orbit so-a" /><span className="stream-art-orbit so-b" /><span className="stream-art-spark">✳</span></div>
      {stream ? <><span className="stream-card-tag"><span className="live-pulse" /> HAPPENING NOW</span><h3>{stream.title}</h3><p>Drop in, say hello, and join the conversation live.</p><div className="stream-actions-row"><button className="button-primary stream-join-button" onClick={() => void join()} disabled={busy}>{busy ? <><LoaderCircle size={15} className="spin" /> Joining…</> : <>Join the live room <ArrowRight size={15} /></>}</button><LikeButton type="stream" targetId={stream.id} likesCount={stream.likesCount} liked={stream.liked} /></div><FieldError>{error}</FieldError></> : <><h3>A moment, together.</h3><p>When your community goes live, you’ll find a seat right here.</p><span className="stream-empty-note"><span className="stream-empty-icon"><Sparkles size={14} /></span>Good things are on the way</span></>}
    </section>
  );
}

function StreamTiles() {
  const tracks = useTracks([Track.Source.Camera, Track.Source.ScreenShare], { onlySubscribed: false });
  if (!tracks.length) return <div className="stream-no-video"><Video size={24} /><span>The livestream is connecting…</span></div>;
  return <div className="stream-tiles"><TrackLoop tracks={tracks}><ParticipantTile /></TrackLoop></div>;
}

function LiveAttendeeCount() {
  const participants = useParticipants({
    updateOnlyOn: [RoomEvent.ParticipantConnected, RoomEvent.ParticipantDisconnected]
  });
  const isConnected = useConnectionState() === ConnectionState.Connected;
  const memberCount = isConnected ? participants.reduce((count, participant) => {
    try {
      const metadata = JSON.parse(participant.metadata || '{}') as { role?: string };
      return count + (metadata.role === 'user' ? 1 : 0);
    } catch {
      return count;
    }
  }, 0) : 0;

  return (
    <span className="live-attendee-count" aria-live="polite" aria-label={`${memberCount} ${memberCount === 1 ? 'member' : 'members'} watching`}>
      <Users size={15} />
      <strong>{memberCount}</strong>
      <span>{memberCount === 1 ? 'member watching' : 'members watching'}</span>
    </span>
  );
}

function BroadcasterControls() {
  const { isCameraEnabled, isMicrophoneEnabled, isScreenShareEnabled, localParticipant } = useLocalParticipant();
  const [error, setError] = useState('');

  async function toggleDevice(action: () => Promise<unknown>) {
    setError('');
    try {
      await action();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to change the broadcast device.');
    }
  }

  return (
    <div className="broadcaster-controls">
      <button type="button" className="secondary-button" onClick={() => void toggleDevice(() => localParticipant.setCameraEnabled(!isCameraEnabled))}>
        {isCameraEnabled ? <CameraOff size={16} /> : <Camera size={16} />}{isCameraEnabled ? 'Turn camera off' : 'Turn camera on'}
      </button>
      <button type="button" className="secondary-button" onClick={() => void toggleDevice(() => localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled))}>
        {isMicrophoneEnabled ? <MicOff size={16} /> : <Mic size={16} />}{isMicrophoneEnabled ? 'Mute microphone' : 'Unmute microphone'}
      </button>
      <button type="button" className="secondary-button" onClick={() => void toggleDevice(() => localParticipant.setScreenShareEnabled(!isScreenShareEnabled))}>
        {isScreenShareEnabled ? <VideoOff size={16} /> : <Video size={16} />}{isScreenShareEnabled ? 'Stop sharing screen' : 'Share screen'}
      </button>
      <FieldError>{error}</FieldError>
    </div>
  );
}

interface ChatMessage {
  id: number;
  message: string;
  name: string;
  userId: string;
  createdAt: string;
  forwarded?: boolean;
  replyTo?: { id: number; message: string; name: string } | null;
}

interface ChatMember {
  id: string;
  name: string;
  role: 'admin' | 'user';
}

interface ChatActionResult {
  success: boolean;
  error?: string;
  message?: ChatMessage & { conversationId: string; forwarded: boolean };
  forwardedCount?: number;
}

function ForwardMessageDialog({
  socket,
  messageId,
  conversationId,
  privateMessage,
  onClose,
  onForwarded
}: {
  socket: Socket | null;
  messageId: number;
  conversationId?: string;
  privateMessage: boolean;
  onClose: () => void;
  onForwarded: (count: number) => void;
}) {
  const [members, setMembers] = useState<ChatMember[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    api<{ members: ChatMember[] }>('/chat/members').then((result) => {
      if (active) setMembers(result.members);
    }).catch((reason: unknown) => {
      if (active) setError(reason instanceof Error ? reason.message : 'Unable to load members.');
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, []);

  function toggleMember(id: string) {
    setSelectedIds((previous) => previous.includes(id)
      ? previous.filter((selectedId) => selectedId !== id)
      : previous.length < 20 ? [...previous, id] : previous);
  }

  function forwardMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!socket?.connected) {
      setError('Reconnect to chat before forwarding this message.');
      return;
    }
    if (!selectedIds.length) {
      setError('Choose at least one member.');
      return;
    }
    setSending(true);
    setError('');
    const eventName = privateMessage ? 'private:forward' : 'chat:forward';
    const payload = {
      messageId,
      recipientIds: selectedIds,
      ...(privateMessage && conversationId ? { conversationId } : {})
    };
    socket.timeout(10000).emit(eventName, payload, (timeoutError: Error | null, result: ChatActionResult) => {
      setSending(false);
      if (timeoutError) {
        setError('Forwarding timed out. Please try again.');
      } else if (!result?.success) {
        setError(result?.error ?? 'The message could not be forwarded.');
      } else {
        onForwarded(result.forwardedCount ?? selectedIds.length);
        onClose();
      }
    });
  }

  return (
    <div className="message-dialog-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !sending) onClose();
    }}>
      <section className="message-dialog" role="dialog" aria-modal="true" aria-labelledby="forward-message-title">
        <header><div><span className="eyebrow eyebrow-mint">SHARE A MESSAGE</span><h2 id="forward-message-title">Forward to members</h2><p>Choose who should receive this message privately.</p></div><button type="button" className="quiet-icon-button" aria-label="Close forward dialog" onClick={onClose}><X size={17} /></button></header>
        <form onSubmit={forwardMessage}>
          <div className="forward-member-list">
            {loading ? <div className="screen-loading small"><span className="spinner" /> Loading members…</div>
              : members.length ? members.map((member) => <label className="forward-member" key={member.id}>
                <input type="checkbox" checked={selectedIds.includes(member.id)} onChange={() => toggleMember(member.id)} disabled={!selectedIds.includes(member.id) && selectedIds.length >= 20} />
                <Avatar name={member.name} small />
                <span><strong>{member.name}</strong><small>{member.role === 'admin' ? 'Administrator' : 'Member'}</small></span>
              </label>)
                : <div className="empty-card small"><p>No other active members found.</p></div>}
          </div>
          <FieldError>{error}</FieldError>
          <footer><span>{selectedIds.length}/20 selected</span><button type="submit" className="button-primary" disabled={loading || sending || !selectedIds.length}>{sending ? 'Forwarding…' : <><Forward size={15} /> Forward message</>}</button></footer>
        </form>
      </section>
    </div>
  );
}

function ChatCard() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const [connecting, setConnecting] = useState(true);
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);
  const [forwardingMessageId, setForwardingMessageId] = useState<number | null>(null);
  const [notice, setNotice] = useState('');
  const endRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    let disposed = false;
    void socketUrl().then((url) => {
      if (disposed) return;
      const socket = io(url, { withCredentials: true, transports: ['websocket', 'polling'] });
      socketRef.current = socket;
      socket.on('connect', () => { setConnecting(false); setError(''); });
      socket.on('connect_error', () => { setConnecting(false); setError('Chat is temporarily unavailable.'); });
      socket.on('chat:message', (message: ChatMessage) => {
        setMessages((previous) => [...previous, message].slice(-50));
      });
      socket.on('chat:deleted', (result: { messageId: number }) => {
        setMessages((previous) => previous.filter((message) => message.id !== result.messageId));
      });
      socket.on('chat:error', (result: { error: string }) => setError(result.error));
    }).catch((reason: unknown) => {
      if (!disposed) {
        setConnecting(false);
        setError(reason instanceof Error ? reason.message : 'Unable to connect to chat.');
      }
    });
    api<{ messages: ChatMessage[] }>('/chat/messages').then((result) => {
      setMessages((existing) => {
        const merged = new Map<number, ChatMessage>();
        [...result.messages, ...existing].forEach((message) => merged.set(message.id, message));
        return [...merged.values()].sort((a, b) => a.id - b.id).slice(-50);
      });
    }).catch((reason: unknown) => {
      setError(reason instanceof Error ? reason.message : 'Unable to load chat.');
    });
    return () => {
      disposed = true;
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, []);

  useEffect(() => { endRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }, [messages]);

  function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = draft.trim();
    if (!message || !socketRef.current?.connected) {
      if (!socketRef.current?.connected) setError('Reconnect to chat before sending a message.');
      return;
    }
    socketRef.current.emit('chat:send', { message });
    setDraft('');
    setError('');
  }

  function deleteMessage(messageId: number) {
    const socket = socketRef.current;
    if (!socket?.connected) {
      setError('Reconnect to chat before deleting a message.');
      return;
    }
    setPendingDeleteId(messageId);
    setError('');
    socket.timeout(10000).emit('chat:delete', { messageId }, (timeoutError: Error | null, result: ChatActionResult) => {
      setPendingDeleteId(null);
      if (timeoutError) setError('Deleting the message timed out. Please try again.');
      else if (!result?.success) setError(result?.error ?? 'The message could not be deleted.');
    });
  }

  return (
    <>
      <section className="rail-card chat-card" id="community-chat">
        <div className="rail-card-head"><span className="rail-eyebrow"><MessageCircle size={13} /> THE COMMUNITY ROOM</span><div className="chat-online"><i /> {connecting ? 'CONNECTING' : 'HERE TOGETHER'}</div></div>
        <div className="chat-heading"><span className="chat-avatar-stack"><i>✦</i><b>g</b><em>☺</em></span><h3>A place to say hey.</h3><p>A little hello goes a long way.</p></div>
        <div className="chat-messages">
          {messages.length === 0 && <div className="chat-empty"><span className="chat-empty-icon"><MessageCircle size={18} /></span><span>No messages yet. Start the conversation.</span></div>}
          {messages.map((message) => (
            <div className={`chat-message ${message.userId === user?.id ? 'chat-message-own' : ''}`} key={message.id}>
              {message.userId !== user?.id && <span className="chat-message-avatar">{message.name[0]?.toUpperCase()}</span>}
              <div className="chat-bubble-wrap"><span className="chat-message-name">{message.userId === user?.id ? 'You' : message.name}</span><div className="chat-bubble">{message.forwarded && <span className="forwarded-label"><Forward size={12} /> Forwarded</span>}{message.message}</div><span className="chat-message-time">{new Intl.DateTimeFormat('en', { hour: 'numeric', minute: '2-digit' }).format(new Date(message.createdAt))}</span>
                <div className="message-actions">
                  <button type="button" aria-label="Forward message" title="Forward message" onClick={() => setForwardingMessageId(message.id)}><Forward size={13} /></button>
                  {(message.userId === user?.id || user?.role === 'admin') && <button type="button" aria-label="Delete message for everyone" title="Delete for everyone" disabled={pendingDeleteId === message.id} onClick={() => void deleteMessage(message.id)}><Trash2 size={13} /></button>}
                </div>
              </div>
            </div>
          ))}
          <div ref={endRef} />
        </div>
        <form className="chat-composer" onSubmit={sendMessage}><input aria-label="Write a message" placeholder="Write something kind…" value={draft} maxLength={1000} onChange={(event) => setDraft(event.target.value)} /><button className="chat-send" type="submit" disabled={!draft.trim()} aria-label="Send message"><Send size={15} /></button></form>
        <FieldError>{error}</FieldError>
        {notice && <span className="chat-action-notice" role="status">{notice}</span>}
        <div className="chat-footer"><span><Shield size={12} /> A kind word looks good on everyone.</span><span>BE KIND ✳</span></div>
      </section>
      {forwardingMessageId !== null && <ForwardMessageDialog socket={socketRef.current} messageId={forwardingMessageId} privateMessage={false} onClose={() => setForwardingMessageId(null)} onForwarded={(count) => setNotice(`Forwarded to ${count} ${count === 1 ? 'member' : 'members'}.`)} />}
    </>
  );
}

interface PrivateConversation {
  id: string;
  type: 'direct' | 'group';
  name: string;
  memberCount: number;
  member: ChatMember | null;
  lastMessage: string | null;
  lastMessageAt: string | null;
  lastSenderId: string | null;
}

interface PrivateMessage extends ChatMessage {
  conversationId: string;
  forwarded: boolean;
}

function CreateGroupDialog({
  members,
  onClose,
  onCreated
}: {
  members: ChatMember[];
  onClose: () => void;
  onCreated: (conversation: PrivateConversation) => void;
}) {
  const [name, setName] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  function toggleMember(id: string) {
    setSelectedIds((previous) => previous.includes(id)
      ? previous.filter((selectedId) => selectedId !== id)
      : previous.length < 99 ? [...previous, id] : previous);
  }

  async function createGroup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (selectedIds.length === 0) {
      setError('Choose at least one other member for the group.');
      return;
    }
    setSending(true);
    setError('');
    try {
      const result = await api<{ conversation: PrivateConversation }>('/admin/chat/groups', {
        method: 'POST',
        body: JSON.stringify({ name, memberIds: selectedIds })
      });
      onCreated(result.conversation);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to create the group.');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="message-dialog-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !sending) onClose();
    }}>
      <section className="message-dialog" role="dialog" aria-modal="true" aria-labelledby="create-group-title">
        <header><div><span className="eyebrow eyebrow-mint">ADMIN GROUP</span><h2 id="create-group-title">Create a group</h2><p>You’ll be included as a group member.</p></div><button type="button" className="quiet-icon-button" aria-label="Close group dialog" onClick={onClose}><X size={17} /></button></header>
        <form onSubmit={(event) => void createGroup(event)}>
          <label className="field-label" htmlFor="group-name">Group name</label>
          <input id="group-name" className="group-name-input" value={name} onChange={(event) => setName(event.target.value)} minLength={2} maxLength={100} required />
          <div className="forward-member-list">
            {members.length ? members.map((member) => <label className="forward-member" key={member.id}>
              <input type="checkbox" checked={selectedIds.includes(member.id)} onChange={() => toggleMember(member.id)} disabled={!selectedIds.includes(member.id) && selectedIds.length >= 99} />
              <Avatar name={member.name} small />
              <span><strong>{member.name}</strong><small>{member.role === 'admin' ? 'Administrator' : 'Member'}</small></span>
            </label>) : <div className="empty-card small"><p>No other active members found.</p></div>}
          </div>
          <FieldError>{error}</FieldError>
          <footer><span>{selectedIds.length}/99 members selected</span><button type="submit" className="button-primary" disabled={sending || !name.trim() || !selectedIds.length}>{sending ? 'Creating…' : <><Users size={15} /> Create group</>}</button></footer>
        </form>
      </section>
    </div>
  );
}

export function MessagesPage() {
  const { user } = useAuth();
  const [members, setMembers] = useState<ChatMember[]>([]);
  const [conversations, setConversations] = useState<PrivateConversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState('');
  const [messages, setMessages] = useState<PrivateMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);
  const [forwardingMessage, setForwardingMessage] = useState<PrivateMessage | null>(null);
  const [replyingTo, setReplyingTo] = useState<PrivateMessage | null>(null);
  const [creatingGroup, setCreatingGroup] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const activeConversationRef = useRef('');
  const endRef = useRef<HTMLDivElement>(null);

  function refreshConversations() {
    void api<{ conversations: PrivateConversation[] }>('/chat/conversations').then((result) => {
      setConversations(result.conversations);
    }).catch((reason: unknown) => {
      setError(reason instanceof Error ? reason.message : 'Unable to refresh your conversations.');
    });
  }

  useEffect(() => {
    let disposed = false;
    void Promise.all([
      api<{ members: ChatMember[] }>('/chat/members'),
      api<{ conversations: PrivateConversation[] }>('/chat/conversations')
    ]).then(([memberResult, conversationResult]) => {
      if (disposed) return;
      setMembers(memberResult.members);
      setConversations(conversationResult.conversations);
      setError('');
    }).catch((reason: unknown) => {
      if (!disposed) setError(reason instanceof Error ? reason.message : 'Unable to load private messages.');
    }).finally(() => {
      if (!disposed) setLoading(false);
    });

    void socketUrl().then((url) => {
      if (disposed) return;
      const socket = io(url, { withCredentials: true, transports: ['websocket', 'polling'] });
      socketRef.current = socket;
      socket.on('connect', () => { setConnecting(false); setError(''); });
      socket.on('connect_error', () => { setConnecting(false); setError('Private messaging is temporarily unavailable.'); });
      socket.on('private:message', (message: PrivateMessage) => {
        if (activeConversationRef.current === message.conversationId) {
          setMessages((previous) => previous.some((item) => item.id === message.id)
            ? previous
            : [...previous, message].slice(-100));
        }
        refreshConversations();
      });
      socket.on('private:deleted', (result: { conversationId: string; messageId: number }) => {
        if (activeConversationRef.current === result.conversationId) {
          setMessages((previous) => previous.filter((item) => item.id !== result.messageId));
        }
        refreshConversations();
      });
      socket.on('private:conversation-updated', refreshConversations);
    }).catch((reason: unknown) => {
      if (!disposed) {
        setConnecting(false);
        setError(reason instanceof Error ? reason.message : 'Unable to connect to private messaging.');
      }
    });

    return () => {
      disposed = true;
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!activeConversationId) {
      setMessages([]);
      return;
    }
    let active = true;
    setMessages([]);
    void api<{ messages: PrivateMessage[] }>(`/chat/conversations/${activeConversationId}/messages`).then((result) => {
      if (active && activeConversationRef.current === activeConversationId) setMessages(result.messages);
    }).catch((reason: unknown) => {
      if (active) setError(reason instanceof Error ? reason.message : 'Unable to load this conversation.');
    });
    return () => { active = false; };
  }, [activeConversationId]);

  function openConversation(id: string) {
    activeConversationRef.current = id;
    setActiveConversationId(id);
    setReplyingTo(null);
    setError('');
    setNotice('');
  }

  async function startConversation(memberId: string) {
    if (!memberId) return;
    setError('');
    try {
      const result = await api<{ conversation: PrivateConversation }>('/chat/conversations', {
        method: 'POST',
        body: JSON.stringify({ memberId })
      });
      setConversations((previous) => {
        const existing = previous.find((conversation) => conversation.id === result.conversation.id);
        if (existing) return previous;
        return [{ ...result.conversation, lastMessage: null, lastMessageAt: null, lastSenderId: null }, ...previous];
      });
      openConversation(result.conversation.id);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to start a conversation.');
    }
  }

  function onGroupCreated(conversation: PrivateConversation) {
    setConversations((previous) => [conversation, ...previous.filter((item) => item.id !== conversation.id)]);
    setCreatingGroup(false);
    openConversation(conversation.id);
    const socket = socketRef.current;
    if (socket?.connected) {
      socket.emit('private:refresh-conversation', { conversationId: conversation.id });
    } else {
      setNotice('Group created. Members will see it when they open private messages.');
    }
  }

  function sendPrivateMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = draft.trim();
    const socket = socketRef.current;
    if (!message || !activeConversationId || sending) return;
    if (!socket?.connected) {
      setError('Reconnect to messaging before sending a message.');
      return;
    }
    setSending(true);
    setError('');
    socket.timeout(10000).emit(
      'private:send',
      { conversationId: activeConversationId, message, replyToMessageId: replyingTo?.id ?? null },
      (timeoutError: Error | null, result: ChatActionResult) => {
        setSending(false);
        if (timeoutError) {
          setError('Sending timed out. Please try again.');
        } else if (!result?.success) {
          setError(result?.error ?? 'Your message could not be sent.');
        } else if (result.message) {
          setMessages((previous) => previous.some((item) => item.id === result.message?.id)
            ? previous
            : [...previous, result.message as PrivateMessage].slice(-100));
          refreshConversations();
          setDraft('');
          setReplyingTo(null);
        }
      }
    );
  }

  function deletePrivateMessage(messageId: number) {
    const socket = socketRef.current;
    if (!socket?.connected) {
      setError('Reconnect to messaging before deleting a message.');
      return;
    }
    setPendingDeleteId(messageId);
    setError('');
    socket.timeout(10000).emit(
      'private:delete',
      { conversationId: activeConversationId, messageId },
      (timeoutError: Error | null, result: ChatActionResult) => {
        setPendingDeleteId(null);
        if (timeoutError) setError('Deleting timed out. Please try again.');
        else if (!result?.success) setError(result?.error ?? 'The message could not be deleted.');
      }
    );
  }

  const activeConversation = conversations.find((conversation) => conversation.id === activeConversationId) ?? null;

  return (
    <>
      <div className="admin-page messages-page">
        <div className="page-header">
          <div><div className="eyebrow eyebrow-mint">PRIVATE MESSAGES</div><h1>Your conversations.</h1><p>Send a private note to any active community member.</p></div>
          <span className={`chat-online ${connecting ? '' : 'messages-connected'}`}><i />{connecting ? 'CONNECTING' : 'MESSAGING READY'}</span>
        </div>
        <section className="private-messages-panel">
          <aside className="conversation-sidebar">
            <label className="field-label" htmlFor="new-conversation">Start a conversation</label>
            <select id="new-conversation" value="" onChange={(event) => void startConversation(event.target.value)}>
              <option value="">Choose a member…</option>
              {members.map((member) => <option key={member.id} value={member.id}>{member.name}{member.role === 'admin' ? ' · Admin' : ''}</option>)}
            </select>
            {user?.role === 'admin' && <button type="button" className="secondary-button create-group-button" onClick={() => setCreatingGroup(true)}><Users size={15} /> Create a group</button>}
            <div className="conversation-list-heading"><strong>Recent conversations</strong><span>{conversations.length}</span></div>
            {loading ? <div className="screen-loading small"><span className="spinner" /> Loading…</div>
              : conversations.length ? <div className="conversation-list">
                {conversations.map((conversation) => <button key={conversation.id} type="button" className={`conversation-row ${activeConversationId === conversation.id ? 'active' : ''}`} onClick={() => openConversation(conversation.id)}>
                  {conversation.type === 'group'
                    ? <span className="conversation-group-icon"><Users size={16} /></span>
                    : <Avatar name={conversation.name} small />}
                  <span><strong>{conversation.name}</strong><small>{conversation.lastSenderId === user?.id ? 'You: ' : ''}{conversation.lastMessage ?? (conversation.type === 'group' ? `${conversation.memberCount} members · New group` : 'Start a conversation')}</small></span>
                  {conversation.lastMessageAt && <time>{new Intl.DateTimeFormat('en', { hour: 'numeric', minute: '2-digit' }).format(new Date(conversation.lastMessageAt))}</time>}
                </button>)}
              </div> : <div className="conversation-empty">Your private conversations will appear here.</div>}
          </aside>
          <section className="private-thread">
            {activeConversation ? <>
              <header className="private-thread-header">
                {activeConversation.type === 'group'
                  ? <span className="conversation-group-icon"><Users size={17} /></span>
                  : <Avatar name={activeConversation.name} small />}
                <span><strong>{activeConversation.name}</strong><small>{activeConversation.type === 'group'
                  ? `${activeConversation.memberCount} group members`
                  : activeConversation.member?.role === 'admin' ? 'Administrator' : 'Community member'}</small></span>
              </header>
              <div className="private-thread-messages">
                {messages.length ? messages.map((message) => <article key={message.id} className={`private-message ${message.userId === user?.id ? 'own' : ''}`}>
                  <div className="private-message-content">
                    <span className="private-message-sender">{message.userId === user?.id ? 'You' : message.name}</span>
                    <div className="private-message-bubble">
                      {message.forwarded && <span className="forwarded-label"><Forward size={12} /> Forwarded</span>}
                      {message.replyTo && <div className="private-message-reply-quote"><strong>Reply to {message.replyTo.name}</strong><span>{message.replyTo.message}</span></div>}
                      {message.message}
                    </div>
                    <div className="private-message-meta"><time>{new Intl.DateTimeFormat('en', { hour: 'numeric', minute: '2-digit' }).format(new Date(message.createdAt))}</time>
                      <button type="button" title="Reply to message" aria-label="Reply to private message" onClick={() => setReplyingTo(message)}><MessageSquareReply size={13} /></button>
                      <button type="button" title="Forward message" aria-label="Forward private message" onClick={() => setForwardingMessage(message)}><Forward size={13} /></button>
                      <button type="button" title="Delete for everyone" aria-label="Delete private message for everyone" disabled={pendingDeleteId === message.id} onClick={() => void deletePrivateMessage(message.id)}><Trash2 size={13} /></button>
                    </div>
                  </div>
                </article>) : <div className="conversation-empty">No messages here yet. Say hello to start the conversation.</div>}
                <div ref={endRef} />
              </div>
              {replyingTo && <div className="private-replying-to">
                <span><strong>Replying to {replyingTo.userId === user?.id ? 'yourself' : replyingTo.name}</strong><small>{replyingTo.message}</small></span>
                <button type="button" className="quiet-icon-button" aria-label="Cancel reply" onClick={() => setReplyingTo(null)}><X size={15} /></button>
              </div>}
              <form className="private-composer" onSubmit={sendPrivateMessage}>
                <input aria-label="Write a private message" placeholder={`Message ${activeConversation.name}…`} value={draft} maxLength={1000} onChange={(event) => setDraft(event.target.value)} />
                <button className="chat-send" type="submit" disabled={!draft.trim() || sending || connecting} aria-label="Send private message">{sending ? <LoaderCircle size={16} className="spin" /> : <Send size={16} />}</button>
              </form>
            </> : <div className="private-thread-placeholder"><span><Mail size={24} /></span><h2>Make it personal.</h2><p>Pick a conversation or choose a member to send a private message.</p></div>}
            <FieldError>{error}</FieldError>
            {notice && <span className="chat-action-notice" role="status">{notice}</span>}
          </section>
        </section>
      </div>
      {creatingGroup && <CreateGroupDialog members={members} onClose={() => setCreatingGroup(false)} onCreated={onGroupCreated} />}
      {forwardingMessage && <ForwardMessageDialog socket={socketRef.current} messageId={forwardingMessage.id} conversationId={forwardingMessage.conversationId} privateMessage onClose={() => setForwardingMessage(null)} onForwarded={(count) => setNotice(`Forwarded to ${count} ${count === 1 ? 'member' : 'members'}.`)} />}
    </>
  );
}
