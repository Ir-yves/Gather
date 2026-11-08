import { randomUUID } from 'node:crypto';
import { unlink } from 'node:fs/promises';
import path from 'node:path';
import { Router, type Response } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { AccessToken, RoomServiceClient } from 'livekit-server-sdk';
import { rateLimit } from 'express-rate-limit';
import type { RowDataPacket, ResultSetHeader } from 'mysql2';
import { config, isLiveKitConfigured } from './config.js';
import { clearSessionCookie, requireAuth, requireRole, setSessionCookie } from './auth.js';
import { db } from './db.js';
import { createNotifications, type NotificationCategory } from './notifications.js';
import { asyncHandler, parseBody } from './http.js';
import type { AuthRequest, AuthUser, UserRole } from './types.js';
import {
  contentUpload, getUploadType, MAX_UPLOAD_FILES, UPLOAD_DIRECTORY, UploadValidationError, uploadedFileHasValidSignature
} from './uploads.js';

export const router = Router();

interface UserRow extends RowDataPacket {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  is_active?: number;
  created_at?: Date;
}

interface ContentRow extends RowDataPacket {
  id: string;
  title: string;
  body: string;
  image_url: string | null;
  published: number;
  created_at: Date;
  updated_at: Date;
  author_name: string;
}

interface ContentAssetRow extends RowDataPacket {
  id: string;
  content_id: string;
  original_name: string;
  stored_name: string;
  mime_type: string;
  category: 'document' | 'video';
  size_bytes: number;
  created_at: Date;
}

interface StreamRow extends RowDataPacket {
  id: string;
  room_name: string;
  title: string;
  active: number;
  started_at: Date | null;
  likes_count?: number;
  liked?: number;
}

interface ReactionAggregateRow extends RowDataPacket {
  target_id: string;
  likes_count: number;
  liked: number;
}

interface AnalyticsLikerRow extends RowDataPacket {
  target_id: string;
  id: string;
  name: string;
  email: string;
}

const credentialsSchema = z.object({
  email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  password: z.string().min(12).max(128)
});
const profileSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(254).transform((value) => value.toLowerCase())
});
const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: z.string().min(12).max(128)
}).refine((value) => value.currentPassword !== value.newPassword, {
  path: ['newPassword'],
  message: 'Choose a new password that is different from your current password.'
});
const preferencesSchema = z.object({
  theme: z.enum(['light', 'dark']),
  notifyPrivateMessages: z.boolean(),
  notifyContent: z.boolean(),
  notifyLivestreams: z.boolean()
});
const siteSettingsSchema = z.object({
  siteName: z.string().trim().min(2).max(80),
  welcomeMessage: z.string().trim().min(2).max(500)
});
const notificationIdSchema = z.object({ id: z.string().uuid() });
const registrationSchema = credentialsSchema.extend({
  name: z.string().trim().min(2).max(100)
});
const contentSchema = z.object({
  title: z.string().trim().min(1).max(180),
  body: z.string().trim().min(1).max(20000),
  imageUrl: z.union([
    z.string().trim().url().max(2048).refine((value) => /^https?:\/\//i.test(value)),
    z.literal(''),
    z.null()
  ]).optional().transform((value) => value ?? null),
  published: z.preprocess(
    (value) => value === 'true' ? true : value === 'false' ? false : value,
    z.boolean()
  )
});
const streamSchema = z.object({ title: z.string().trim().min(1).max(180) });
const reactionParamsSchema = z.object({
  type: z.enum(['content', 'asset', 'stream']),
  id: z.string().uuid()
});
const reactionBodySchema = z.object({ liked: z.boolean() });
const userUpdateSchema = z.object({
  role: z.enum(['admin', 'user']),
  active: z.boolean()
});
const conversationSchema = z.object({ memberId: z.string().uuid() });
const groupConversationSchema = z.object({
  name: z.string().trim().min(2).max(100),
  memberIds: z.array(z.string().uuid()).min(1).max(99)
});
const conversationIdSchema = z.object({ id: z.string().uuid() });
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Too many sign-in attempts. Please try again in 15 minutes.' }
});

router.post('/auth/register', loginLimiter, asyncHandler(async (req, res) => {
  const input = parseBody(registrationSchema, req.body);
  const id = randomUUID();
  const passwordHash = await bcrypt.hash(input.password, 12);
  await db.execute(
    'INSERT INTO users (id, name, email, password_hash) VALUES (?, ?, ?, ?)',
    [id, input.name, input.email, passwordHash]
  );
  const user: AuthUser = { id, name: input.name, email: input.email, role: 'user' };
  setSessionCookie(res, user);
  res.status(201).json({ user });
}));

router.post('/auth/login', loginLimiter, asyncHandler(async (req, res) => {
  const input = parseBody(credentialsSchema, req.body);
  const [rows] = await db.execute<(UserRow & { password_hash: string; is_active: number })[]>(
    'SELECT id, name, email, password_hash, role, is_active FROM users WHERE email = ? LIMIT 1',
    [input.email]
  );
  const account = rows[0];
  if (!account || !account.is_active || !(await bcrypt.compare(input.password, account.password_hash))) {
    res.status(401).json({ error: 'Email or password is incorrect.' });
    return;
  }
  const user: AuthUser = { id: account.id, name: account.name, email: account.email, role: account.role };
  setSessionCookie(res, user);
  res.json({ user });
}));

router.post('/auth/logout', (_req, res) => {
  clearSessionCookie(res);
  res.status(204).end();
});

router.get('/auth/me', requireAuth, asyncHandler(async (req, res) => {
  res.json({ user: currentUser(req as AuthRequest) });
}));

