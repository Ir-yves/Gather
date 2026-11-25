import { LanguageSelect, useDateFormat, useI18n, useTimeFormat } from './i18n';
import { useEffect, useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import type { Socket } from 'socket.io-client';
import {
  ArrowRight, ArrowUpRight, BookOpen, Camera, CameraOff, ChevronLeft, ChevronRight, CircleHelp, Clock3, Download, Eye, EyeOff,
  FileText, Forward, LoaderCircle, LockKeyhole, Mail, MessageSquareReply, Mic, MicOff,
  MoreHorizontal, Pause, Phone, PhoneOff, PictureInPicture2, Play, Radio, RotateCcw, RotateCw, Send, Shield, Maximize2, Minimize2, Sparkles, StepBack, StepForward, ThumbsUp, Trash2, UserPlus, Users, Video, VideoOff, Volume2, VolumeX, X
} from 'lucide-react';
import {
  LiveKitRoom, ParticipantTile, RoomAudioRenderer, TrackLoop, VideoTrack,
  useConnectionState, useLocalParticipant, useParticipants, useTracks
} from '@livekit/components-react';
import { ConnectionState, RoomEvent, Track } from 'livekit-client';
import { api, mediaUrl, socketUrl } from './api';
import type { ContentAsset, ContentItem, Stream, StreamReplay } from './api';
import { useAuth, useFormSubmit } from './auth';
import { Avatar } from './components';
import { useToast } from './toast';

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
  const { t } = useI18n();
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
      <div className="auth-topbar">
        <Link to="/" className="brand-lockup"><span className="brand-mark">g</span><span>gather<span className="brand-dot">.</span></span></Link>
        <div className="auth-topbar-actions">
          <span>{t('NEW TO GATHER?')} <Link to="/register">{t('Create account')} <ArrowUpRight size={13} /></Link></span>
          <LanguageSelect />
        </div>
      </div>
      <div className="auth-layout">
        <section className="auth-story">
          <div className="story-glow" />
          <div className="story-label"><span className="story-label-dot" /> {t('A LITTLE MORE TOGETHER')}</div>
          <div className="story-heading">{t('Good things')}<br />{t('happen')} <span>{t('here.')}</span></div>
          <p>{t('Your people, your ideas, your moment.')}<br />{t('Everything in one place.')}</p>
          <div className="story-spark"><Sparkles size={16} /><span>{t('Space to connect, grow, and go live.')}</span></div>
          <div className="auth-story-art" aria-hidden="true">
            <div className="art-ring art-ring-one" /><div className="art-ring art-ring-two" /><div className="art-orbit orbit-one" /><div className="art-orbit orbit-two" />
            <span className="art-node node-a" /><span className="art-node node-b" /><span className="art-node node-c" /><span className="art-node node-d" /><span className="art-node node-e" />
            <span className="art-label">{t('YOUR COMMUNITY')}<br />{t('IN ONE PLACE')}</span>
          </div>
          <div className="story-footnote">{t('MADE FOR THE MOMENTS THAT MATTER')}</div>
        </section>
        <section className="auth-form-side">
          <div className="auth-card">
            <div className="auth-card-icon"><span className="icon-spark">✳</span></div>
            <div className="eyebrow">{t('WELCOME BACK')}</div>
            <h1>{t('Come on in.')}</h1>
            <p className="auth-subtitle">{t('Your space is right where you left it.')}</p>
            <form onSubmit={submit} className="auth-form">
              <label className="field-label" htmlFor="login-email">{t('Email address')}</label>
              <div className="input-wrap"><Mail size={17} /><input id="login-email" type="email" placeholder={t('you@example.com')} autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></div>
              <div className="field-label-row"><label className="field-label" htmlFor="login-password">{t('Password')}</label><Link to="/forgot-password" className="text-link">{t('Forgot password?')}</Link></div>
              <div className="input-wrap"><LockKeyhole size={17} /><input id="login-password" type={showPassword ? 'text' : 'password'} placeholder={t('Enter your password')} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required /><button type="button" className="input-action" aria-label={showPassword ? t('Hide password') : t('Show password')} onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div>
              <FieldError>{error}</FieldError>
              <button className="button-primary auth-submit" type="submit" disabled={busy}>{busy ? <><LoaderCircle size={17} className="spin" /> {t('Signing you in…')}</> : <>{t('Sign in')} <ArrowRight size={16} /></>}</button>
            </form>
            <div className="auth-bottom">{t('New around here?')} <Link to="/register">{t('Create an account')} <ArrowUpRight size={13} /></Link></div>
            <div className="auth-privacy"><Shield size={13} /> {t('Your little corner of the internet, kept private.')}</div>
          </div>
        </section>
      </div>
      <footer className="auth-footer"><span>© 2026 gather &amp; yvex ltd.</span><span><a href="#privacy">{t('Privacy')}</a><a href="#terms">{t('Terms')}</a><span>{t('MADE WITH INTENTION ✳')}</span></span></footer>
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
  const { t } = useI18n();
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
      <div className="auth-topbar">
        <Link to="/" className="brand-lockup"><span className="brand-mark">g</span><span>gather<span className="brand-dot">.</span></span></Link>
        <div className="auth-topbar-actions">
          <span>{t('ALREADY ONE OF US?')} <Link to="/login">{t('Sign in')} <ArrowUpRight size={13} /></Link></span>
          <LanguageSelect />
        </div>
      </div>
      <div className="auth-layout">
        <section className="auth-story">
          <div className="story-glow" /><div className="story-label"><span className="story-label-dot" /> {t('FIND YOUR PEOPLE')}</div>
          <div className="story-heading">{t('Your next')}<br /><span>{t('thing starts')}</span><br />{t('here.')}</div>
          <p>{t('Good conversations. Big ideas.')}<br />{t('A community that gets you.')}</p>
          <div className="story-spark"><Sparkles size={16} /><span>{t('Come as you are. Find your people.')}</span></div>
          <div className="auth-story-art" aria-hidden="true"><div className="art-ring art-ring-one" /><div className="art-ring art-ring-two" /><div className="art-orbit orbit-one" /><div className="art-orbit orbit-two" /><span className="art-node node-a" /><span className="art-node node-b" /><span className="art-node node-c" /><span className="art-node node-d" /><span className="art-node node-e" /><span className="art-label">{t('FIND YOUR PEOPLE')}<br />{t('FIND YOUR PLACE')}</span></div>
          <div className="story-footnote">{t('MADE FOR THE MOMENTS THAT MATTER')}</div>
        </section>
        <section className="auth-form-side">
          <div className="auth-card register-card">
            <div className="auth-card-icon"><span className="icon-spark">✳</span></div><div className="eyebrow">{t('YOUR SPACE AWAITS')}</div><h1>{t('Let’s get started.')}</h1><p className="auth-subtitle">{t('It’s a little nicer in here with you.')}</p>
            <form onSubmit={submit} className="auth-form">
              <label className="field-label" htmlFor="register-name">{t('Your name')}</label><div className="input-wrap"><Users size={17} /><input id="register-name" placeholder={t('What should we call you?')} autoComplete="name" minLength={2} maxLength={100} value={name} onChange={(event) => setName(event.target.value)} required /></div>
              <label className="field-label" htmlFor="register-email">{t('Email address')}</label><div className="input-wrap"><Mail size={17} /><input id="register-email" type="email" placeholder={t('you@example.com')} autoComplete="email" maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} required /></div>
              <label className="field-label" htmlFor="register-password">{t('Password')} <span className="field-hint">{t('12 characters minimum')}</span></label><div className="input-wrap"><LockKeyhole size={17} /><input id="register-password" type={showPassword ? 'text' : 'password'} placeholder={t('Choose a strong password')} autoComplete="new-password" minLength={12} maxLength={128} value={password} onChange={(event) => setPassword(event.target.value)} required /><button type="button" className="input-action" aria-label={showPassword ? t('Hide password') : t('Show password')} onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div>
              <FieldError>{error}</FieldError><button className="button-primary auth-submit" type="submit" disabled={busy}>{busy ? <><LoaderCircle size={17} className="spin" /> {t('Creating your account…')}</> : <>{t('Find your space')} <ArrowRight size={16} /></>}</button>
            </form>
            <div className="auth-bottom">{t('By joining, you agree to our')} <a href="#terms">{t('community guidelines')}</a>.</div><div className="auth-privacy"><Shield size={13} /> {t('Your little corner of the internet, kept private.')}</div>
          </div>
        </section>
      </div>
      <footer className="auth-footer">
        <p>Developed by: Yvex && Chriss && Eva</p>
        <span>© 2026 gather &amp; IVO ltd.</span><span><a href="#privacy">{t('Privacy')}</a><a href="#terms">{t('Terms')}</a><span>{t('MADE WITH INTENTION ✳')}</span></span></footer>
    </div>
  );
}

function PasswordHelpLayout({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  return (
    <div className="auth-page">
      <div className="auth-topbar">
        <Link to="/" className="brand-lockup"><span className="brand-mark">g</span><span>gather<span className="brand-dot">.</span></span></Link>
        <div className="auth-topbar-actions">
          <span>{t('NEW TO GATHER?')} <Link to="/register">{t('Create account')} <ArrowUpRight size={13} /></Link></span>
          <LanguageSelect />
        </div>
      </div>
      <div className="auth-layout">
        <section className="auth-story">
          <div className="story-glow" />
          <div className="story-label"><span className="story-label-dot" /> {t('A LITTLE MORE TOGETHER')}</div>
          <div className="story-heading">{t('Good things')}<br />{t('happen')} <span>{t('here.')}</span></div>
          <p>{t('Your people, your ideas, your moment.')}<br />{t('Everything in one place.')}</p>
          <div className="story-spark"><Sparkles size={16} /><span>{t('Space to connect, grow, and go live.')}</span></div>
          <div className="auth-story-art" aria-hidden="true">
            <div className="art-ring art-ring-one" /><div className="art-ring art-ring-two" /><div className="art-orbit orbit-one" /><div className="art-orbit orbit-two" />
            <span className="art-node node-a" /><span className="art-node node-b" /><span className="art-node node-c" /><span className="art-node node-d" /><span className="art-node node-e" />
            <span className="art-label">{t('YOUR COMMUNITY')}<br />{t('IN ONE PLACE')}</span>
          </div>
          <div className="story-footnote">{t('MADE FOR THE MOMENTS THAT MATTER')}</div>
        </section>
        <section className="auth-form-side">{children}</section>
      </div>
      <p>Developed by: Yvex && Chriss && Eva</p>
      <footer className="auth-footer"><span>© 2026 gather &amp; IVO ltd.</span><span><a href="#privacy">{t('Privacy')}</a><a href="#terms">{t('Terms')}</a><span>{t('MADE WITH INTENTION ✳')}</span></span></footer>
    </div>
  );
}

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const { t } = useI18n();
  const { showToast } = useToast();

  const submit = useFormSubmit(async () => {
    setBusy(true);
    try {
      await api('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) });
      setSent(true);
      showToast(t('Password reset link sent.'));
    } finally {
      setBusy(false);
    }
  }, setError);

  return (
    <PasswordHelpLayout>
      <div className="auth-card">
        <div className="auth-card-icon"><span className="icon-spark">✳</span></div>
        <div className="eyebrow eyebrow-blue">{t('ACCOUNT RECOVERY')}</div>
        <h1>{t('Forgot your password?')}</h1>
        <p className="auth-subtitle">{t('No worries. Enter your email and we’ll send you a link to set a new password.')}</p>
        {sent ? (
          <div className="auth-notice" role="status">
            <Mail size={18} />
            <span>{t("If an account exists for that email, we've sent a password reset link.")}</span>
          </div>
        ) : (
          <form onSubmit={submit} className="auth-form">
            <label className="field-label" htmlFor="forgot-email">{t('Email address')}</label>
            <div className="input-wrap"><Mail size={17} /><input id="forgot-email" type="email" placeholder={t('you@example.com')} autoComplete="email" maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} required /></div>
            <FieldError>{error}</FieldError>
            <button className="button-primary auth-submit" type="submit" disabled={busy}>{busy ? <><LoaderCircle size={17} className="spin" /> {t('Sending…')}</> : <>{t('Send reset link')} <ArrowRight size={16} /></>}</button>
          </form>
        )}
        <div className="auth-bottom"><Link to="/login">{t('Back to sign in')} <ArrowRight size={13} /></Link></div>
        <div className="auth-privacy"><Shield size={13} /> {t('Your little corner of the internet, kept private.')}</div>
      </div>
    </PasswordHelpLayout>
  );
}

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const { t } = useI18n();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const submit = useFormSubmit(async () => {
    if (password !== confirmPassword) throw new Error(t('Passwords do not match.'));
    setBusy(true);
    try {
      await api('/auth/reset-password', { method: 'POST', body: JSON.stringify({ token, password }) });
      showToast(t('Your password has been reset.'));
      navigate('/login', { replace: true });
    } finally {
      setBusy(false);
    }
  }, setError);

  return (
    <PasswordHelpLayout>
      <div className="auth-card">
        <div className="auth-card-icon"><span className="icon-spark">✳</span></div>
        <div className="eyebrow eyebrow-blue">{t('SET NEW PASSWORD')}</div>
        <h1>{t('Choose a new password')}</h1>
        <p className="auth-subtitle">{t('Use at least 12 characters to keep your account safe.')}</p>
        {!token ? (
          <div className="auth-notice auth-notice-error" role="alert">
            <CircleHelp size={18} />
            <span>{t('This reset link is invalid or has expired. Please request a new one.')}</span>
          </div>
        ) : (
          <form onSubmit={submit} className="auth-form">
            <label className="field-label" htmlFor="reset-password">{t('New password')}</label>
            <div className="input-wrap"><LockKeyhole size={17} /><input id="reset-password" type={showPassword ? 'text' : 'password'} placeholder={t('Choose a strong password')} autoComplete="new-password" minLength={12} maxLength={128} value={password} onChange={(event) => setPassword(event.target.value)} required /><button type="button" className="input-action" aria-label={showPassword ? t('Hide password') : t('Show password')} onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div>
            <label className="field-label" htmlFor="reset-confirm">{t('Confirm new password')}</label>
            <div className="input-wrap"><LockKeyhole size={17} /><input id="reset-confirm" type={showPassword ? 'text' : 'password'} placeholder={t('Confirm new password')} autoComplete="new-password" minLength={12} maxLength={128} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required /></div>
            <FieldError>{error}</FieldError>
            <button className="button-primary auth-submit" type="submit" disabled={busy}>{busy ? <><LoaderCircle size={17} className="spin" /> {t('Resetting…')}</> : <>{t('Reset password')} <ArrowRight size={16} /></>}</button>
          </form>
        )}
        <div className="auth-bottom"><Link to="/forgot-password">{t('Request another link')}</Link> · <Link to="/login">{t('Back to sign in')}</Link></div>
        <div className="auth-privacy"><Shield size={13} /> {t('Your little corner of the internet, kept private.')}</div>
      </div>
    </PasswordHelpLayout>
  );
}

