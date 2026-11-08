import { randomUUID } from 'node:crypto';
import type { RowDataPacket } from 'mysql2';
import { db } from './db.js';

export type NotificationCategory = 'private_messages' | 'content' | 'livestreams';

export interface AppNotification {
  id: string;
  category: NotificationCategory;
  title: string;
  body: string;
  href: string;
  createdAt: Date | string;
  readAt: Date | string | null;
}

type NotificationEmitter = (userId: string, notification: AppNotification) => void;

let emitNotification: NotificationEmitter = () => undefined;

export function setNotificationEmitter(emitter: NotificationEmitter): void {
  emitNotification = emitter;
}

export async function createNotifications(
  category: NotificationCategory,
  title: string,
  body: string,
  href: string,
  recipientIds?: string[]
): Promise<void> {
  const preferenceColumn = {
    private_messages: 'notify_private_messages',
    content: 'notify_content',
    livestreams: 'notify_livestreams'
  }[category];
  const filters = ['u.is_active = TRUE', `COALESCE(p.${preferenceColumn}, TRUE) = TRUE`];
  const params: string[] = [];
  if (category === 'content' || category === 'livestreams') filters.push("u.role = 'user'");
  if (recipientIds) {
    const uniqueIds = [...new Set(recipientIds)];
    if (!uniqueIds.length) return;
    filters.push(`u.id IN (${uniqueIds.map(() => '?').join(', ')})`);
    params.push(...uniqueIds);
  }
  const [recipients] = await db.execute<(RowDataPacket & { id: string })[]>(
    `SELECT u.id FROM users u
     LEFT JOIN user_preferences p ON p.user_id = u.id
     WHERE ${filters.join(' AND ')}`,
    params
  );
  if (!recipients.length) return;
  const notifications = recipients.map((recipient) => ({
    id: randomUUID(),
    userId: recipient.id,
    category,
    title,
    body: body.slice(0, 500),
    href,
    createdAt: new Date().toISOString(),
    readAt: null
  }));
  await db.execute(
    `INSERT INTO notifications (id, user_id, category, title, body, href)
     VALUES ${notifications.map(() => '(?, ?, ?, ?, ?, ?)').join(', ')}`,
    notifications.flatMap((notification) => [
      notification.id,
      notification.userId,
      notification.category,
      notification.title,
      notification.body,
      notification.href
    ])
  );
  for (const notification of notifications) {
    const { userId, ...payload } = notification;
    emitNotification(userId, payload);
  }
}