router.patch('/account/profile', requireAuth, asyncHandler(async (req, res) => {
  const user = currentUser(req as AuthRequest);
  const input = parseBody(profileSchema, req.body);
  await db.execute('UPDATE users SET name = ?, email = ? WHERE id = ?', [
    input.name,
    input.email,
    user.id
  ]);
  const updatedUser: AuthUser = { ...user, name: input.name, email: input.email };
  setSessionCookie(res, updatedUser);
  res.json({ user: updatedUser });
}));

router.post('/account/password', requireAuth, asyncHandler(async (req, res) => {
  const user = currentUser(req as AuthRequest);
  const input = parseBody(passwordChangeSchema, req.body);
  const [rows] = await db.execute<(RowDataPacket & { password_hash: string })[]>(
    'SELECT password_hash FROM users WHERE id = ? LIMIT 1',
    [user.id]
  );
  const account = rows[0];
  if (!account || !(await bcrypt.compare(input.currentPassword, account.password_hash))) {
    res.status(400).json({ error: 'Your current password is incorrect.' });
    return;
  }
  const passwordHash = await bcrypt.hash(input.newPassword, 12);
  await db.execute('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, user.id]);
  res.json({ success: true });
}));

router.get('/account/preferences', requireAuth, asyncHandler(async (req, res) => {
  const user = currentUser(req as AuthRequest);
  await db.execute('INSERT IGNORE INTO user_preferences (user_id) VALUES (?)', [user.id]);
  const [rows] = await db.execute<(RowDataPacket & {
    theme: 'light' | 'dark';
    notify_private_messages: number;
    notify_content: number;
    notify_livestreams: number;
  })[]>(
    `SELECT theme, notify_private_messages, notify_content, notify_livestreams
     FROM user_preferences WHERE user_id = ?`,
    [user.id]
  );
  const preferences = rows[0];
  if (!preferences) throw new Error('Unable to load account preferences.');
  res.json({
    preferences: {
      theme: preferences.theme,
      notifyPrivateMessages: Boolean(preferences.notify_private_messages),
      notifyContent: Boolean(preferences.notify_content),
      notifyLivestreams: Boolean(preferences.notify_livestreams)
    }
  });
}));

router.put('/account/preferences', requireAuth, asyncHandler(async (req, res) => {
  const user = currentUser(req as AuthRequest);
  const input = parseBody(preferencesSchema, req.body);
  await db.execute(
    `INSERT INTO user_preferences
       (user_id, theme, notify_private_messages, notify_content, notify_livestreams)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE theme = VALUES(theme),
       notify_private_messages = VALUES(notify_private_messages),
       notify_content = VALUES(notify_content),
       notify_livestreams = VALUES(notify_livestreams)`,
    [
      user.id,
      input.theme,
      Number(input.notifyPrivateMessages),
      Number(input.notifyContent),
      Number(input.notifyLivestreams)
    ]
  );
  res.json({ preferences: input });
}));

router.get('/settings/site', requireAuth, asyncHandler(async (_req, res) => {
  const [rows] = await db.execute<(RowDataPacket & { setting_key: string; setting_value: string })[]>(
    `SELECT setting_key, setting_value FROM app_settings WHERE setting_key IN ('site_name', 'welcome_message')`
  );
  const settings = new Map(rows.map((row) => [row.setting_key, row.setting_value]));
  res.json({
    settings: {
      siteName: settings.get('site_name') ?? 'gather.',
      welcomeMessage: settings.get('welcome_message')
        ?? 'Your people, your ideas, your moment. Everything in one place.'
    }
  });
}));

router.put('/admin/settings/site', requireAuth, requireRole('admin'), asyncHandler(async (req, res) => {
  const input = parseBody(siteSettingsSchema, req.body);
  await db.execute(
    `INSERT INTO app_settings (setting_key, setting_value) VALUES
       ('site_name', ?), ('welcome_message', ?)
     ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
    [input.siteName, input.welcomeMessage]
  );
  res.json({ settings: input });
}));

router.get('/notifications', requireAuth, asyncHandler(async (req, res) => {
  const user = currentUser(req as AuthRequest);
  const [rows] = await db.execute<(RowDataPacket & {
    id: string;
    category: NotificationCategory;
    title: string;
    body: string;
    href: string;
    created_at: Date;
    read_at: Date | null;
  })[]>(
    `SELECT id, category, title, body, href, created_at, read_at
     FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50`,
    [user.id]
  );
  const [counts] = await db.execute<(RowDataPacket & { unread_count: number })[]>(
    'SELECT COUNT(*) AS unread_count FROM notifications WHERE user_id = ? AND read_at IS NULL',
    [user.id]
  );
  res.json({
    notifications: rows.map((row) => ({
      id: row.id,
      category: row.category,
      title: row.title,
      body: row.body,
      href: row.href,
      createdAt: row.created_at,
      readAt: row.read_at
    })),
    unreadCount: Number(counts[0]?.unread_count ?? 0)
  });
}));

router.patch('/notifications/:id/read', requireAuth, asyncHandler(async (req, res) => {
  const { id } = parseBody(notificationIdSchema, req.params);
  const user = currentUser(req as AuthRequest);
  await db.execute(
    'UPDATE notifications SET read_at = COALESCE(read_at, CURRENT_TIMESTAMP) WHERE id = ? AND user_id = ?',
    [id, user.id]
  );
  res.json({ success: true });
}));

router.delete('/notifications/:id', requireAuth, asyncHandler(async (req, res) => {
  const { id } = parseBody(notificationIdSchema, req.params);
  const user = currentUser(req as AuthRequest);
  await db.execute('DELETE FROM notifications WHERE id = ? AND user_id = ?', [id, user.id]);
  res.json({ success: true });
}));

router.post('/notifications/read-all', requireAuth, asyncHandler(async (req, res) => {
  const user = currentUser(req as AuthRequest);
  await db.execute(
    'UPDATE notifications SET read_at = CURRENT_TIMESTAMP WHERE user_id = ? AND read_at IS NULL',
    [user.id]
  );
  res.json({ success: true });
}));

router.get('/content', requireAuth, asyncHandler(async (req, res) => {
  const [rows] = await db.execute<ContentRow[]>(
    `SELECT c.id, c.title, c.body, c.image_url, c.published, c.created_at, c.updated_at, u.name AS author_name
     FROM content c JOIN users u ON u.id = c.created_by
     WHERE c.published = TRUE ORDER BY c.created_at DESC LIMIT 100`
  );
  const user = currentUser(req as AuthRequest);
  if (rows.length && user.role === 'user') {
    await db.execute(
      `INSERT IGNORE INTO content_views (content_id, user_id)
       VALUES ${rows.map(() => '(?, ?)').join(', ')}`,
      rows.flatMap((row) => [row.id, user.id])
    );
  }
  res.json({ content: await withContentAssets(rows, user.id) });
}));

router.get('/admin/content', requireAuth, requireRole('admin'), asyncHandler(async (req, res) => {
  const [rows] = await db.execute<ContentRow[]>(
    `SELECT c.id, c.title, c.body, c.image_url, c.published, c.created_at, c.updated_at, u.name AS author_name
     FROM content c JOIN users u ON u.id = c.created_by
     ORDER BY c.created_at DESC LIMIT 200`
  );
  res.json({ content: await withContentAssets(rows, currentUser(req as AuthRequest).id) });
}));

router.post('/admin/content', requireAuth, requireRole('admin'), contentUpload.array('files', MAX_UPLOAD_FILES), asyncHandler(async (req, res) => {
  const files = Array.isArray(req.files) ? req.files : [];
  let connection: Awaited<ReturnType<typeof db.getConnection>> | undefined;
  let transactionStarted = false;
  const uploadedAssets: Array<{
    id: string;
    name: string;
    mimeType: string;
    category: 'document' | 'video';
    sizeBytes: number;
    url: string;
    likesCount: number;
    liked: boolean;
  }> = [];
  const id = randomUUID();
  try {
    const input = parseBody(contentSchema, req.body);
    for (const file of files) {
      if (!await uploadedFileHasValidSignature(file.path, file.originalname)) {
        throw new UploadValidationError(`The file "${file.originalname}" does not match its file type.`);
      }
    }

    connection = await db.getConnection();
    await connection.beginTransaction();
    transactionStarted = true;
    await connection.execute(
      'INSERT INTO content (id, title, body, image_url, published, created_by) VALUES (?, ?, ?, ?, ?, ?)',
      [id, input.title, input.body, input.imageUrl ?? null, Number(input.published), currentUser(req as AuthRequest).id]
    );
    for (const file of files) {
      const type = getUploadType(file.originalname);
      if (!type) throw new UploadValidationError('Unsupported file type.');
      const assetId = randomUUID();
      const name = path.basename(file.originalname).slice(0, 255);
      await connection.execute(
        `INSERT INTO content_assets (id, content_id, original_name, stored_name, mime_type, category, size_bytes)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [assetId, id, name, file.filename, type.mimeType, type.category, file.size]
      );
      uploadedAssets.push({
        id: assetId,
        name,
        mimeType: type.mimeType,
        category: type.category,
        sizeBytes: file.size,
        url: `/api/media/${assetId}`,
        likesCount: 0,
        liked: false
      });
    }
    await connection.commit();
    transactionStarted = false;
    if (input.published) {
      void createNotifications(
        'content',
        'New community update',
        input.title,
        '/app#updates'
      ).catch((error: unknown) => console.error('Unable to notify members about new content:', error));
    }
    res.status(201).json({ id, assets: uploadedAssets });
  } catch (error) {
    if (connection && transactionStarted) await connection.rollback();
    await removeUploadedFiles(files.map((file) => file.path));
    throw error;
  } finally {
    connection?.release();
  }
}));