function useReplayStatusLabel() {
  const { t } = useI18n();
  return (replay: StreamReplay | null): string => {
    if (!replay) return t('Not available');
    if (replay.status === 'ready' && replay.playbackUrl) return t('Ready to watch');
    if (replay.status === 'recording') return t('Preparing…');
    if (replay.status === 'failed') return t('Recording failed');
    return t('Not available');
  };
}

function formatFileSize(size: number): string { if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`; return `${(size / (1024 * 1024)).toFixed(1)} MB`; } export function AdminHomePage() {
  const { t } = useI18n();
  const formatDate = useDateFormat();
  const replayStatusLabel = useReplayStatusLabel();
  const [stats, setStats] = useState<{
    users: number;
    content: number;
    views: number;
    likes: number;
    live: boolean;
    streamTitle: string | null;
  } | null>(null);
  const [lastReplay, setLastReplay] = useState<StreamReplay | null>(null);
  const [watchingReplay, setWatchingReplay] = useState<StreamReplay | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    Promise.all([
      api<{ users: Array<{ id: string; name: string; email: string; role: 'admin' | 'user'; active: boolean }> }>('/admin/users'),
      api<{ content: ContentItem[] }>('/admin/content'),
      api<{ stream: Stream | null }>('/stream'),
      api<{ views: number; likes: number }>('/admin/analytics/summary'),
      api<{ replays: StreamReplay[] }>('/stream/replays')
    ]).then(([usersResult, contentResult, streamResult, engagement, replayResult]) => {
      if (!active) return;
      setStats({
        users: usersResult.users.filter((user) => user.role === 'user' && user.active).length,
        content: contentResult.content.filter((item) => item.published).length,
        views: engagement.views,
        likes: engagement.likes,
        live: Boolean(streamResult.stream),
        streamTitle: streamResult.stream?.title ?? null
      });
      setLastReplay(replayResult.replays[0] ?? null);
      setError('');
    }).catch((reason: unknown) => {
      if (active) setError(reason instanceof Error ? reason.message : 'Unable to load dashboard metrics.');
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  if (loading) return <div className="screen-loading"><span className="spinner" /> {t('Loading dashboard…')}</div>;
  if (error) return <div className="empty-card"><h3>{t('Dashboard unavailable')}</h3><p>{error}</p></div>;

  return (
    <>
      <div className="admin-page">
        <section className="admin-welcome">
          <div className="admin-welcome-copy">
            <span className="eyebrow eyebrow-mint"><span className="eyebrow-dot" /> {t('ADMIN WORKSPACE')}</span>
            <h1>{t('Make good things happen.')}</h1>
            <p>{t('Keep your community connected with fresh updates, helpful resources, and live events.')}</p>
            <div className="admin-welcome-actions">
              <Link className="button-primary" to="/admin/content"><Sparkles size={16} /> {t('Create an update')}</Link>
              <Link className="admin-secondary-link" to="/admin/analytics"><Eye size={16} /> {t('See engagement')}</Link>
            </div>
          </div>
          <Link className={`admin-live-summary ${stats?.live ? 'is-live' : ''}`} to="/admin/live">
            <span className="admin-live-summary-icon"><Radio size={20} /></span>
            <span><small>{stats?.live ? t('ON AIR RIGHT NOW') : t('LIVESTREAM')}</small><strong>{stats?.live ? stats.streamTitle : t('Bring everyone together')}</strong><em>{stats?.live ? t('Manage your broadcast') : t('Start a community broadcast')}</em></span>
            <ArrowUpRight size={18} />
          </Link>
        </section>
        <div className="admin-metrics-grid">
          <MetricCard label={t('Active members')} value={String(stats?.users ?? 0)} trend={t('Enabled member accounts')} tone="mint" icon={<Users size={18} />} />
          <MetricCard label={t('Published updates')} value={String(stats?.content ?? 0)} trend={t('Visible to your community')} tone="blue" icon={<BookOpen size={18} />} />
          <MetricCard label={t('Unique views')} value={String(stats?.views ?? 0)} trend={t('Across posts, files, and live')} tone="amber" icon={<Eye size={18} />} />
          <MetricCard label={t('Community likes')} value={String(stats?.likes ?? 0)} trend={t('Across all community content')} tone="rose" icon={<ThumbsUp size={18} />} />
        </div>
        <div className="admin-quick-grid">
          <div className="admin-panel admin-highlight-panel"><div className="admin-panel-kicker">{t('YOUR COMMUNITY')}</div><h3>{t('A little progress, every day.')}</h3><p>{t('Share something useful, celebrate a member, or make space for the next great conversation.')}</p><div className="admin-highlight-links"><Link to="/admin/users"><Users size={16} /> {t('Manage members')} <ArrowUpRight size={14} /></Link><Link to="/admin/content"><BookOpen size={16} /> {t('Organize content')} <ArrowUpRight size={14} /></Link></div></div>
          <div className="admin-panel admin-actions-panel"><div><div className="admin-panel-kicker">{t('QUICK ACTIONS')}</div><h3>{t('What would you like to do?')}</h3></div><div className="action-stack"><Link className="action-button" to="/admin/analytics"><Eye size={17} /><span><strong>{t('Review views and likes')}</strong><small>{t('See what members are engaging with')}</small></span><ArrowUpRight size={15} /></Link><Link className="action-button" to="/admin/live"><Radio size={17} /><span><strong>{t('Manage livestream')}</strong><small>{t('Start or manage a broadcast')}</small></span><ArrowUpRight size={15} /></Link><Link className="action-button" to="/admin/content"><BookOpen size={17} /><span><strong>{t('Upload a document or video')}</strong><small>{t('Share a resource with members')}</small></span><ArrowUpRight size={15} /></Link></div></div>
        </div>
        {lastReplay && <section className="admin-panel last-replay-panel">
          <div className="section-heading-row">
            <div><div className="eyebrow eyebrow-rose">{t('LAST LIVESTREAM')}</div><h2>{lastReplay.title}</h2><p>{lastReplay.startedAt ? formatDate(lastReplay.startedAt) : t('Date unavailable')} · {replayStatusLabel(lastReplay)}</p></div>
            <div className="section-actions">
              {lastReplay.playbackUrl
                ? <button type="button" className="secondary-button" onClick={() => setWatchingReplay(lastReplay)}><Play size={15} /> {t('Watch replay')}</button>
                : <span className="member-pill">{replayStatusLabel(lastReplay)}</span>}
              <DeleteStreamButton streamId={lastReplay.id} title={lastReplay.title} onDeleted={() => {
                setLastReplay(null);
                setWatchingReplay((current) => current?.id === lastReplay.id ? null : current);
              }} />
            </div>
          </div>
        </section>}
      </div>
      {watchingReplay && <ReplayViewer replay={watchingReplay} onClose={() => setWatchingReplay(null)} />}
    </>
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
  const { t } = useI18n();
  const [items, setItems] = useState<AnalyticsItem[]>([]);
  const [filter, setFilter] = useState<'all' | AnalyticsType>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [showAllItems, setShowAllItems] = useState(false);

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
  const visibleItems = showAllItems ? filteredItems : filteredItems.slice(0, 3);
  const filters: Array<{ id: 'all' | AnalyticsType; label: string }> = [
    { id: 'all', label: t('All activity') },
    { id: 'content', label: t('Updates') },
    { id: 'document', label: t('Documents') },
    { id: 'video', label: t('Videos') },
    { id: 'stream', label: t('Livestreams') }
  ];

  return (
    <div className="admin-page">
      <div className="page-header">
        <div><div className="eyebrow eyebrow-mint">{t('COMMUNITY ENGAGEMENT')}</div><h1>{t('Views and likes.')}</h1><p>{t('See what members are viewing and who likes each item.')}</p></div>
        <button type="button" className="secondary-button analytics-refresh" onClick={() => void loadAnalytics()} disabled={refreshing}>
          <ArrowUpRight size={15} />{refreshing ? t('Refreshing…') : t('Refresh')}
        </button>
      </div>
      <div className="admin-metrics-grid">
        <MetricCard label={t('Unique item views')} value={String(totalViews)} trend={t('One view per member and item')} tone="blue" icon={<Eye size={18} />} />
        <MetricCard label={t('Likes')} value={String(totalLikes)} trend={t('Across updates, files, and streams')} tone="rose" icon={<ThumbsUp size={18} />} />
        <MetricCard label={t('Tracked items')} value={String(items.length)} trend={t('Recent activity')} tone="mint" icon={<BookOpen size={18} />} />
        <MetricCard label={t('Live now')} value={String(items.filter((item) => item.type === 'stream' && item.active).length)} trend={t('Active livestreams')} tone="amber" icon={<Radio size={18} />} />
      </div>
      <div className="analytics-filters" role="group" aria-label={t('Filter analytics by item type')}>
        {filters.map((option) => (
          <button key={option.id} type="button" className={filter === option.id ? 'analytics-filter active' : 'analytics-filter'} onClick={() => { setFilter(option.id); setShowAllItems(false); }}>
            {option.label}
          </button>
        ))}
      </div>
      {error && <FieldError>{error}</FieldError>}
      {loading
        ? <div className="screen-loading"><span className="spinner" /> {t('Loading engagement…')}</div>
        : filteredItems.length
          ? <>
            <div className="analytics-list">
              {visibleItems.map((item) => <AnalyticsItemCard key={`${item.type}-${item.id}`} item={item} />)}
            </div>
            {filteredItems.length > 3 && <ShowMoreButton expanded={showAllItems} onClick={() => setShowAllItems((value) => !value)} label={t('activity items')} />}
          </>
          : <div className="empty-card"><h3>{t('No activity to show yet.')}</h3><p>{t('Views and likes will appear here as members explore the community.')}</p></div>}
    </div>
  );
}

function AnalyticsItemCard({ item }: { item: AnalyticsItem }) {
  const { t } = useI18n();
  const formatDate = useDateFormat();
  const [showAllLikers, setShowAllLikers] = useState(false);
  const visibleLikers = showAllLikers ? item.likers : item.likers.slice(0, 3);
  const typeLabel = {
    content: t('Community update'),
    document: t('Document'),
    video: t('Video'),
    stream: t('Livestream')
  }[item.type];
  return (
    <article className="admin-panel analytics-item">
      <header className="analytics-item-heading">
        <div>
          <span className={`analytics-type analytics-type-${item.type}`}>{typeLabel}</span>
          <h2>{item.title}</h2>
          {item.parentTitle && <p>{t('Attached to')} <strong>{item.parentTitle}</strong></p>}
        </div>
        <span className={`member-pill ${item.type === 'stream' ? (item.active ? 'active' : 'inactive') : (item.published ? 'active' : 'inactive')}`}>
          {item.type === 'stream' ? (item.active ? t('Live now') : t('Ended')) : (item.published ? t('Published') : t('Draft'))}
        </span>
      </header>
      <div className="analytics-item-stats">
        <span><Eye size={16} /><strong>{item.views}</strong> {t('unique views')}</span>
        <span><ThumbsUp size={16} /><strong>{item.likes}</strong> {t('likes')}</span>
        {item.createdAt && <small>{formatDate(item.createdAt)}</small>}
      </div>
      <div className="analytics-likers">
        <h3>{t('Members who liked this')}</h3>
        {item.likers.length
          ? <><ul>{visibleLikers.map((member) => <li key={member.id}><Avatar name={member.name} small /><span><strong>{member.name}</strong><small>{member.email}</small></span></li>)}</ul>
            {item.likers.length > 3 && <ShowMoreButton expanded={showAllLikers} onClick={() => setShowAllLikers((value) => !value)} label={t('members')} compact />}</>
          : <p>{t('No likes yet.')}</p>}
      </div>
    </article>
  );
}

function ShowMoreButton({ expanded, onClick, label, compact = false }: { expanded: boolean; onClick: () => void; label: string; compact?: boolean }) {
  const { t } = useI18n();
  return <button type="button" className={`show-more-button ${compact ? 'compact' : ''}`} aria-expanded={expanded} onClick={onClick}>
    <MoreHorizontal size={17} />{expanded ? t('Show less') : t('See more {label}', { label })}
  </button>;
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
  const { t } = useI18n();
  const { user } = useAuth();
  const { showToast } = useToast();
  const formatDate = useDateFormat();
  const replayStatusLabel = useReplayStatusLabel();
  const [items, setItems] = useState<ContentItem[]>([]);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [published, setPublished] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [showAllContent, setShowAllContent] = useState(false);
  const [lastReplay, setLastReplay] = useState<StreamReplay | null>(null);
  const [watchingReplay, setWatchingReplay] = useState<StreamReplay | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([
      api<{ content: ContentItem[] }>('/admin/content'),
      api<{ replays: StreamReplay[] }>('/stream/replays')
    ]).then(([contentResult, replayResult]) => {
      if (!active) return;
      setItems(contentResult.content);
      setLastReplay(replayResult.replays[0] ?? null);
      setError('');
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
        published,
        createdAt: now,
        updatedAt: now,
        authorName: t('You'),
        authorAvatarUrl: user?.avatarUrl ?? null,
        likesCount: 0,
        liked: false,
        assets: result.assets
      }, ...previous]);
      setTitle('');
      setBody('');
      setFiles([]);
      setPublished(true);
      const fileInput = document.getElementById('content-files') as HTMLInputElement | null;
      if (fileInput) fileInput.value = '';
      showToast(t('Your update has been saved.'));
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
      showToast(t('The update has been deleted.'));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to delete this update.');
    }
  }

  return (
    <>
      <div className="admin-page">
        <div className="page-header"><div><div className="eyebrow eyebrow-mint">{t('CONTENT')}</div><h1>{t('Manage community updates.')}</h1></div></div>
        <div className="admin-split-grid">
          <form className="admin-panel form-panel" onSubmit={submit}>
            <h3>{t('Create article')}</h3>
            <label className="field-label">{t('Title')}<input value={title} onChange={(event) => setTitle(event.target.value)} placeholder={t('New update headline')} required maxLength={180} /></label>
            <label className="field-label">{t('Body')}<textarea value={body} onChange={(event) => setBody(event.target.value)} placeholder={t('Share what matters most…')} rows={6} required maxLength={20000} /></label>
            <label className="field-label upload-field" htmlFor="content-files">{t('Documents and videos')}
              <input id="content-files" type="file" multiple accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.rtf,.mp4,.webm" onChange={(event) => setFiles(Array.from(event.currentTarget.files ?? []))} />
              <small>{t('PDF, Office, TXT, RTF, MP4, or WebM · up to 5 files · 100 MB each')}</small>
            </label>
            {files.length > 0 && <ul className="selected-files">{files.map((file, index) => <li key={`${file.name}-${index}`}><FileText size={15} /><span>{file.name} · {formatFileSize(file.size)}</span><button type="button" className="text-icon-button" aria-label={`Remove ${file.name}`} onClick={() => setFiles((previous) => previous.filter((_, fileIndex) => fileIndex !== index))}><X size={15} /></button></li>)}</ul>}
            <label className="check-row"><input type="checkbox" checked={published} onChange={(event) => setPublished(event.target.checked)} /> {t('Publish immediately')}</label>
            <FieldError>{error}</FieldError>
            <button className="button-primary" type="submit" disabled={busy}>{busy ? t('Uploading…') : t('Save update')}</button>
          </form>
          <div className="admin-panel list-panel">
            <h3>{t('Recent updates')}</h3>
            {loading ? <div className="screen-loading small"><span className="spinner" /> {t('Loading…')}</div> : items.length === 0 && !lastReplay ? <div className="empty-card small"><p>{t('No updates yet.')}</p></div> : <>
              <div className="admin-list">
                {lastReplay && <div className="list-row replay-update-row"><div><strong>{t('Livestream replay · {title}', { title: lastReplay.title })}</strong><small>{lastReplay.startedAt ? formatDate(lastReplay.startedAt) : t('Date unavailable')} · {replayStatusLabel(lastReplay)}</small></div><div className="section-actions">{lastReplay.playbackUrl
                  ? <button type="button" className="text-icon-button" onClick={() => setWatchingReplay(lastReplay)}><Play size={14} /> {t('Watch')}</button>
                  : <span className="member-pill">{replayStatusLabel(lastReplay)}</span>}
                  <DeleteStreamButton streamId={lastReplay.id} title={lastReplay.title} compact onDeleted={() => {
                    setLastReplay(null);
                    setWatchingReplay((current) => current?.id === lastReplay.id ? null : current);
                  }} />
                </div></div>}
                {(showAllContent ? items : items.slice(0, 3)).map((item) => <div className="list-row" key={item.id}><div><strong>{item.title}</strong><small>{item.published ? t('Published') : t('Draft')} · {formatDate(item.createdAt)} · {item.assets.length} {t('attachments')}</small></div><button type="button" className="danger-button" onClick={() => void remove(item.id)}>{t('Delete')}</button></div>)}
              </div>
              {items.length > 3 && <ShowMoreButton expanded={showAllContent} onClick={() => setShowAllContent((value) => !value)} label={t('updates')} />}
            </>}
          </div>
        </div>
      </div>
      {watchingReplay && <ReplayViewer replay={watchingReplay} onClose={() => setWatchingReplay(null)} />}
    </>
  );
}

export function AdminUsersPage() {
  const { t } = useI18n();
  const { showToast } = useToast();
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
    showToast(t('Member access has been updated.'));
  }

  return (
    <div className="admin-page">
      <div className="page-header"><div><div className="eyebrow eyebrow-mint">{t('USERS')}</div><h1>{t('Manage members.')}</h1></div></div>
      {loading ? <div className="screen-loading small"><span className="spinner" /> {t('Loading members…')}</div> : <div className="admin-panel list-panel"><FieldError>{error}</FieldError><div className="admin-list">
        {users.map((user) => <div className="member-row" key={user.id}><div><strong>{user.name}</strong><small>{user.email}</small></div><div className="member-actions"><span className={`member-pill ${user.active ? 'active' : 'inactive'}`}>{user.active ? t('Active') : t('Inactive')}</span><select value={user.role} onChange={(event) => void toggleUser(user.id, event.target.value as 'admin' | 'user', user.active)}><option value="user">{t('User')}</option><option value="admin">{t('Admin')}</option></select><button type="button" className="secondary-button" onClick={() => void toggleUser(user.id, user.role, !user.active)}>{user.active ? t('Disable') : t('Enable')}</button></div></div>)}
      </div></div>}
    </div>
  );
}

export function AdminLivePage() {
  const { t } = useI18n();
  const { showToast } = useToast();
  const formatDate = useDateFormat();
  const replayStatusLabel = useReplayStatusLabel();
  const [title, setTitle] = useState('');
  const [stream, setStream] = useState<Stream | null>(null);
  const [livekitUrl, setLivekitUrl] = useState('');
  const [recordingEnabled, setRecordingEnabled] = useState(false);
  const [publisherToken, setPublisherToken] = useState('');
  const [broadcastConnected, setBroadcastConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [previousStreams, setPreviousStreams] = useState<Array<{ id: string; title: string; createdAt: string | null; active?: boolean; views: number; likes: number }>>([]);
  const [showAllPreviousStreams, setShowAllPreviousStreams] = useState(false);
  const [replays, setReplays] = useState<StreamReplay[]>([]);
  const [watchingReplay, setWatchingReplay] = useState<StreamReplay | null>(null);
  useEffect(() => {
    let active = true;
    void api<{ items: Array<{ id: string; type: string; title: string; createdAt: string | null; active?: boolean; views: number; likes: number }> }>('/admin/analytics')
      .then((result) => { if (active) setPreviousStreams(result.items.filter((item) => item.type === 'stream')); })
      .catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : 'Unable to load previous livestreams.'); });
    void api<{ replays: StreamReplay[] }>('/stream/replays')
      .then((result) => { if (active) setReplays(result.replays); })
      .catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : 'Unable to load livestream replays.'); });
    void api<{ stream: Stream | null; livekitUrl: string; recordingEnabled: boolean }>('/stream').then(async (result) => {
      if (!active) return;
      setStream(result.stream);
      setLivekitUrl(result.livekitUrl);
      setRecordingEnabled(result.recordingEnabled);
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
      const current = await api<{ stream: Stream | null; livekitUrl: string; recordingEnabled: boolean }>('/stream');
      if (!current.stream) throw new Error('The livestream room was not created. Please try again.');
      setStream(current.stream);
      setLivekitUrl(current.livekitUrl);
      setRecordingEnabled(current.recordingEnabled);
      setTitle('');
      const token = await api<{ token: string }>('/stream/token', { method: 'POST' });
      setPublisherToken(token.token);
      showToast(t('The livestream has started.'));
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
      showToast(t('The livestream has ended.'));
      void api<{ replays: StreamReplay[] }>('/stream/replays').then((result) => setReplays(result.replays)).catch(() => { });
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
      const current = await api<{ stream: Stream | null; livekitUrl: string; recordingEnabled: boolean }>('/stream');
      if (!current.stream) throw new Error('There is no active livestream to connect to.');
      const result = await api<{ token: string }>('/stream/token', { method: 'POST' });
      setStream(current.stream);
      setLivekitUrl(current.livekitUrl);
      setRecordingEnabled(current.recordingEnabled);
      setPublisherToken(result.token);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to connect to the livestream.');
    } finally {
      setBusy(false);
    }
  }

  const replayById = new Map(replays.map((replay) => [replay.id, replay]));
  const archive = previousStreams.map((item) => ({ ...item, replay: replayById.get(item.id) ?? null }));
  const lastStream = archive.find((item) => !item.active) ?? archive[0] ?? null;

  return (
    <>
      <div className="admin-page">
        <div className="page-header"><div><div className="eyebrow eyebrow-mint">{t('LIVE')}</div><h1>{t('Manage the livestream.')}</h1></div></div>
        <div className="admin-split-grid">
          <form className="admin-panel form-panel" onSubmit={startStream}>
            <h3>{stream ? t('You’re hosting live') : t('Start a livestream')}</h3>
            {!stream && <label className="field-label">{t('Session title')}<input value={title} onChange={(event) => setTitle(event.target.value)} placeholder={t('Community AMA / Q&A / Training')} required maxLength={180} /> </label>}
            {stream && <p className="broadcast-help">{t('Keep this page open while you’re broadcasting. Members can join from their community page.')}</p>}
            {!recordingEnabled && <p className="recording-notice" role="status">{t('Replay recording is off. Configure recording storage to save this livestream for later playback.')}</p>}
            <FieldError>{error}</FieldError>
            {!stream
              ? <button className="button-primary" type="submit" disabled={busy || loading}>{busy ? t('Starting…') : t('Start livestream')}</button>
              : <button className="danger-button" type="button" onClick={() => void endStream()} disabled={busy}>{busy ? t('Ending…') : t('End livestream for everyone')}</button>}
          </form>
          <div className="admin-panel list-panel">
            <h3>{t('Current status')}</h3>
            {loading ? <div className="screen-loading small"><span className="spinner" /> {t('Checking…')}</div> : stream ? <div className="live-status-box"><span className="live-pill">{t('LIVE NOW')}</span><strong>{stream.title}</strong><small>{t('Live room is ready for members.')}</small></div> : <div className="empty-card small"><p>{t('No active livestream.')}</p></div>}
          </div>
        </div>
        {stream && <section className="admin-panel broadcaster-panel">
          <div className="section-heading-row broadcaster-heading">
            <div><div className="eyebrow eyebrow-blue">{t('BROADCAST')}</div><h2>{stream.title}</h2><p>{broadcastConnected ? t('Your camera and microphone are streaming to members.') : t('Connecting your camera and microphone. Your browser may ask for permission.')}</p></div>
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
                setError(`${kind ?? t('Camera or microphone')} is unavailable (${failure ?? t('unknown issue')}). Check the device connection and browser permissions.`);
              }}
              className="broadcaster-room"
            >
              <div className="broadcaster-stage"><StreamTiles /><RoomAudioRenderer /></div>
              <BroadcasterControls />
              <LiveAttendeeCount />
            </LiveKitRoom>
            : <div className="empty-card small"><p>{t('Broadcaster is not connected. You can retry the connection.')}</p><button className="button-primary" type="button" onClick={() => void reconnectPublisher()} disabled={busy}>{busy ? 'Connecting…' : t('Connect broadcaster')}</button></div>}
        </section>}
        <section className="admin-panel last-stream-panel">
          <div className="section-heading-row">
            <div><div className="eyebrow eyebrow-rose">{t('MOST RECENT SESSION')}</div><h2>{t('Last livestream')}</h2><p>{t('Details and replay for the latest community broadcast.')}</p></div>
            {!loading && lastStream && <div className="section-actions">
              {lastStream.replay?.playbackUrl
                ? <button type="button" className="button-primary" onClick={() => { if (lastStream.replay) setWatchingReplay(lastStream.replay); }}><Play size={15} /> {t('Watch replay')}</button>
                : <span className="member-pill">{replayStatusLabel(lastStream.replay)}</span>}
              <DeleteStreamButton streamId={lastStream.id} title={lastStream.title} onDeleted={() => {
                setPreviousStreams((items) => items.filter((item) => item.id !== lastStream.id));
                setReplays((items) => items.filter((item) => item.id !== lastStream.id));
                setWatchingReplay((current) => current?.id === lastStream.id ? null : current);
              }} />
            </div>}
          </div>
          {loading ? <div className="screen-loading small"><span className="spinner" /> {t('Loading last session…')}</div> : lastStream ? <div className="last-stream-info">
            <div><span className="field-label">{t('Session')}</span><strong>{lastStream.title}</strong></div>
            <div><span className="field-label">{t('When')}</span><strong>{lastStream.createdAt ? formatDate(lastStream.createdAt) : t('Date unavailable')}</strong></div>
            <div><span className="field-label">{t('Engagement')}</span><strong>{lastStream.views} {lastStream.views === 1 ? t('view') : t('views')} · {lastStream.likes} {lastStream.likes === 1 ? t('like') : t('likes')}</strong></div>
            <div><span className="field-label">{t('Replay')}</span><strong>{replayStatusLabel(lastStream.replay)}</strong></div>
          </div> : <div className="empty-card small"><p>{t('No livestreams yet. Completed sessions will appear here.')}</p></div>}
        </section>
        <section className="admin-panel list-panel livestream-history">
          <div className="section-heading-row"><div><div className="eyebrow eyebrow-purple">{t('LIVESTREAM ARCHIVE')}</div><h2>{t('Previous livestreams')}</h2><p>{t('Review past sessions and their member engagement.')}</p></div></div>
          {loading ? <div className="screen-loading small"><span className="spinner" /> {t('Loading history…')}</div> : archive.length ? <div className="admin-list">
            {(showAllPreviousStreams ? archive : archive.slice(0, 3)).map((item) => <div className="member-row" key={item.id}>
              <div><strong>{item.title}</strong><small>{item.createdAt ? `${formatDate(item.createdAt)} · ${item.active ? t('In progress') : t('Ended')}` : item.active ? t('In progress') : t('Date unavailable')}</small></div>
              <div className="member-actions"><span className="member-pill">{item.views} {item.views === 1 ? t('view') : t('views')}</span><span className="member-pill">{item.likes} {item.likes === 1 ? t('like') : t('likes')}</span>{item.replay?.playbackUrl && <button type="button" className="text-icon-button" onClick={() => { if (item.replay) setWatchingReplay(item.replay); }}><Play size={14} /> {t('Watch')}</button>}
                <DeleteStreamButton streamId={item.id} title={item.title} compact onDeleted={() => {
                  setPreviousStreams((items) => items.filter((stream) => stream.id !== item.id));
                  setReplays((items) => items.filter((replay) => replay.id !== item.id));
                  setWatchingReplay((current) => current?.id === item.id ? null : current);
                }} />
              </div>
            </div>)}
          </div> : <div className="empty-card small"><p>{t('No previous livestreams yet. Completed sessions will appear here.')}</p></div>}
          {!loading && archive.length > 3 && <ShowMoreButton expanded={showAllPreviousStreams} onClick={() => setShowAllPreviousStreams((value) => !value)} label={t('livestreams')} />}
        </section>
      </div>
      {watchingReplay && <ReplayViewer replay={watchingReplay} onClose={() => setWatchingReplay(null)} />}
    </>
  );
}

export function MemberPage() {
  const { user, siteSettings } = useAuth();
  const { t } = useI18n();
  const formatDate = useDateFormat();
  const [content, setContent] = useState<ContentItem[]>([]);
  const [stream, setStream] = useState<Stream | null>(null);
  const [replays, setReplays] = useState<StreamReplay[]>([]);
  const [showAllUpdates, setShowAllUpdates] = useState(false);
  const [livekitUrl, setLivekitUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([
      api<{ content: ContentItem[] }>('/content'),
      api<{ stream: Stream | null; livekitUrl: string }>('/stream'),
      api<{ replays: StreamReplay[] }>('/stream/replays')
    ]).then(([contentResult, streamResult, replayResult]) => {
      if (!active) return;
      setContent(contentResult.content);
      setStream(streamResult.stream);
      setLivekitUrl(streamResult.livekitUrl);
      setReplays(replayResult.replays);
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
      void api<{ replays: StreamReplay[] }>('/stream/replays').then((result) => {
        if (active) setReplays(result.replays);
      }).catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : 'Unable to refresh livestream replays.');
      });
    };
    const intervalId = window.setInterval(refreshStream, 10000);
    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, []);

  const greetingName = user?.name.split(/\s+/)[0] ?? t('there');
  return (
    <div className="member-dashboard">
      <div className="member-welcome">
        <div className="welcome-copy">
          <span className="eyebrow eyebrow-mint"><span className="eyebrow-dot" /> {t('YOUR COMMUNITY SPACE')}</span>
          <h1>{t('Good to see you,')}<br /><span>{greetingName}.</span></h1>
          <p>{siteSettings.welcomeMessage}</p>
          <a className="button-dark" href="#updates">{t('Explore your space')} <ArrowRight size={15} /></a>
        </div>
        <div className="welcome-art" aria-hidden="true"><div className="welcome-art-disc" /><div className="welcome-art-sun" /><div className="welcome-art-arc" /><div className="welcome-art-orbit"><span /><i /><b /></div><div className="welcome-art-badge"><span>✳</span> {t('GOOD TO')}<br />{t('HAVE YOU HERE')}</div><div className="welcome-art-caption">{t('ALL THE GOOD')}<br />{t('THINGS, IN ONE PLACE')}</div></div>
      </div>
      <section className="member-stats" aria-label={t('Community shortcuts')}>
        <a className="member-stat" href="#updates">
          <span className="stat-icon mint"><Sparkles size={18} /></span>
          <span><strong>{content.length} {content.length === 1 ? t('community update') : t('community updates')}</strong><small>{content[0]?.title ?? t('Catch up on the latest from your community.')}</small></span>
          <ArrowUpRight className="stat-arrow" size={17} />
        </a>
        <Link className="member-stat" to="/app/messages">
          <span className="stat-icon lavender"><Mail size={18} /></span>
          <span><strong>{t('Messages')}</strong><small>{t('Your private conversations.')}</small></span>
          <ArrowUpRight className="stat-arrow" size={17} />
        </Link>
        <a className={`member-stat ${stream ? 'member-stat-live' : ''}`} href="#community-live">
          <span className={`stat-icon ${stream ? 'live-stat-icon' : 'amber'}`}>{stream ? <Radio size={18} /> : <Video size={18} />}</span>
          <span><strong>{stream ? t('Live now') : t('Livestream')}</strong><small>{stream ? stream.title : t('Check in for the next community event.')}</small></span>
          {stream ? <i className="status-dot status-live" /> : <ArrowUpRight className="stat-arrow" size={17} />}
        </a>
      </section>
      <div className="member-columns">
        <section className="updates-section" id="updates">
          <div className="section-heading-row"><div><div className="eyebrow eyebrow-mint">{t('THE LATEST')}</div><h2>{t('Community updates')}</h2><p>{t('Fresh from the community, just for you.')}</p></div><span className="updates-count">{content.length} {content.length === 1 ? t('update') : t('updates')}</span></div>
          <FieldError>{error}</FieldError>
          {loading && <div className="empty-card"><span className="spinner" /><p>{t('Finding the latest updates…')}</p></div>}
          {!loading && content.length === 0 && <div className="empty-card"><span className="empty-illustration"><Sparkles size={23} /></span><h3>{t('A little quiet for now.')}</h3><p>{t('Your community’s next update will show up right here.')}</p></div>}
          <div className="update-list">
            {(showAllUpdates ? content : content.slice(0, 3)).map((item) => (
              <article className="update-card" key={item.id}>
                <div className="update-content"><div className="update-meta"><span className="update-tag"><span /> {t('COMMUNITY NOTE')}</span><span className="update-date"><Clock3 size={13} /> {formatDate(item.createdAt)}</span></div><h3>{item.title}</h3><p>{item.body}</p>
                  {item.assets.length > 0 && <div className="update-assets">{item.assets.map((asset) => <ContentAttachment key={asset.id} asset={asset} />)}</div>}
                  <div className="update-card-footer"><Avatar name={item.authorName} small src={item.authorAvatarUrl} /><span>{t('Shared by')} <strong>{item.authorName}</strong></span><LikeButton type="content" targetId={item.id} likesCount={item.likesCount} liked={item.liked} /><span className="update-footer-spacer" /></div></div>
              </article>
            ))}
          </div>
          {content.length > 3 && <ShowMoreButton expanded={showAllUpdates} onClick={() => setShowAllUpdates((value) => !value)} label={t('updates')} />}
        </section>
        <aside className="member-rail">
          <StreamCard stream={stream} livekitUrl={livekitUrl} />
          <ReplayPlayer replays={replays} />
          <div className="member-rail-note"><CircleHelp size={15} /><span>{t('Good spaces are built together.')}</span><a href="#about" aria-label={t('About this community')}><ArrowUpRight size={14} /></a></div>
        </aside>
      </div>
    </div>
  );
}

function ContentAttachment({ asset }: { asset: ContentAsset }) {
  const { t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const downloadUrl = mediaUrl(`${asset.url}?download=1`);
  const isVideo = asset.category === 'video';

  return (
    <>
      <div className="asset-download">
        {isVideo ? <Video size={18} /> : <FileText size={18} />}
        <span><strong>{asset.name}</strong><small>{formatFileSize(asset.sizeBytes)}</small></span>
        <button
          type="button"
          className="text-icon-button"
          aria-expanded={isVideo ? isPlaying : undefined}
          onClick={() => (isVideo ? setIsPlaying((value) => !value) : setIsOpen(true))}
        >
          {isVideo ? (isPlaying ? t('Hide') : t('Watch')) : t('Open')}
        </button>
        <LikeButton type="asset" targetId={asset.id} likesCount={asset.likesCount} liked={asset.liked} compact />
        <a className="asset-download-link" href={downloadUrl} download={asset.name} aria-label={`Download ${asset.name}`}><Download size={17} /></a>
      </div>
      {isVideo && isPlaying && (
        <video className="update-video" controls autoPlay playsInline src={mediaUrl(asset.url)} aria-label={asset.name}>
          {t('Your browser does not support video playback.')}
        </video>
      )}
      {isOpen && <AttachmentViewer asset={asset} onClose={() => setIsOpen(false)} />}
    </>
  );
}

function LikeButton({ type, targetId, likesCount, liked, compact = false }: { type: 'content' | 'asset' | 'stream'; targetId: string; likesCount: number; liked: boolean; compact?: boolean; }) {
  const { t } = useI18n();
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
        aria-label={`${reaction.liked ? t('Unlike') : t('Like')} (${reaction.likesCount} ${t('likes')})`}
        aria-pressed={reaction.liked}
        title={reaction.liked ? t('Unlike') : t('Like')}
        onClick={() => void toggleLike()}
        disabled={pending}
      >
        <ThumbsUp size={15} fill={reaction.liked ? 'currentColor' : 'none'} />
        <span>{reaction.liked ? t('Unlike') : t('Like')}</span>
        <span className="like-count">{reaction.likesCount}</span>
      </button>
      {error && <span className="like-error" role="alert">{error}</span>}
    </span>
  );
}

function AttachmentViewer({ asset, onClose }: { asset: ContentAsset; onClose: () => void }) {
  const { t } = useI18n();
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
          <div><span className="eyebrow eyebrow-mint">{isVideo ? t('VIDEO') : t('DOCUMENT')}</span><h2 id="attachment-viewer-title">{asset.name}</h2></div>
          <div className="attachment-viewer-actions">
            <a className="secondary-button" href={mediaUrl(`${asset.url}?download=1`)}><Download size={15} /> {t('Download')}</a>
            <button type="button" className="text-icon-button" aria-label={t('Close preview')} onClick={onClose}><X size={18} /></button>
          </div>
        </header>
        <div className="attachment-viewer-body">
          {isVideo && <video controls autoPlay preload="metadata" src={mediaUrl(asset.url)} aria-label={asset.name} />}
          {isPdf && <iframe title={asset.name} src={mediaUrl(asset.url)} />}
          {(isText || isWordDocument) && (loading
            ? <div className="empty-card"><span className="spinner" /><p>{t('Opening document…')}</p></div>
            : error ? <div className="empty-card"><p>{error}</p></div> : <pre className="document-text-preview">{text}</pre>)}
          {!isVideo && !isPdf && !isText && !isWordDocument && <div className="document-open-fallback">
            <FileText size={30} />
            <h3>{t('This file needs a compatible document app to preview.')}</h3>
            <p>{t('Download it to open it with a document viewer on your device.')}</p>
            <a className="button-primary" href={mediaUrl(`${asset.url}?download=1`)}><Download size={16} /> {t('Download and open')}</a>
          </div>}
        </div>
      </section>
    </div>
  );
}

function StreamCard({ stream, livekitUrl }: { stream: Stream | null; livekitUrl: string }) {
  const { t } = useI18n();
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
          <span className="rail-eyebrow"><span className="live-pulse" /> {t('LIVE RIGHT NOW')}</span>
          <div className="live-viewer-actions">
            <button type="button" className="quiet-icon-button" onClick={() => setExpanded((value) => !value)} aria-label={expanded ? t('Minimize livestream') : t('Expand livestream')} title={expanded ? t('Minimize') : t('Expand')}>
              {expanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
            <button type="button" className="quiet-icon-button" onClick={() => { setActive(false); setExpanded(false); setToken(''); }} aria-label={t('Close stream')} title={t('Close stream')}><X size={16} /></button>
          </div>
        </div>
        <h3>{stream.title}</h3>
        <LikeButton type="stream" targetId={stream.id} likesCount={stream.likesCount} liked={stream.liked} />
        {token && <LiveKitRoom token={token} serverUrl={livekitUrl} connect className="livekit-shell" onConnected={() => { void recordStreamView(); }} onError={(reason) => setError(`Unable to connect to the livestream: ${reason.message}`)}><div className="livekit-attendee-bar"><LiveAttendeeCount /></div><MemberStreamControls expanded={expanded} onToggleExpanded={() => setExpanded((value) => !value)} /></LiveKitRoom>}
        <button className="stream-leave-button" onClick={() => { setActive(false); setExpanded(false); setToken(''); }}>{t('Leave livestream')} <ArrowUpRight size={14} /></button>
        <FieldError>{error}</FieldError>
      </section>
    </div>
  );

  return (
    <section className="rail-card stream-card" id="community-live">
      <div className="rail-card-head"><span className="rail-eyebrow"><Radio size={13} /> {t('LIVE FROM THE COMMUNITY')}</span><span className={stream ? 'stream-status is-live' : 'stream-status'}><i />{stream ? t('LIVE') : t('OFFLINE')}</span></div>
      <div className={`stream-art ${stream ? 'stream-art-live' : ''}`}><div className="stream-art-center"><span>{stream ? <Radio size={25} /> : <Video size={25} />}</span><i /><b /></div><span className="stream-art-orbit so-a" /><span className="stream-art-orbit so-b" /><span className="stream-art-spark">✳</span></div>
      {stream ? <><span className="stream-card-tag"><span className="live-pulse" /> {t('HAPPENING NOW')}</span><h3>{stream.title}</h3><p>{t('Drop in, say hello, and join the conversation live.')}</p><div className="stream-actions-row"><button className="button-primary stream-join-button" onClick={() => void join()} disabled={busy}>{busy ? <><LoaderCircle size={15} className="spin" /> {t('Joining…')}</> : <>{t('Join the live room')} <ArrowRight size={15} /></>}</button><LikeButton type="stream" targetId={stream.id} likesCount={stream.likesCount} liked={stream.liked} /></div><FieldError>{error}</FieldError></> : <><h3>{t('A moment, together.')}</h3><p>{t('When your community goes live, you’ll find a seat right here.')}</p><span className="stream-empty-note"><span className="stream-empty-icon"><Sparkles size={14} /></span>{t('Good things are on the way')}</span></>}
    </section>
  );
}

const FRAME_SECONDS = 1 / 30;

function formatTimecode(seconds: number): string { if (!Number.isFinite(seconds)) return '00:00.000'; const safe = Math.max(0, seconds); const minutes = Math.floor(safe / 60); const secs = Math.floor(safe % 60); const ms = Math.floor((safe % 1) * 1000); return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(ms).padStart(3, '0')}`; } function PreciseReplayVideo({ replay, className, autoPlay = false }: { replay: StreamReplay; className?: string; autoPlay?: boolean; }) {
  const { t } = useI18n();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playing, setPlaying] = useState(false);

  function sync() {
    const video = videoRef.current;
    if (!video) return;
    setCurrent(video.currentTime);
    setDuration(Number.isFinite(video.duration) ? video.duration : 0);
    setPlaying(!video.paused && !video.ended);
  }

  function seekBy(delta: number) {
    const video = videoRef.current;
    if (!video) return;
    const max = Number.isFinite(video.duration) ? video.duration : 0;
    video.currentTime = Math.min(max || Number.MAX_SAFE_INTEGER, Math.max(0, video.currentTime + delta));
    setCurrent(video.currentTime);
  }

  async function togglePlayback() {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) await video.play();
    else video.pause();
    sync();
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      seekBy((event.key === 'ArrowLeft' ? -1 : 1) * (event.shiftKey ? FRAME_SECONDS : 5));
    } else if (event.key === ' ' || event.key.toLowerCase() === 'k') {
      event.preventDefault();
      void togglePlayback();
    } else if (event.key === t('Home')) {
      event.preventDefault();
      seekBy(-Number.MAX_SAFE_INTEGER);
    } else if (event.key === 'End') {
      event.preventDefault();
      seekBy(Number.MAX_SAFE_INTEGER);
    }
  }

  return (
    <div className="precise-replay" tabIndex={0} onKeyDown={onKeyDown} aria-label={t('Replay player with precise seeking')}>
      <video
        ref={videoRef}
        key={replay.id}
        className={className}
        controls
        autoPlay={autoPlay}
        playsInline
        preload="metadata"
        src={replay.playbackUrl ?? undefined}
        onLoadedMetadata={sync}
        onDurationChange={sync}
        onTimeUpdate={sync}
        onSeeked={sync}
        onPlay={sync}
        onPause={sync}
        onEnded={sync}
        aria-label={`Replay: ${replay.title}`}
      >
        {t('Your browser does not support video playback.')}
      </video>
      <div className="precise-replay-bar" role="group" aria-label={t('Precise replay controls')}>
        <button type="button" className="precise-replay-button" onClick={() => seekBy(-10)} aria-label={t('Back 10 seconds')} title={t('Back 10 seconds')}><RotateCcw size={15} /><span>10s</span></button>
        <button type="button" className="precise-replay-button" onClick={() => seekBy(-FRAME_SECONDS)} aria-label={t('Back one frame')} title={t('Back one frame')}><StepBack size={15} /></button>
        <button type="button" className="precise-replay-button is-play" onClick={() => void togglePlayback()} aria-label={playing ? t('Pause replay') : t('Play replay')} title={playing ? t('Pause') : t('Play')}>{playing ? <Pause size={15} /> : <Play size={15} />}</button>
        <button type="button" className="precise-replay-button" onClick={() => seekBy(FRAME_SECONDS)} aria-label={t('Forward one frame')} title={t('Forward one frame')}><StepForward size={15} /></button>
        <button type="button" className="precise-replay-button" onClick={() => seekBy(10)} aria-label={t('Forward 10 seconds')} title={t('Forward 10 seconds')}><RotateCw size={15} /><span>10s</span></button>
        <input
          className="precise-scrub"
          type="range"
          min={0}
          max={duration || 1}
          step={0.01}
          value={Math.min(current, duration || 1)}
          onChange={(event) => {
            const video = videoRef.current;
            if (!video) return;
            video.currentTime = Number(event.target.value);
            setCurrent(video.currentTime);
          }}
          aria-label={t('Seek replay precisely')}
        />
        <span className="precise-timecode"><strong>{formatTimecode(current)}</strong> / {formatTimecode(duration)}</span>
      </div>
      <small className="precise-hint">{t('Arrow keys ±5s · Shift + arrows 1 frame · Space play/pause · Scrubber steps 10ms')}</small>
    </div>
  );
}