router.put('/admin/content/:id', requireAuth, requireRole('admin'), asyncHandler(async (req, res) => {
  const input = parseBody(contentSchema, req.body);
  const contentId = req.params.id;
  if (typeof contentId !== 'string') {
    res.status(404).json({ error: 'Content item not found.' });
    return;
  }
  const [previousContent] = await db.execute<(RowDataPacket & { published: number })[]>(
    'SELECT published FROM content WHERE id = ? LIMIT 1',
    [contentId]
  );
  if (!previousContent[0]) {
    res.status(404).json({ error: 'Content item not found.' });
    return;
  }
  const [result] = await db.execute<ResultSetHeader>(
    `UPDATE content SET title = ?, body = ?, image_url = ?, published = ? WHERE id = ?`,
    [input.title, input.body, input.imageUrl ?? null, Number(input.published), contentId]
  );
  if (!result.affectedRows) {
    res.status(404).json({ error: 'Content item not found.' });
    return;
  }
  if (!previousContent[0].published && input.published) {
    void createNotifications(
      'content',
      'New community update',
      input.title,
      '/app#updates'
    ).catch((error: unknown) => console.error('Unable to notify members about published content:', error));
  }
  res.json({ success: true });
}));

router.delete('/admin/content/:id', requireAuth, requireRole('admin'), asyncHandler(async (req, res) => {
  const contentId = req.params.id;
  if (typeof contentId !== 'string') {
    res.status(404).json({ error: 'Content item not found.' });
    return;
  }
  const [assets] = await db.execute<(RowDataPacket & { stored_name: string })[]>(
    'SELECT stored_name FROM content_assets WHERE content_id = ?',
    [contentId]
  );
  const [result] = await db.execute<ResultSetHeader>('DELETE FROM content WHERE id = ?', [contentId]);
  if (!result.affectedRows) {
    res.status(404).json({ error: 'Content item not found.' });
    return;
  }
  await removeUploadedFiles(assets.map((asset) => path.join(UPLOAD_DIRECTORY, asset.stored_name)));
  res.status(204).end();
}));

router.get('/media/:id', requireAuth, asyncHandler(async (req, res) => {
  const assetId = req.params.id;
  if (typeof assetId !== 'string') {
    res.status(404).json({ error: 'File not found.' });
    return;
  }
  const [rows] = await db.execute<ContentAssetRow[]>(
    `SELECT a.id, a.content_id, a.original_name, a.stored_name, a.mime_type, a.category, a.size_bytes, a.created_at
     FROM content_assets a JOIN content c ON c.id = a.content_id
     WHERE a.id = ? AND (c.published = TRUE OR ? = 'admin') LIMIT 1`,
    [assetId, currentUser(req as AuthRequest).role]
  );
  const asset = rows[0];
  const type = asset ? getUploadType(asset.stored_name) : undefined;
  if (!asset || path.basename(asset.stored_name) !== asset.stored_name
    || !/^[0-9a-f-]{36}\.[a-z0-9]+$/i.test(asset.stored_name)
    || !type || type.mimeType !== asset.mime_type || type.category !== asset.category) {
    res.status(404).json({ error: 'File not found.' });
    return;
  }
  const viewer = currentUser(req as AuthRequest);
  if (viewer.role === 'user' && req.query.download !== '1') {
    await db.execute(
      'INSERT IGNORE INTO asset_views (asset_id, user_id) VALUES (?, ?)',
      [asset.id, viewer.id]
    );
  }
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-site');
  res.setHeader('Cache-Control', 'private, max-age=3600');
  const frameAncestors = config.NODE_ENV === 'development'
    ? `'self' ${config.CLIENT_ORIGIN} http://localhost:* http://127.0.0.1:*`
    : `'self' ${config.CLIENT_ORIGIN}`;
  res.setHeader('Content-Security-Policy', `frame-ancestors ${frameAncestors}`);
  res.type(asset.mime_type);
  if (req.query.download !== '1' && (asset.category === 'video' || ['application/pdf', 'text/plain'].includes(asset.mime_type))) {
    res.setHeader('Content-Disposition', 'inline');
  } else {
    res.attachment(asset.original_name);
  }
  res.sendFile(path.join(UPLOAD_DIRECTORY, asset.stored_name));
}));

router.get('/admin/users', requireAuth, requireRole('admin'), asyncHandler(async (_req, res) => {
  const [rows] = await db.execute<(UserRow & { is_active: number })[]>(
    'SELECT id, name, email, role, is_active, created_at FROM users ORDER BY created_at DESC LIMIT 500',
    [] as any
  );
  res.json({
    users: rows.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      active: Boolean(user.is_active),
      createdAt: user.created_at
    }))
  });
}));

router.get('/admin/analytics/summary', requireAuth, requireRole('admin'), asyncHandler(async (_req, res) => {
  const [rows] = await db.execute<(RowDataPacket & { total_views: number; total_likes: number })[]>(
    `SELECT
       (SELECT COUNT(*) FROM content_views)
         + (SELECT COUNT(*) FROM asset_views)
         + (SELECT COUNT(*) FROM stream_views) AS total_views,
       (SELECT COUNT(*) FROM content_likes)
         + (SELECT COUNT(*) FROM asset_likes)
         + (SELECT COUNT(*) FROM stream_likes) AS total_likes`
  );
  res.json({
    views: Number(rows[0]?.total_views ?? 0),
    likes: Number(rows[0]?.total_likes ?? 0)
  });
}));

router.get('/admin/analytics', requireAuth, requireRole('admin'), asyncHandler(async (_req, res) => {
  const [contentRows] = await db.execute<(RowDataPacket & {
    id: string;
    title: string;
    created_at: Date;
    published: number;
    view_count: number;
    likes_count: number;
  })[]>(
    `SELECT c.id, c.title, c.created_at, c.published,
       (SELECT COUNT(*) FROM content_views WHERE content_id = c.id) AS view_count,
       (SELECT COUNT(*) FROM content_likes WHERE content_id = c.id) AS likes_count
     FROM content c ORDER BY c.created_at DESC LIMIT 200`
  );
  const [assetRows] = await db.execute<(RowDataPacket & {
    id: string;
    original_name: string;
    category: 'document' | 'video';
    created_at: Date;
    content_title: string;
    published: number;
    view_count: number;
    likes_count: number;
  })[]>(
    `SELECT a.id, a.original_name, a.category, a.created_at, c.title AS content_title, c.published,
       (SELECT COUNT(*) FROM asset_views WHERE asset_id = a.id) AS view_count,
       (SELECT COUNT(*) FROM asset_likes WHERE asset_id = a.id) AS likes_count
     FROM content_assets a JOIN content c ON c.id = a.content_id
     ORDER BY a.created_at DESC LIMIT 1000`
  );
  const [streamRows] = await db.execute<(RowDataPacket & {
    id: string;
    title: string;
    started_at: Date | null;
    active: number;
    view_count: number;
    likes_count: number;
  })[]>(
    `SELECT s.id, s.title, s.started_at, s.active,
       (SELECT COUNT(*) FROM stream_views WHERE stream_id = s.id) AS view_count,
       (SELECT COUNT(*) FROM stream_likes WHERE stream_id = s.id) AS likes_count
     FROM livestreams s ORDER BY s.started_at DESC LIMIT 100`
  );

  const [contentLikers, assetLikers, streamLikers] = await Promise.all([
    fetchAnalyticsLikers('content_likes', 'content_id', contentRows.map((row) => row.id)),
    fetchAnalyticsLikers('asset_likes', 'asset_id', assetRows.map((row) => row.id)),
    fetchAnalyticsLikers('stream_likes', 'stream_id', streamRows.map((row) => row.id))
  ]);
  res.json({
    items: [
      ...contentRows.map((row) => ({
        id: row.id,
        type: 'content' as const,
        title: row.title,
        createdAt: row.created_at,
        published: Boolean(row.published),
        views: Number(row.view_count),
        likes: Number(row.likes_count),
        likers: contentLikers.get(row.id) ?? []
      })),
      ...assetRows.map((row) => ({
        id: row.id,
        type: row.category,
        title: row.original_name,
        parentTitle: row.content_title,
        createdAt: row.created_at,
        published: Boolean(row.published),
        views: Number(row.view_count),
        likes: Number(row.likes_count),
        likers: assetLikers.get(row.id) ?? []
      })),
      ...streamRows.map((row) => ({
        id: row.id,
        type: 'stream' as const,
        title: row.title,
        createdAt: row.started_at,
        active: Boolean(row.active),
        views: Number(row.view_count),
        likes: Number(row.likes_count),
        likers: streamLikers.get(row.id) ?? []
      }))
    ]
  });
}));