function ReplayViewer({ replay, onClose }: { replay: StreamReplay; onClose: () => void }) {
  const { t } = useI18n();
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
      <section className="attachment-viewer replay-viewer" role="dialog" aria-modal="true" aria-labelledby="replay-viewer-title">
        <header className="attachment-viewer-header">
          <div><span className="eyebrow eyebrow-mint">{t('LIVESTREAM REPLAY')}</span><h2 id="replay-viewer-title">{replay.title}</h2></div>
          <div className="attachment-viewer-actions">
            <button type="button" className="text-icon-button" aria-label={t('Close replay')} onClick={onClose}><X size={18} /></button>
          </div>
        </header>
        <div className="attachment-viewer-body">
          <PreciseReplayVideo replay={replay} className="replay-viewer-video" autoPlay />
        </div>
      </section>
    </div>
  );
}

function DeleteStreamButton({ streamId, title, onDeleted, compact = false }: { streamId: string; title: string; onDeleted?: () => void; compact?: boolean; }) {
  const { t } = useI18n();
  const { showToast } = useToast();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!confirming) return;
    function onKeyDown(event: KeyboardEvent) { if (event.key === 'Escape' && !busy) setConfirming(false); }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [confirming, busy]);

  async function remove() {
    setBusy(true);
    setError('');
    try {
      await api<void>(`/admin/stream/${encodeURIComponent(streamId)}`, { method: 'DELETE' });
      setConfirming(false);
      onDeleted?.();
      showToast(t('The livestream has been deleted.'));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to delete the livestream.');
    } finally {
      setBusy(false);
    }
  }

  return <>
    <button
      type="button"
      className={`delete-stream-button${compact ? ' is-compact' : ''}`}
      aria-label={`Delete livestream ${title}`}
      title={`Delete ${title}`}
      onClick={() => { setError(''); setConfirming(true); }}
    ><Trash2 size={compact ? 14 : 15} /></button>
    {confirming && <div className="delete-confirm-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !busy) setConfirming(false);
    }}>
      <section className="delete-confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby={`delete-stream-${streamId}`}>
        <span className="delete-confirm-icon"><Trash2 size={20} /></span>
        <h2 id={`delete-stream-${streamId}`}>{t('Delete this livestream?')}</h2>
        <p>{t('{title} and its replay will be removed from the community. This cannot be undone.', { title })}</p>
        <FieldError>{error}</FieldError>
        <div className="delete-confirm-actions">
          <button type="button" className="text-icon-button" onClick={() => setConfirming(false)} disabled={busy}>{t('Cancel')}</button>
          <button type="button" className="danger-button" onClick={() => void remove()} disabled={busy}>{busy ? t('Deleting…') : t('Delete livestream')}</button>
        </div>
      </section>
    </div>}
  </>;
}

function ReplayPlayer({ replays }: { replays: StreamReplay[] }) {
  const { t } = useI18n();
  const available = replays.filter((replay) => replay.status === 'ready' && replay.playbackUrl)
    .sort((left, right) => new Date(left.startedAt ?? 0).getTime() - new Date(right.startedAt ?? 0).getTime());
  const [selectedId, setSelectedId] = useState('');
  useEffect(() => {
    if (!available.some((replay) => replay.id === selectedId)) setSelectedId(available.at(-1)?.id ?? '');
  }, [selectedId, available.map((item) => item.id).join('|')]);
  const selectedIndex = available.findIndex((replay) => replay.id === selectedId);
  const selected = selectedIndex >= 0 ? available[selectedIndex] : null;

  return <section className="rail-card replay-card" aria-label={t('LIVESTREAM REPLAYS')}>
    <div className="rail-card-head"><span className="rail-eyebrow"><Video size={13} /> {t('LIVESTREAM REPLAYS')}</span><span>{available.length}</span></div>
    <h3>{t('Watch again.')}</h3>
    {selected ? <>
      <strong className="replay-title">{selected.title}</strong>
      <PreciseReplayVideo replay={selected} className="replay-video" />
      <div className="replay-controls">
        <button type="button" className="secondary-button" onClick={() => setSelectedId(available[selectedIndex - 1].id)} disabled={selectedIndex <= 0}><ChevronLeft size={15} /> {t('Previous')}</button>
        <button type="button" className="secondary-button" onClick={() => setSelectedId(available[selectedIndex + 1].id)} disabled={selectedIndex >= available.length - 1}>{t('Next')} <ChevronRight size={15} /></button>
      </div>
      <small className="replay-position">{t('Replay {current} of {total}', { current: selectedIndex + 1, total: available.length })}</small>
    </> : <p>{replays.some((replay) => replay.status === 'recording')
      ? t('Your latest replay is being prepared. Check back in a moment.')
      : replays.length ? t('No replay is available for these older sessions.') : t('Completed livestreams will appear here for replay.')}</p>}
  </section>;
}