router.patch('/admin/users/:id', requireAuth, requireRole('admin'), asyncHandler(async (req, res) => {
  const actor = currentUser(req as AuthRequest);
  if (req.params.id === actor.id) {
    res.status(400).json({ error: 'You cannot change your own account access.' });
    return;
  }
  const input = parseBody(userUpdateSchema, req.body);
  const [rows] = await db.execute<(UserRow & { is_active: number })[]>(
    'SELECT id, role, is_active FROM users WHERE id = ?',
    [req.params.id] as any
  );
  const target = rows[0];
  if (!target) {
    res.status(404).json({ error: 'User not found.' });
    return;
  }
  if (target.role === 'admin' && target.is_active && (input.role !== 'admin' || !input.active)) {
    const [counts] = await db.execute<(RowDataPacket & { total: number })[]>(
      'SELECT COUNT(*) AS total FROM users WHERE role = ? AND is_active = TRUE AND id <> ?',
        ['admin', target.id] as any
    );
    if (Number(counts[0]?.total ?? 0) === 0) {
      res.status(409).json({ error: 'At least one active administrator must remain.' });
      return;
    }
  }
  await db.execute('UPDATE users SET role = ?, is_active = ? WHERE id = ?', [
    input.role,
    input.active ? 1 : 0,
    target.id
  ]);
  res.json({ success: true });
}));

router.get('/chat/members', requireAuth, asyncHandler(async (req, res) => {
  const user = currentUser(req as AuthRequest);
  const [rows] = await db.execute<(UserRow & { is_active: number })[]>(
    'SELECT id, name, role FROM users WHERE is_active = TRUE AND id <> ? ORDER BY name ASC LIMIT 500',
    [user.id]
  );
  res.json({
    members: rows.map((row) => ({ id: row.id, name: row.name, role: row.role }))
  });
}));

router.get('/chat/conversations', requireAuth, asyncHandler(async (req, res) => {
  const user = currentUser(req as AuthRequest);
  const [rows] = await db.execute<(RowDataPacket & {
    id: string;
    conversation_type: 'direct' | 'group';
    conversation_name: string | null;
    member_id: string | null;
    member_name: string | null;
    member_role: UserRole | null;
    member_count: number;
    last_message: string | null;
    last_message_at: Date | null;
    last_sender_id: string | null;
  })[]>(
    `SELECT c.id, c.conversation_type, c.name AS conversation_name,
       other.id AS member_id, other.name AS member_name, other.role AS member_role,
       CASE WHEN c.conversation_type = 'group' THEN (
         SELECT COUNT(*) FROM private_conversation_members cm WHERE cm.conversation_id = c.id
       ) ELSE 2 END AS member_count,
       latest.message AS last_message, latest.created_at AS last_message_at, latest.sender_id AS last_sender_id
     FROM private_conversations c
     LEFT JOIN users other ON c.conversation_type = 'direct'
       AND other.id = IF(c.participant_a = ?, c.participant_b, c.participant_a)
     LEFT JOIN private_messages latest ON latest.id = (
       SELECT m.id FROM private_messages m WHERE m.conversation_id = c.id ORDER BY m.id DESC LIMIT 1
     )
     WHERE (
       (c.conversation_type = 'direct' AND (c.participant_a = ? OR c.participant_b = ?) AND other.is_active = TRUE)
       OR (c.conversation_type = 'group' AND EXISTS (
         SELECT 1 FROM private_conversation_members cm
         WHERE cm.conversation_id = c.id AND cm.user_id = ?
       ))
     )
     ORDER BY COALESCE(latest.created_at, c.updated_at) DESC LIMIT 100`,
    [user.id, user.id, user.id, user.id]
  );
  res.json({
    conversations: rows.map((row) => ({
      id: row.id,
      type: row.conversation_type,
      name: row.conversation_type === 'group' ? row.conversation_name : row.member_name,
      memberCount: Number(row.member_count),
      member: row.member_id && row.member_name && row.member_role
        ? { id: row.member_id, name: row.member_name, role: row.member_role }
        : null,
      lastMessage: row.last_message,
      lastMessageAt: row.last_message_at,
      lastSenderId: row.last_sender_id
    }))
  });
}));

router.post('/chat/conversations', requireAuth, asyncHandler(async (req, res) => {
  const user = currentUser(req as AuthRequest);
  const { memberId } = parseBody(conversationSchema, req.body);
  if (memberId === user.id) {
    res.status(400).json({ error: 'Choose another member to start a conversation.' });
    return;
  }
  const [members] = await db.execute<(UserRow & { is_active: number })[]>(
    'SELECT id, name, role, is_active FROM users WHERE id = ? AND is_active = TRUE LIMIT 1',
    [memberId]
  );
  const member = members[0];
  if (!member) {
    res.status(404).json({ error: 'This member is unavailable.' });
    return;
  }
  const participantA = user.id < memberId ? user.id : memberId;
  const participantB = user.id < memberId ? memberId : user.id;
  await db.execute(
    `INSERT IGNORE INTO private_conversations (id, participant_a, participant_b, conversation_type)
     VALUES (?, ?, ?, 'direct')`,
    [randomUUID(), participantA, participantB]
  );
  const [conversations] = await db.execute<(RowDataPacket & { id: string })[]>(
    `SELECT id FROM private_conversations
     WHERE conversation_type = 'direct' AND participant_a = ? AND participant_b = ? LIMIT 1`,
    [participantA, participantB]
  );
  const conversation = conversations[0];
  if (!conversation) throw new Error('Unable to create the private conversation.');
  res.status(200).json({
    conversation: {
      id: conversation.id,
      type: 'direct',
      name: member.name,
      memberCount: 2,
      member: { id: member.id, name: member.name, role: member.role }
    }
  });
}));