function StreamTiles() {
  const { t } = useI18n();
  const tracks = useTracks([Track.Source.Camera, Track.Source.ScreenShare], { onlySubscribed: false });
  if (!tracks.length) return <div className="stream-no-video"><Video size={24} /><span>{t('The livestream is connecting…')}</span></div>;
  return <div className="stream-tiles"><TrackLoop tracks={tracks}><ParticipantTile /></TrackLoop></div>;
}

function MemberStreamControls({ expanded, onToggleExpanded }: { expanded: boolean; onToggleExpanded: () => void }) {
  const { t } = useI18n();
  const tracks = useTracks([Track.Source.Camera, Track.Source.ScreenShare], { onlySubscribed: false });
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const stageRef = useRef<HTMLDivElement>(null);

  async function toggleFullscreen() {
    const stage = stageRef.current;
    if (!stage) return;
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await stage.requestFullscreen();
    } catch { /* fullscreen may be blocked */ }
  }

  async function togglePictureInPicture() {
    const video = stageRef.current?.querySelector('video');
    if (!video || !document.pictureInPictureEnabled) return;
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture();
      else await video.requestPictureInPicture();
    } catch { /* picture-in-picture may be blocked */ }
  }

  return (
    <div className="member-stream-controls">
      <div className="member-stream-toolbar" role="group" aria-label={t('Livestream controls')}>
        <button type="button" className="secondary-button" onClick={() => setMuted((value) => !value)} aria-pressed={muted} aria-label={muted ? t('Unmute stream') : t('Mute stream')} title={muted ? t('Unmute stream') : t('Mute stream')}>
          {muted ? <VolumeX size={15} /> : <Volume2 size={15} />}
        </button>
        <input className="stream-volume" type="range" min={0} max={1} step={0.05} value={muted ? 0 : volume} onChange={(event) => {
          const value = Number(event.target.value);
          setVolume(value);
          if (value > 0) setMuted(false);
        }} aria-label={t('Stream volume')} />
        <button type="button" className="secondary-button" onClick={() => void togglePictureInPicture()} disabled={!tracks.length || !document.pictureInPictureEnabled} aria-label={t('Picture in picture')} title={t('Picture in picture')}>
          <PictureInPicture2 size={15} />
        </button>
        <button type="button" className="secondary-button" onClick={() => void toggleFullscreen()} aria-label={t('Fullscreen')} title={t('Fullscreen')}>
          <Maximize2 size={15} />
        </button>
        <button type="button" className="secondary-button" onClick={onToggleExpanded} aria-label={expanded ? t('Minimize player') : t('Expand player')} title={expanded ? t('Minimize player') : t('Expand player')}>
          {expanded ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
        </button>
      </div>
      <div className="livekit-stage" ref={stageRef}><StreamTiles /><RoomAudioRenderer muted={muted} volume={volume} /></div>
    </div>
  );
}

function LiveAttendeeCount() {
  const { t } = useI18n();
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
    <span className="live-attendee-count" aria-live="polite" aria-label={`${memberCount} ${memberCount === 1 ? 'member' : t('members')} watching`}>
      <Users size={15} />
      <strong>{memberCount}</strong>
      <span>{memberCount === 1 ? t('member watching') : t('members watching')}</span>
    </span>
  );
}

function BroadcasterControls() {
  const { t } = useI18n();
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
        {isCameraEnabled ? <CameraOff size={16} /> : <Camera size={16} />}{isCameraEnabled ? t('Turn camera off') : t('Turn camera on')}
      </button>
      <button type="button" className="secondary-button" onClick={() => void toggleDevice(() => localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled))}>
        {isMicrophoneEnabled ? <MicOff size={16} /> : <Mic size={16} />}{isMicrophoneEnabled ? t('Mute microphone') : t('Unmute microphone')}
      </button>
      <button type="button" className="secondary-button" onClick={() => void toggleDevice(() => localParticipant.setScreenShareEnabled(!isScreenShareEnabled))}>
        {isScreenShareEnabled ? <VideoOff size={16} /> : <Video size={16} />}{isScreenShareEnabled ? t('Stop sharing screen') : t('Share screen')}
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
  message?: ChatMessage & { conversationId: string; forwarded: boolean; readBy?: string[] };
  forwardedCount?: number;
  member?: { id: string; name: string; role: 'admin' | 'user' };
}

function ForwardMessageDialog({ socket, messageId, conversationId, privateMessage, onClose, onForwarded }: { socket: Socket | null; messageId: number; conversationId?: string; privateMessage: boolean; onClose: () => void; onForwarded: (count: number) => void; }) {
  const { t } = useI18n();
  const { showToast } = useToast();
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
      setError(t('Reconnect to chat before forwarding this message.'));
      return;
    }
    if (!selectedIds.length) {
      setError(t('Choose at least one member.'));
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
        setError(t('Forwarding timed out. Please try again.'));
      } else if (!result?.success) {
        setError(result?.error ?? t('The message could not be forwarded.'));
      } else {
        onForwarded(result.forwardedCount ?? selectedIds.length);
        showToast(t('The message has been forwarded.'));
        onClose();
      }
    });
  }

  return (
    <div className="message-dialog-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !sending) onClose();
    }}>
      <section className="message-dialog" role="dialog" aria-modal="true" aria-labelledby="forward-message-title">
        <header><div><span className="eyebrow eyebrow-mint">{t('SHARE A MESSAGE')}</span><h2 id="forward-message-title">{t('Forward to members')}</h2><p>{t('Choose who should receive this message privately.')}</p></div><button type="button" className="quiet-icon-button" aria-label={t('Close forward dialog')} onClick={onClose}><X size={17} /></button></header>
        <form onSubmit={forwardMessage}>
          <div className="forward-member-list">
            {loading ? <div className="screen-loading small"><span className="spinner" /> {t('Loading members…')}</div>
              : members.length ? members.map((member) => <label className="forward-member" key={member.id}>
                <input type="checkbox" checked={selectedIds.includes(member.id)} onChange={() => toggleMember(member.id)} disabled={!selectedIds.includes(member.id) && selectedIds.length >= 20} />
                <Avatar name={member.name} small />
                <span><strong>{member.name}</strong><small>{member.role === 'admin' ? t('Administrator') : t('Member')}</small></span>
              </label>)
                : <div className="empty-card small"><p>{t('No other active members found.')}</p></div>}
          </div>
          <FieldError>{error}</FieldError>
          <footer><span>{t('{count}/20 selected', { count: selectedIds.length })}</span><button type="submit" className="button-primary" disabled={loading || sending || !selectedIds.length}>{sending ? t('Forwarding…') : <><Forward size={15} /> {t('Forward message')}</>}</button></footer>
        </form>
      </section>
    </div>
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
  unreadCount: number;
}

interface PrivateMessage extends ChatMessage {
  conversationId: string;
  forwarded: boolean;
  readBy: string[];
}

function CreateGroupDialog({ members, onClose, onCreated }: { members: ChatMember[]; onClose: () => void; onCreated: (conversation: PrivateConversation) => void; }) {
  const { t } = useI18n();
  const { showToast } = useToast();
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
      setError(t('Choose at least one other member for the group.'));
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
      showToast(t('The group has been created.'));
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
        <header><div><span className="eyebrow eyebrow-mint">{t('ADMIN GROUP')}</span><h2 id="create-group-title">{t('Create a group')}</h2><p>{t('You’ll be included as a group member.')}</p></div><button type="button" className="quiet-icon-button" aria-label={t('Close group dialog')} onClick={onClose}><X size={17} /></button></header>
        <form onSubmit={(event) => void createGroup(event)}>
          <label className="field-label" htmlFor="group-name">{t('Group name')}</label>
          <input id="group-name" className="group-name-input" value={name} onChange={(event) => setName(event.target.value)} minLength={2} maxLength={100} required />
          <div className="forward-member-list">
            {members.length ? members.map((member) => <label className="forward-member" key={member.id}>
              <input type="checkbox" checked={selectedIds.includes(member.id)} onChange={() => toggleMember(member.id)} disabled={!selectedIds.includes(member.id) && selectedIds.length >= 99} />
              <Avatar name={member.name} small />
              <span><strong>{member.name}</strong><small>{member.role === 'admin' ? t('Administrator') : t('Member')}</small></span>
            </label>) : <div className="empty-card small"><p>{t('No other active members found.')}</p></div>}
          </div>
          <FieldError>{error}</FieldError>
          <footer><span>{t('{count}/99 members selected', { count: selectedIds.length })}</span><button type="submit" className="button-primary" disabled={sending || !name.trim() || !selectedIds.length}>{sending ? t('Creating…') : <><Users size={15} /> {t('Create group')}</>}</button></footer>
        </form>
      </section>
    </div>
  );
}

interface GroupMember {
  id: string;
  name: string;
  role: 'admin' | 'user';
}

interface CallInvite {
  callId: string;
  conversationId: string;
  mode: 'audio' | 'video';
  from: { id: string; name: string };
}

interface ActiveCall extends CallInvite {
  token: string;
  url: string;
  roomName: string;
}

function CallStage({ mode }: { mode: 'audio' | 'video' }) {
  const tracks = useTracks([Track.Source.Camera], { onlySubscribed: false });
  const participants = useParticipants();
  if (mode === 'video' && tracks.length) {
    return <div className="call-stage">
      {tracks.map((trackRef) => <div className="call-tile" key={`${trackRef.participant.identity}-${trackRef.source}`}>
        <VideoTrack trackRef={trackRef} />
        <span>{trackRef.participant.name || trackRef.participant.identity}</span>
      </div>)}
    </div>;
  }
  return <div className="call-stage call-stage-audio">
    {participants.map((participant) => <div className="call-tile call-tile-audio" key={participant.identity}>
      <Avatar name={participant.name || participant.identity} />
      <span>{participant.name || participant.identity}</span>
    </div>)}
  </div>;
}

function CallControls({ mode, onHangUp }: { mode: 'audio' | 'video'; onHangUp: () => void }) {
  const { t } = useI18n();
  const { localParticipant, isMicrophoneEnabled, isCameraEnabled } = useLocalParticipant();
  const [busy, setBusy] = useState(false);

  async function toggleMedia(kind: 'microphone' | 'camera') {
    if (busy) return;
    setBusy(true);
    try {
      if (kind === 'microphone') await localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled);
      else await localParticipant.setCameraEnabled(!isCameraEnabled);
    } catch {
      setBusy(false);
    } finally {
      setBusy(false);
    }
  }

  return <div className="call-controls">
    <button type="button" className={`call-control${isMicrophoneEnabled ? '' : ' is-off'}`} disabled={busy}
      aria-label={isMicrophoneEnabled ? t('Mute microphone') : t('Unmute microphone')}
      onClick={() => void toggleMedia('microphone')}>
      {isMicrophoneEnabled ? <Mic size={18} /> : <MicOff size={18} />}
    </button>
    {mode === 'video' && <button type="button" className={`call-control${isCameraEnabled ? '' : ' is-off'}`} disabled={busy}
      aria-label={isCameraEnabled ? t('Turn camera off') : t('Turn camera on')}
      onClick={() => void toggleMedia('camera')}>
      {isCameraEnabled ? <Video size={18} /> : <VideoOff size={18} />}
    </button>}
    <button type="button" className="call-control call-hangup" aria-label={t('End call')} onClick={onHangUp}>
      <PhoneOff size={18} />
    </button>
  </div>;
}