router.post('/admin/chat/groups', requireAuth, requireRole('admin'), asyncHandler(async (req, res) => {
  const creator = currentUser(req as AuthRequest);
  const input = parseBody(groupConversationSchema, req.body);
  const memberIds = [...new Set(input.memberIds)].filter((id) => id !== creator.id);
  if (!memberIds.length) {
    res.status(400).json({ error: 'Choose at least one other active member for the group.' });
    return;
  }
  const placeholders = memberIds.map(() => '?').join(', ');
  const [members] = await db.execute<(RowDataPacket & { id: string })[]>(
    `SELECT id FROM users WHERE is_active = TRUE AND id IN (${placeholders})`,
    memberIds
  );
  if (members.length !== memberIds.length) {
    res.status(400).json({ error: 'One or more selected accounts are unavailable. Refresh the member list and try again.' });
    return;
  }

  const conversationId = randomUUID();
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    await connection.execute(
      `INSERT INTO private_conversations (id, conversation_type, name)
       VALUES (?, 'group', ?)`,
      [conversationId, input.name]
    );
    const participants = [...new Set([creator.id, ...memberIds])];
    await connection.query(
      `INSERT INTO private_conversation_members (conversation_id, user_id) VALUES ${participants.map(() => '(?, ?)').join(', ')}`,
      participants.flatMap((id) => [conversationId, id])
    );
    await connection.commit();
    res.status(201).json({
      conversation: {
        id: conversationId,
        type: 'group',
        name: input.name,
        memberCount: participants.length,
        member: null,
        lastMessage: null,
        lastMessageAt: null,
        lastSenderId: null
      }
    });
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}));

router.get('/chat/conversations/:id/messages', requireAuth, asyncHandler(async (req, res) => {
  const { id } = parseBody(conversationIdSchema, req.params);
  const user = currentUser(req as AuthRequest);
  const [access] = await db.execute<(RowDataPacket & { id: string })[]>(
    `SELECT c.id FROM private_conversations c
     WHERE c.id = ? AND (
       (c.conversation_type = 'direct' AND (c.participant_a = ? OR c.participant_b = ?))
       OR (c.conversation_type = 'group' AND EXISTS (
         SELECT 1 FROM private_conversation_members cm
         WHERE cm.conversation_id = c.id AND cm.user_id = ?
       ))
     ) LIMIT 1`,
    [id, user.id, user.id, user.id]
  );
  if (!access.length) {
    res.status(404).json({ error: 'Conversation not found.' });
    return;
  }
  const [rows] = await db.execute<(RowDataPacket & {
    id: number;
    conversation_id: string;
    message: string;
    forwarded: number;
    reply_to_message_id: number | null;
    reply_message: string | null;
    reply_sender_name: string | null;
    created_at: Date;
    sender_id: string;
    sender_name: string;
  })[]>(
    `SELECT m.id, m.conversation_id, m.message, m.forwarded, m.created_at,
       m.reply_to_message_id, replied.message AS reply_message, reply_user.name AS reply_sender_name,
       m.sender_id, u.name AS sender_name
     FROM private_messages m JOIN users u ON u.id = m.sender_id
     LEFT JOIN private_messages replied ON replied.id = m.reply_to_message_id
     LEFT JOIN users reply_user ON reply_user.id = replied.sender_id
     WHERE m.conversation_id = ? ORDER BY m.id DESC LIMIT 100`,
    [id]
  );
  res.json({
    messages: rows.reverse().map((row) => ({
      id: Number(row.id),
      conversationId: row.conversation_id,
      message: row.message,
      forwarded: Boolean(row.forwarded),
      replyTo: row.reply_to_message_id && row.reply_message && row.reply_sender_name
        ? {
          id: Number(row.reply_to_message_id),
          message: row.reply_message,
          name: row.reply_sender_name
        }
        : null,
      createdAt: row.created_at,
      userId: row.sender_id,
      name: row.sender_name
    }))
  });
}));

router.get('/chat/messages', requireAuth, asyncHandler(async (_req, res) => {
  const [rows] = await db.execute<(RowDataPacket & {
    id: number;
    message: string;
    created_at: Date;
    user_id: string;
    name: string;
  })[]>(
    `SELECT m.id, m.message, m.created_at, m.user_id, u.name
     FROM chat_messages m JOIN users u ON u.id = m.user_id
     ORDER BY m.id DESC LIMIT 50`
  );
  res.json({
    messages: rows.reverse().map((row) => ({
      id: row.id,
      message: row.message,
      createdAt: row.created_at,
      userId: row.user_id,
      name: row.name
    }))
  });
}));

router.get('/stream', requireAuth, asyncHandler(async (req, res) => {
  const userId = currentUser(req as AuthRequest).id;
  const [rows] = await db.execute<StreamRow[]>(
    `SELECT s.id, s.room_name, s.title, s.active, s.started_at,
       (SELECT COUNT(*) FROM stream_likes WHERE stream_id = s.id) AS likes_count,
       EXISTS(SELECT 1 FROM stream_likes WHERE stream_id = s.id AND user_id = ?) AS liked
     FROM livestreams s WHERE s.active = TRUE ORDER BY s.started_at DESC LIMIT 1`,
    [userId]
  );
  const stream = rows[0];
  res.json({
    stream: stream ? {
      id: stream.id,
      title: stream.title,
      roomName: stream.room_name,
      startedAt: stream.started_at,
      likesCount: Number(stream.likes_count),
      liked: Number(stream.liked) > 0
    } : null,
    livekitUrl: config.LIVEKIT_URL
  });
}));