function ManageGroupMembersDialog({ conversation, members, groupMembers, busy, error, onAdd, onRemove, onClose }: {
  conversation: PrivateConversation;
  members: ChatMember[];
  groupMembers: GroupMember[];
  busy: string;
  error: string;
  onAdd: (memberId: string) => void;
  onRemove: (memberId: string) => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const [addMemberId, setAddMemberId] = useState('');
  const available = members.filter((member) => !groupMembers.some((groupMember) => groupMember.id === member.id));

  return <div className="message-dialog-backdrop" onMouseDown={(event) => {
    if (event.target === event.currentTarget && !busy) onClose();
  }}>
    <section className="message-dialog" role="dialog" aria-modal="true" aria-labelledby="manage-members-title">
      <header><div><span className="eyebrow eyebrow-mint">{t('ADMIN GROUP')}</span><h2 id="manage-members-title">{t('Manage group members')}</h2><p>{conversation.name}</p></div><button type="button" className="quiet-icon-button" aria-label={t('Close member dialog')} onClick={onClose}><X size={17} /></button></header>
      <form onSubmit={(event) => { event.preventDefault(); if (addMemberId) onAdd(addMemberId); }}>
        <div className="group-member-list">
          {groupMembers.map((member) => <div className="group-member-row" key={member.id}>
            <Avatar name={member.name} small />
            <span><strong>{member.name}</strong><small>{member.role === 'admin' ? t('Administrator') : t('Member')}</small></span>
            <button type="button" className="delete-group-button" title={t('Remove from group')} aria-label={t('Remove {name} from group', { name: member.name })} disabled={Boolean(busy)} onClick={() => onRemove(member.id)}><Trash2 size={15} /></button>
          </div>)}
        </div>
        <label className="field-label" htmlFor="add-group-member">{t('Add a member')}</label>
        <div className="group-member-add">
          <select id="add-group-member" value={addMemberId} disabled={Boolean(busy)} onChange={(event) => setAddMemberId(event.target.value)}>
            <option value="">{t('Choose a member…')}</option>
            {available.map((member) => <option key={member.id} value={member.id}>{member.name}{member.role === 'admin' ? ` · ${t('Admin')}` : ''}</option>)}
          </select>
          <button type="submit" className="secondary-button" disabled={!addMemberId || Boolean(busy)}><UserPlus size={15} /> {busy === 'add' ? t('Adding…') : t('Add member')}</button>
        </div>
        <FieldError>{error}</FieldError>
        <footer><span>{t('{count} members', { count: groupMembers.length })}</span><button type="button" className="text-icon-button" onClick={onClose}>{t('Done')}</button></footer>
      </form>
    </section>
  </div>;
}

export function MessagesPage() {
  const { user } = useAuth();
  const { t } = useI18n();
  const { showToast } = useToast();
  const formatTime = useTimeFormat();
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
  const [deletingGroup, setDeletingGroup] = useState<PrivateConversation | null>(null);
  const [deletingGroupBusy, setDeletingGroupBusy] = useState(false);
  const [deleteGroupError, setDeleteGroupError] = useState('');
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
  const [managingMembers, setManagingMembers] = useState(false);
  const [memberBusy, setMemberBusy] = useState('');
  const [memberError, setMemberError] = useState('');
  const [incomingCall, setIncomingCall] = useState<CallInvite | null>(null);
  const [outgoingCall, setOutgoingCall] = useState<CallInvite | null>(null);
  const [activeCall, setActiveCall] = useState<ActiveCall | null>(null);
  const [callBusy, setCallBusy] = useState(false);
  const [callError, setCallError] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();
  const [highlightedMessageId, setHighlightedMessageId] = useState<number | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const activeConversationRef = useRef('');
  const endRef = useRef<HTMLDivElement>(null);
  const deepLinkRef = useRef<{ conversationId: string; messageId: number } | null>(null);

  function unreadIncoming(list: PrivateMessage[]) {
    return list.filter((message) => message.userId !== user?.id && !message.readBy.includes(user?.id ?? '')).map((message) => message.id);
  }

  function markMessagesRead(conversationId: string, messageIds: number[]) {
    const socket = socketRef.current;
    if (!socket?.connected || !messageIds.length || !user?.id) return;
    setMessages((previous) => previous.map((message) => message.conversationId === conversationId && messageIds.includes(message.id)
      ? { ...message, readBy: [...new Set([...message.readBy, user.id])] }
      : message));
    setConversations((previous) => previous.map((conversation) => conversation.id === conversationId
      ? { ...conversation, unreadCount: 0 }
      : conversation));
    socket.timeout(10000).emit('private:mark-read', { conversationId, messageIds }, (timeoutError: Error | null, result: ChatActionResult) => {
      if (!timeoutError && result?.success) refreshConversations();
    });
  }

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
      socket.on('connect_error', () => { setConnecting(false); setError(t('Private messaging is temporarily unavailable.')); });
      socket.on('private:message', (message: PrivateMessage) => {
        const incoming = { ...message, readBy: message.readBy ?? [] };
        if (activeConversationRef.current === incoming.conversationId) {
          setMessages((previous) => previous.some((item) => item.id === incoming.id)
            ? previous
            : [...previous, incoming].slice(-100));
          if (document.visibilityState === 'visible') markMessagesRead(incoming.conversationId, unreadIncoming([incoming]));
        }
        refreshConversations();
      });
      socket.on('private:message-read', (result: { conversationId: string; messageId: number; userId: string }) => {
        setMessages((previous) => previous.map((message) => message.conversationId === result.conversationId && message.id === result.messageId
          ? { ...message, readBy: [...new Set([...message.readBy, result.userId])] }
          : message));
        if (result.userId === user?.id) {
          setConversations((previous) => previous.map((conversation) => conversation.id === result.conversationId
            ? { ...conversation, unreadCount: 0 }
            : conversation));
        }
      });
      socket.on('private:deleted', (result: { conversationId: string; messageId: number }) => {
        if (activeConversationRef.current === result.conversationId) {
          setMessages((previous) => previous.filter((item) => item.id !== result.messageId));
        }
        refreshConversations();
      });
      socket.on('private:conversation-updated', refreshConversations);
      socket.on('private:conversation-deleted', (result: { conversationId: string }) => {
        setConversations((previous) => previous.filter((item) => item.id !== result.conversationId));
        if (activeConversationRef.current === result.conversationId) {
          activeConversationRef.current = '';
          setActiveConversationId('');
          setMessages([]);
          setReplyingTo(null);
          setDraft('');
          setDeletingGroup(null);
          setManagingMembers(false);
          setIncomingCall(null);
          setOutgoingCall(null);
          setActiveCall(null);
        }
      });
      socket.on('private:group-members-updated', (result: { conversationId: string }) => {
        refreshConversations();
        if (activeConversationRef.current === result.conversationId) {
          void api<{ members: GroupMember[] }>(`/chat/conversations/${result.conversationId}/members`)
            .then((memberResult) => setGroupMembers(memberResult.members))
            .catch(() => setMemberError(t('Unable to refresh group members.')));
        }
      });
      socket.on('private:call-incoming', (invite: CallInvite) => {
        setIncomingCall(invite);
        setCallError('');
      });
      socket.on('private:call-response', (result: { callId: string; conversationId: string; mode: 'audio' | 'video'; accept: boolean; responder: { name: string } }) => {
        setOutgoingCall(null);
        if (result.accept) {
          void joinCall({
            callId: result.callId,
            conversationId: result.conversationId,
            mode: result.mode,
            from: { id: '', name: '' }
          });
        } else {
          showToast(t('{name} declined the call.', { name: result.responder.name }));
        }
      });
      socket.on('private:call-ended', (result: { callId: string }) => {
        setIncomingCall((current) => current?.callId === result.callId ? null : current);
        setOutgoingCall((current) => current?.callId === result.callId ? null : current);
        setActiveCall((current) => current?.callId === result.callId ? null : current);
      });
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
    const conversationId = searchParams.get('conversationId');
    const messageId = Number(searchParams.get('messageId'));
    if (!conversationId || !Number.isFinite(messageId) || messageId <= 0) return;
    if (deepLinkRef.current?.conversationId === conversationId && deepLinkRef.current.messageId === messageId) return;
    deepLinkRef.current = { conversationId, messageId };
    openConversation(conversationId);
    setHighlightedMessageId(messageId);
  }, [searchParams]);

  useEffect(() => {
    if (highlightedMessageId) return;
    endRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [messages, highlightedMessageId]);

  useEffect(() => {
    if (!highlightedMessageId || !activeConversationId) return;
    const target = document.getElementById(`private-message-${highlightedMessageId}`);
    if (!target) return;
    target.scrollIntoView({ block: 'center', behavior: 'smooth' });
    const timer = window.setTimeout(() => {
      setHighlightedMessageId(null);
      deepLinkRef.current = null;
      setSearchParams({}, { replace: true });
    }, 5000);
    return () => window.clearTimeout(timer);
  }, [highlightedMessageId, activeConversationId, messages, setSearchParams]);

  useEffect(() => {
    if (!activeConversationId) {
      setMessages([]);
      return;
    }
    let active = true;
    setMessages([]);
    void api<{ messages: PrivateMessage[] }>(`/chat/conversations/${activeConversationId}/messages`).then((result) => {
      if (!active || activeConversationRef.current !== activeConversationId) return;
      const loaded = result.messages.map((message) => ({ ...message, readBy: message.readBy ?? [] }));
      setMessages(loaded);
      markMessagesRead(activeConversationId, unreadIncoming(loaded));
    }).catch((reason: unknown) => {
      if (active) setError(reason instanceof Error ? reason.message : 'Unable to load this conversation.');
    });
    return () => { active = false; };
  }, [activeConversationId]);

  function openConversation(id: string) {
    activeConversationRef.current = id;
    setActiveConversationId(id);
    setConversations((previous) => previous.map((conversation) => conversation.id === id ? { ...conversation, unreadCount: 0 } : conversation));
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
        return [{ ...result.conversation, lastMessage: null, lastMessageAt: null, lastSenderId: null, unreadCount: 0 }, ...previous];
      });
      openConversation(result.conversation.id);
      showToast(t('The conversation is ready.'));
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
      setError(t('Reconnect to messaging before sending a message.'));
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
          setError(t('Sending timed out. Please try again.'));
        } else if (!result?.success) {
          setError(result?.error ?? 'Your message could not be sent.');
        } else if (result.message) {
          const sentMessage: PrivateMessage = {
            ...result.message,
            readBy: result.message.readBy ?? []
          };
          setMessages((previous) => previous.some((item) => item.id === sentMessage.id)
            ? previous
            : [...previous, sentMessage].slice(-100));
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
      setError(t('Reconnect to messaging before deleting a message.'));
      return;
    }
    setPendingDeleteId(messageId);
    setError('');
    socket.timeout(10000).emit(
      'private:delete',
      { conversationId: activeConversationId, messageId },
      (timeoutError: Error | null, result: ChatActionResult) => {
        setPendingDeleteId(null);
        if (timeoutError) setError(t('Deleting timed out. Please try again.'));
        else if (!result?.success) setError(result?.error ?? 'The message could not be deleted.');
        else showToast(t('The message has been deleted.'));
      }
    );
  }

  function deleteGroup() {
    const socket = socketRef.current;
    const target = deletingGroup;
    if (!socket?.connected || !target) {
      setDeleteGroupError(t('Reconnect to messaging before deleting a group.'));
      return;
    }
    setDeletingGroupBusy(true);
    setDeleteGroupError('');
    socket.timeout(10000).emit(
      'private:delete-group',
      { conversationId: target.id },
      (timeoutError: Error | null, result: ChatActionResult) => {
        setDeletingGroupBusy(false);
        if (timeoutError) {
          setDeleteGroupError(t('Deleting timed out. Please try again.'));
        } else if (!result?.success) {
          setDeleteGroupError(result?.error ?? t('The group could not be deleted.'));
        } else {
          setDeletingGroup(null);
          setConversations((previous) => previous.filter((item) => item.id !== target.id));
          if (activeConversationRef.current === target.id) {
            activeConversationRef.current = '';
            setActiveConversationId('');
            setMessages([]);
            setReplyingTo(null);
            setDraft('');
          }
          showToast(t('The group has been deleted.'));
        }
      }
    );
  }

  async function joinCall(invite: CallInvite) {
    setCallBusy(true);
    setCallError('');
    try {
      const result = await api<{ token: string; url: string; roomName: string }>(
        `/chat/conversations/${invite.conversationId}/call-token`,
        { method: 'POST' }
      );
      setActiveCall({ ...invite, ...result });
      setIncomingCall(null);
      setOutgoingCall(null);
    } catch (reason) {
      setCallError(reason instanceof Error ? reason.message : t('The call could not be connected.'));
    } finally {
      setCallBusy(false);
    }
  }

  function startCall(mode: 'audio' | 'video') {
    const socket = socketRef.current;
    if (!socket?.connected || !activeConversationId || outgoingCall || activeCall) {
      if (!socket?.connected) setError(t('Reconnect to messaging before starting a call.'));
      return;
    }
    const invite: CallInvite = {
      callId: crypto.randomUUID(),
      conversationId: activeConversationId,
      mode,
      from: { id: user?.id ?? '', name: user?.name ?? '' }
    };
    setCallError('');
    setOutgoingCall(invite);
    socket.timeout(10000).emit('private:call', invite, (timeoutError: Error | null, result: ChatActionResult) => {
      if (timeoutError || !result?.success) {
        setOutgoingCall(null);
        setCallError(result?.error ?? t('The call could not be started. Please try again.'));
      }
    });
  }

  function respondToCall(accept: boolean) {
    const socket = socketRef.current;
    const invite = incomingCall;
    if (!socket?.connected || !invite) return;
    setCallBusy(true);
    socket.timeout(10000).emit('private:call-respond', { callId: invite.callId, conversationId: invite.conversationId, accept },
      (timeoutError: Error | null, result: ChatActionResult) => {
        setCallBusy(false);
        if (timeoutError || !result?.success) {
          setCallError(result?.error ?? t('The call could not be answered. Please try again.'));
          return;
        }
        if (accept) void joinCall(invite);
        else setIncomingCall(null);
      });
  }

  function endCall() {
    const socket = socketRef.current;
    const call = activeCall ?? outgoingCall;
    setActiveCall(null);
    setOutgoingCall(null);
    setIncomingCall(null);
    if (!socket?.connected || !call) return;
    socket.timeout(10000).emit('private:call-end', { callId: call.callId, conversationId: call.conversationId }, () => {});
  }

  async function openMemberManager() {
    const conversation = activeConversation;
    if (!conversation || conversation.type !== 'group') return;
    setManagingMembers(true);
    setMemberBusy('');
    setMemberError('');
    try {
      const result = await api<{ members: GroupMember[] }>(`/chat/conversations/${conversation.id}/members`);
      setGroupMembers(result.members);
    } catch (reason) {
      setMemberError(reason instanceof Error ? reason.message : t('Unable to load group members.'));
    }
  }

  function changeGroupMember(action: 'add' | 'remove', memberId: string) {
    const socket = socketRef.current;
    const conversation = activeConversation;
    if (!socket?.connected || !conversation) return;
    const event = action === 'add' ? 'private:add-group-member' : 'private:remove-group-member';
    setMemberBusy(action);
    setMemberError('');
    socket.timeout(10000).emit(event, { conversationId: conversation.id, memberId },
      (timeoutError: Error | null, result: ChatActionResult) => {
        setMemberBusy('');
        if (timeoutError || !result?.success) {
          setMemberError(result?.error ?? t('The group could not be updated. Please try again.'));
          return;
        }
        if (action === 'add' && result.member) {
          setGroupMembers((previous) => [...previous, result.member as GroupMember]);
          showToast(t('{name} joined the group.', { name: result.member?.name ?? '' }));
        } else if (action === 'remove') {
          setGroupMembers((previous) => previous.filter((member) => member.id !== memberId));
          showToast(t('The member was removed from the group.'));
        }
        refreshConversations();
      });
  }

  const activeConversation = conversations.find((conversation) => conversation.id === activeConversationId) ?? null;
  const callConversation = conversations.find((conversation) => conversation.id === (activeCall?.conversationId ?? incomingCall?.conversationId ?? outgoingCall?.conversationId)) ?? null;

  return (
    <>
      <div className="admin-page messages-page">
        <div className="page-header">
          <div><div className="eyebrow eyebrow-mint">{t(' MESSAGES')}</div><h1>{t('Your conversations.')}</h1><p>{t('Send a private note to any active community member.')}</p></div>
          <span className={`chat-online ${connecting ? '' : 'messages-connected'}`}><i />{connecting ? 'CONNECTING' : 'MESSAGING READY'}</span>
        </div>
        <section className="private-messages-panel">
          <aside className="conversation-sidebar">
            <label className="field-label" htmlFor="new-conversation">{t('Start a conversation')}</label>
            <select id="new-conversation" value="" onChange={(event) => void startConversation(event.target.value)}>
              <option value="">{t('Choose a member…')}</option>
              {members.map((member) => <option key={member.id} value={member.id}>{member.name}{member.role === 'admin' ? ` · ${t('Admin')}` : ''}</option>)}
            </select>
            {user?.role === 'admin' && <button type="button" className="secondary-button create-group-button" onClick={() => setCreatingGroup(true)}><Users size={15} /> {t('Create a group')}</button>}
            <div className="conversation-list-heading"><strong>{t('Recent conversations')}</strong><span>{conversations.length}</span></div>
            {loading ? <div className="screen-loading small"><span className="spinner" /> {t('Loading…')}</div>
              : conversations.length ? <div className="conversation-list">
                {conversations.map((conversation) => <button key={conversation.id} type="button" className={`conversation-row ${activeConversationId === conversation.id ? 'active' : ''}`} onClick={() => openConversation(conversation.id)}>
                  {conversation.type === 'group'
                    ? <span className="conversation-group-icon"><Users size={16} /></span>
                    : <Avatar name={conversation.name} small />}
                  <span><strong>{conversation.name}</strong><small>{conversation.lastSenderId === user?.id ? t('You: ') : ''}{conversation.lastMessage ?? (conversation.type === 'group' ? t('{count} members · New group', { count: conversation.memberCount }) : t('Start a conversation'))}</small></span>
                  {conversation.unreadCount > 0 && <span className="conversation-unread" aria-label={t('{count} new messages', { count: conversation.unreadCount })}>{conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}</span>}
                  {conversation.lastMessageAt && <time>{formatTime(conversation.lastMessageAt)}</time>}
                </button>)}
              </div> : <div className="conversation-empty">{t('Your private conversations will appear here.')}</div>}
          </aside>
          <section className="private-thread">
            {activeConversation ? <>
              <header className="private-thread-header">
                {activeConversation.type === 'group'
                  ? <span className="conversation-group-icon"><Users size={17} /></span>
                  : <Avatar name={activeConversation.name} small />}
                <span className="private-thread-title"><strong>{activeConversation.name}</strong><small>{activeConversation.type === 'group'
                  ? t('{count} group members', { count: activeConversation.memberCount })
                  : activeConversation.member?.role === 'admin' ? t('Administrator') : t('Community member')}</small></span>
                <div className="private-thread-actions">
                  {activeConversation.type === 'group' && user?.role === 'admin' && <button
                    type="button"
                    className="thread-action-button"
                    title={t('Manage group members')}
                    aria-label={t('Manage group members')}
                    onClick={() => void openMemberManager()}
                  ><UserPlus size={16} /></button>}
                  <button type="button" className="thread-action-button" title={t('Start audio call')} aria-label={t('Start audio call')}
                    disabled={connecting || Boolean(outgoingCall || activeCall)} onClick={() => startCall('audio')}><Phone size={16} /></button>
                  <button type="button" className="thread-action-button" title={t('Start video call')} aria-label={t('Start video call')}
                    disabled={connecting || Boolean(outgoingCall || activeCall)} onClick={() => startCall('video')}><Video size={16} /></button>
                  {user?.role === 'admin' && activeConversation.type === 'group' && <button
                    type="button"
                    className="delete-group-button"
                    title={t('Delete group')}
                    aria-label={t('Delete group')}
                    onClick={() => { setDeleteGroupError(''); setDeletingGroup(activeConversation); }}
                  ><Trash2 size={16} /></button>}
                </div>
              </header>
              <div className="private-thread-messages">
                {messages.length ? messages.map((message) => {
                  const isOwn = message.userId === user?.id;
                  const incomingUnread = !isOwn && !message.readBy.includes(user?.id ?? '');
                  const readers = message.readBy.filter((readerId) => readerId !== user?.id).length;
                  const awaitingReads = isOwn && readers < Math.max(0, activeConversation.memberCount - 1);
                  return <article key={message.id} id={`private-message-${message.id}`} className={`private-message ${isOwn ? 'own' : ''} ${incomingUnread ? 'is-unread' : ''} ${highlightedMessageId === message.id ? 'is-highlighted' : ''}`}>
                    <div className="private-message-content">
                      <span className="private-message-sender">{isOwn ? t('You') : message.name}</span>
                      {incomingUnread && <span className="message-new-label"><EyeOff size={12} /> {t('New message')}</span>}
                      <div className="private-message-bubble">
                        {message.forwarded && <span className="forwarded-label"><Forward size={12} /> {t('Forwarded')}</span>}
                        {message.replyTo && <div className="private-message-reply-quote"><strong>{t('Reply to {name}', { name: message.replyTo.name })}</strong><span>{message.replyTo.message}</span></div>}
                        {message.message}
                      </div>
                      <div className="private-message-meta"><time>{formatTime(message.createdAt)}</time>
                        {awaitingReads && <span className="message-read-state" title={t('Not read yet')} aria-label={t('Not read yet')}><Clock3 size={13} /></span>}
                        <button type="button" title={t('Reply to message')} aria-label={t('Reply to private message')} onClick={() => setReplyingTo(message)}><MessageSquareReply size={13} /></button>
                        <button type="button" title={t('Forward message')} aria-label={t('Forward private message')} onClick={() => setForwardingMessage(message)}><Forward size={13} /></button>
                        {isOwn && <button type="button" title={t('Delete for everyone')} aria-label={t('Delete private message for everyone')} disabled={pendingDeleteId === message.id} onClick={() => void deletePrivateMessage(message.id)}><Trash2 size={13} /></button>}
                      </div>
                    </div>
                  </article>;
                }) : <div className="conversation-empty">{t('No messages here yet. Say hello to start the conversation.')}</div>}
                <div ref={endRef} />
              </div>
              {replyingTo && <div className="private-replying-to">
                <span><strong>{t('Replying to {name}', { name: replyingTo.userId === user?.id ? t('yourself') : replyingTo.name })}</strong><small>{replyingTo.message}</small></span>
                <button type="button" className="quiet-icon-button" aria-label={t('Cancel reply')} onClick={() => setReplyingTo(null)}><X size={15} /></button>
              </div>}
              <form className="private-composer" onSubmit={sendPrivateMessage}>
                <input aria-label={t('Write a private message')} placeholder={`Message ${activeConversation.name}…`} value={draft} maxLength={1000} onChange={(event) => setDraft(event.target.value)} />
                <button className="chat-send" type="submit" disabled={!draft.trim() || sending || connecting} aria-label={t('Send private message')}>{sending ? <LoaderCircle size={16} className="spin" /> : <Send size={16} />}</button>
              </form>
            </> : <div className="private-thread-placeholder"><span><Mail size={24} /></span><h2>{t('Make it personal.')}</h2><p>{t('Pick a conversation or choose a member to send a private message.')}</p></div>}
            <FieldError>{error}</FieldError>
            {notice && <span className="chat-action-notice" role="status">{notice}</span>}
          </section>
        </section>
      </div>
      {creatingGroup && <CreateGroupDialog members={members} onClose={() => setCreatingGroup(false)} onCreated={onGroupCreated} />}
      {deletingGroup && <div className="delete-confirm-backdrop" onMouseDown={(event) => {
        if (event.target === event.currentTarget && !deletingGroupBusy) setDeletingGroup(null);
      }}>
        <section className="delete-confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="delete-group-title">
          <span className="delete-confirm-icon"><Trash2 size={20} /></span>
          <h2 id="delete-group-title">{t('Delete this group?')}</h2>
          <p>{t('{name} and all of its messages will be removed for every member. This cannot be undone.', { name: deletingGroup.name })}</p>
          <FieldError>{deleteGroupError}</FieldError>
          <div className="delete-confirm-actions">
            <button type="button" className="text-icon-button" onClick={() => setDeletingGroup(null)} disabled={deletingGroupBusy}>{t('Cancel')}</button>
            <button type="button" className="danger-button" onClick={() => void deleteGroup()} disabled={deletingGroupBusy}>{deletingGroupBusy ? t('Deleting…') : t('Delete group')}</button>
          </div>
        </section>
      </div>}
      {managingMembers && activeConversation && <ManageGroupMembersDialog
        conversation={activeConversation}
        members={members}
        groupMembers={groupMembers}
        busy={memberBusy}
        error={memberError}
        onAdd={(memberId) => changeGroupMember('add', memberId)}
        onRemove={(memberId) => changeGroupMember('remove', memberId)}
        onClose={() => { setManagingMembers(false); setGroupMembers([]); setMemberError(''); }}
      />}
      {(incomingCall || outgoingCall) && (() => {
        const invite = incomingCall ?? outgoingCall;
        if (!invite) return null;
        return <div className="call-backdrop">
          <section className="call-invite" role="dialog" aria-modal="true" aria-labelledby="call-invite-title">
            <span className="call-invite-icon">{invite.mode === 'video' ? <Video size={22} /> : <Phone size={22} />}</span>
            <h2 id="call-invite-title">{incomingCall ? t('{name} is calling you.', { name: invite.from.name }) : t('Calling {name}…', { name: callConversation?.name ?? '' })}</h2>
            <p>{invite.mode === 'video' ? t('Video call') : t('Audio call')} · {callConversation?.name}</p>
            <FieldError>{callError}</FieldError>
            <div className="call-invite-actions">
              {incomingCall ? <>
                <button type="button" className="danger-button" disabled={callBusy} onClick={() => respondToCall(false)}><PhoneOff size={16} /> {t('Decline')}</button>
                <button type="button" className="button-primary" disabled={callBusy} onClick={() => respondToCall(true)}><Phone size={16} /> {t('Accept')}</button>
              </> : <button type="button" className="danger-button" onClick={endCall}><PhoneOff size={16} /> {t('Cancel call')}</button>}
            </div>
          </section>
        </div>;
      })()}
      {activeCall && <div className="call-backdrop">
        <section className="call-window" role="dialog" aria-modal="true" aria-labelledby="call-title">
          <header className="call-window-header">
            <span><strong id="call-title">{activeCall.mode === 'video' ? t('Video call') : t('Audio call')}</strong><small>{callConversation?.name}</small></span>
            {callBusy && <LoaderCircle size={16} className="spin" />}
          </header>
          <LiveKitRoom token={activeCall.token} serverUrl={activeCall.url} connect audio video={activeCall.mode === 'video'}
            className="call-room"
            onConnected={() => { setCallBusy(false); setCallError(''); }}
            onError={(reason) => setCallError(reason.message)}>
            <CallStage mode={activeCall.mode} />
            <RoomAudioRenderer />
            <CallControls mode={activeCall.mode} onHangUp={endCall} />
          </LiveKitRoom>
          <FieldError>{callError}</FieldError>
        </section>
      </div>}
      {forwardingMessage && <ForwardMessageDialog socket={socketRef.current} messageId={forwardingMessage.id} conversationId={forwardingMessage.conversationId} privateMessage onClose={() => setForwardingMessage(null)} onForwarded={(count) => setNotice(`Forwarded to ${count} ${count === 1 ? 'member' : t('members')}.`)} />}
    </>
  );
}