router.patch('/reactions/:type/:id', requireAuth, asyncHandler(async (req, res) => {
  const { type, id } = parseBody(reactionParamsSchema, req.params);
  const { liked } = parseBody(reactionBodySchema, req.body);
  const userId = currentUser(req as AuthRequest).id;
  const reactionTable = {
    content: { table: 'content_likes', targetColumn: 'content_id' },
    asset: { table: 'asset_likes', targetColumn: 'asset_id' },
    stream: { table: 'stream_likes', targetColumn: 'stream_id' }
  }[type];

  const targetQueries = {
    content: 'SELECT id FROM content WHERE id = ? AND published = TRUE LIMIT 1',
    asset: `SELECT a.id FROM content_assets a JOIN content c ON c.id = a.content_id
            WHERE a.id = ? AND c.published = TRUE LIMIT 1`,
    stream: 'SELECT id FROM livestreams WHERE id = ? AND active = TRUE LIMIT 1'
  };
  const [targets] = await db.execute<RowDataPacket[]>(targetQueries[type], [id]);
  if (!targets.length) {
    res.status(404).json({ error: 'This item is no longer available to like.' });
    return;
  }

  if (liked) {
    await db.execute(
      `INSERT IGNORE INTO ${reactionTable.table} (${reactionTable.targetColumn}, user_id) VALUES (?, ?)`,
      [id, userId]
    );
  } else {
    await db.execute(
      `DELETE FROM ${reactionTable.table} WHERE ${reactionTable.targetColumn} = ? AND user_id = ?`,
      [id, userId]
    );
  }

  const [counts] = await db.execute<(RowDataPacket & { likes_count: number; liked: number })[]>(
    `SELECT COUNT(*) AS likes_count, EXISTS(
       SELECT 1 FROM ${reactionTable.table} WHERE ${reactionTable.targetColumn} = ? AND user_id = ?
     ) AS liked
     FROM ${reactionTable.table} WHERE ${reactionTable.targetColumn} = ?`,
    [id, userId, id]
  );
  res.json({ likesCount: Number(counts[0]?.likes_count ?? 0), liked: Number(counts[0]?.liked) > 0 });
}));

router.post('/admin/stream/start', requireAuth, requireRole('admin'), asyncHandler(async (req, res) => {
  if (!ensureLiveKitConfigured(res)) return;
  const { title } = parseBody(streamSchema, req.body);
  const [existing] = await db.execute<StreamRow[]>(
    'SELECT id FROM livestreams WHERE active = TRUE LIMIT 1'
  ) as [StreamRow[], any];
  if (existing.length) {
    res.status(409).json({ error: 'A livestream is already active. End it before starting another.' });
    return;
  }
  const id = randomUUID();
  const roomName = `stream-${id}`;
  const roomService = new RoomServiceClient(livekitHttpUrl(), config.LIVEKIT_API_KEY, config.LIVEKIT_API_SECRET);
  try {
    await roomService.createRoom({ name: roomName, emptyTimeout: 3600 });
  } catch (error) {
    if (respondToLiveKitAuthError(res, error)) return;
    throw error;
  }
  try {
    await db.execute(
      'INSERT INTO livestreams (id, room_name, title, active, started_at, created_by) VALUES (?, ?, ?, TRUE, NOW(), ?)',
      [id, roomName, title, currentUser(req as AuthRequest).id]
    );
  } catch (error) {
    await roomService.deleteRoom(roomName);
    throw error;
  }
  void createNotifications(
    'livestreams',
    'A livestream is starting',
    title,
    '/app#community-live'
  ).catch((error: unknown) => console.error('Unable to notify members about the livestream:', error));
  res.status(201).json({ success: true });
}));

router.post('/admin/stream/end', requireAuth, requireRole('admin'), asyncHandler(async (_req, res) => {
  if (!ensureLiveKitConfigured(res)) return;
  const [rows] = await db.execute<StreamRow[]>(
    'SELECT id, room_name FROM livestreams WHERE active = TRUE ORDER BY started_at DESC LIMIT 1'
  );
  const stream = rows[0];
  if (!stream) {
    res.status(404).json({ error: 'There is no active livestream.' });
    return;
  }
  const roomService = new RoomServiceClient(livekitHttpUrl(), config.LIVEKIT_API_KEY, config.LIVEKIT_API_SECRET);
  try {
    await roomService.deleteRoom(stream.room_name);
  } catch (error) {
    if (respondToLiveKitAuthError(res, error)) return;
    throw error;
  }
  await db.execute('UPDATE livestreams SET active = FALSE, ended_at = NOW() WHERE id = ?', [stream.id]);
  res.json({ success: true });
}));

router.post('/stream/token', requireAuth, asyncHandler(async (req, res) => {
  if (!ensureLiveKitConfigured(res)) return;
  const user = currentUser(req as AuthRequest);
  const [rows] = await db.execute<StreamRow[]>(
    'SELECT id, room_name FROM livestreams WHERE active = TRUE ORDER BY started_at DESC LIMIT 1'
  );
  const stream = rows[0];
  if (!stream) {
    res.status(404).json({ error: 'There is no active livestream.' });
    return;
  }
  const token = new AccessToken(config.LIVEKIT_API_KEY, config.LIVEKIT_API_SECRET, {
    identity: user.id,
    name: user.name,
    metadata: JSON.stringify({ role: user.role }),
    ttl: '1h'
  });
  token.addGrant({
    roomJoin: true,
    room: stream.room_name,
    canPublish: user.role === 'admin',
    canSubscribe: true,
    canPublishData: user.role === 'admin'
  });
  res.json({ token: await token.toJwt() });
}));

router.post('/stream/view', requireAuth, asyncHandler(async (req, res) => {
  const user = currentUser(req as AuthRequest);
  if (user.role !== 'user') {
    res.status(403).json({ error: 'Only community members can record a livestream view.' });
    return;
  }
  const [rows] = await db.execute<StreamRow[]>(
    'SELECT id FROM livestreams WHERE active = TRUE ORDER BY started_at DESC LIMIT 1'
  );
  const stream = rows[0];
  if (!stream) {
    res.status(404).json({ error: 'There is no active livestream.' });
    return;
  }
  await db.execute(
    'INSERT IGNORE INTO stream_views (stream_id, user_id) VALUES (?, ?)',
    [stream.id, user.id]
  );
  res.json({ success: true });
}));

function currentUser(req: AuthRequest): AuthUser {
  if (!req.user) throw new Error('Authenticated user is missing from request.');
  return req.user;
}

async function withContentAssets(rows: ContentRow[], userId: string) {
  if (!rows.length) return [];
  const placeholders = rows.map(() => '?').join(', ');
  const contentIds = rows.map((row) => row.id);
  const [assets] = await db.execute<ContentAssetRow[]>(
    `SELECT id, content_id, original_name, stored_name, mime_type, category, size_bytes, created_at
     FROM content_assets WHERE content_id IN (${placeholders}) ORDER BY created_at ASC`,
    contentIds
  );
  const [contentLikes] = await db.execute<ReactionAggregateRow[]>(
    `SELECT content_id AS target_id, COUNT(*) AS likes_count, MAX(user_id = ?) AS liked
     FROM content_likes WHERE content_id IN (${placeholders}) GROUP BY content_id`,
    [userId, ...contentIds]
  );
  const assetIds = assets.map((asset) => asset.id);
  const assetLikes = assetIds.length
    ? (await db.execute<ReactionAggregateRow[]>(
      `SELECT asset_id AS target_id, COUNT(*) AS likes_count, MAX(user_id = ?) AS liked
       FROM asset_likes WHERE asset_id IN (${assetIds.map(() => '?').join(', ')}) GROUP BY asset_id`,
      [userId, ...assetIds]
    ))[0]
    : [];
  const contentLikesById = new Map(contentLikes.map((like) => [like.target_id, like]));
  const assetLikesById = new Map(assetLikes.map((like) => [like.target_id, like]));
  const assetsByContent = new Map<string, ContentAssetRow[]>();
  for (const asset of assets) {
    const existing = assetsByContent.get(asset.content_id) ?? [];
    existing.push(asset);
    assetsByContent.set(asset.content_id, existing);
  }
  return rows.map((row) => ({
    ...toContent(row),
    assets: (assetsByContent.get(row.id) ?? []).map((asset) => ({
      id: asset.id,
      name: asset.original_name,
      mimeType: asset.mime_type,
      category: asset.category,
      sizeBytes: Number(asset.size_bytes),
      url: `/api/media/${asset.id}`,
      likesCount: Number(assetLikesById.get(asset.id)?.likes_count ?? 0),
      liked: Number(assetLikesById.get(asset.id)?.liked) > 0
    })),
    likesCount: Number(contentLikesById.get(row.id)?.likes_count ?? 0),
    liked: Number(contentLikesById.get(row.id)?.liked) > 0
  }));
}

async function fetchAnalyticsLikers(
  table: 'content_likes' | 'asset_likes' | 'stream_likes',
  targetColumn: 'content_id' | 'asset_id' | 'stream_id',
  targetIds: string[]
): Promise<Map<string, Array<{ id: string; name: string; email: string }>>> {
  if (!targetIds.length) return new Map();
  const [rows] = await db.execute<AnalyticsLikerRow[]>(
    `SELECT reactions.${targetColumn} AS target_id, users.id, users.name, users.email
     FROM ${table} reactions JOIN users ON users.id = reactions.user_id
     WHERE reactions.${targetColumn} IN (${targetIds.map(() => '?').join(', ')})
     ORDER BY reactions.created_at DESC`,
    targetIds
  );
  const likersByTarget = new Map<string, Array<{ id: string; name: string; email: string }>>();
  for (const row of rows) {
    const likers = likersByTarget.get(row.target_id) ?? [];
    likers.push({ id: row.id, name: row.name, email: row.email });
    likersByTarget.set(row.target_id, likers);
  }
  return likersByTarget;
}

async function removeUploadedFiles(filePaths: string[]): Promise<void> {
  for (const filePath of filePaths) {
    try {
      await unlink(filePath);
    } catch (error) {
      if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT') continue;
      throw error;
    }
  }
}

function ensureLiveKitConfigured(res: Response): boolean {
  if (isLiveKitConfigured()) return true;
  res.status(503).json({
    error: 'Livestreaming is not configured. Set a valid LIVEKIT_URL, LIVEKIT_API_KEY, and LIVEKIT_API_SECRET in server/.env.'
  });
  return false;
}

function respondToLiveKitAuthError(res: Response, error: unknown): boolean {
  if (
    typeof error !== 'object'
    || error === null
    || !('status' in error)
    || (error.status !== 401 && error.status !== 403)
  ) return false;

  res.status(503).json({
    error: 'LiveKit rejected the configured credentials. Check that the URL, API key, and secret in server/.env belong to the same LiveKit project, then restart the backend.'
  });
  return true;
}

function toContent(row: ContentRow) {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    imageUrl: row.image_url,
    published: Boolean(row.published),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    authorName: row.author_name
  };
}

function livekitHttpUrl(): string {
  return config.LIVEKIT_URL.replace(/^wss:/, 'https:').replace(/^ws:/, 'http:');
}
