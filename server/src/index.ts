import http from 'node:http';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import multer from 'multer';
import { Server as SocketServer } from 'socket.io';
import { ZodError, z } from 'zod';
import type { RowDataPacket, ResultSetHeader } from 'mysql2';
import { config } from './config.js';
import { authenticateSocket, getCookieToken, isAllowedClientOrigin, verifyOrigin } from './auth.js';
import { db } from './db.js';
import { createNotifications, setNotificationEmitter } from './notifications.js';
import { router } from './routes.js';
import { UploadValidationError } from './uploads.js';

const app = express();
const httpServer = http.createServer(app);
const backendPortFile = fileURLToPath(new URL('../../.runtime/backend-port', import.meta.url));
const io = new SocketServer(httpServer, {
  cors: {
    origin: (origin, callback) => callback(null, !origin || isAllowedClientOrigin(origin)),
    credentials: true
  },
  maxHttpBufferSize: 1e6
});
setNotificationEmitter((userId, notification) => {
  io.to(userId).emit('notification:new', notification);
});

app.disable('x-powered-by');
app.use(helmet());
app.use(cors({
  origin: (origin, callback) => callback(null, !origin || isAllowedClientOrigin(origin)),
  credentials: true
}));
app.use(express.json({ limit: '1mb' }));
app.get('/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/api', verifyOrigin, router);

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (error instanceof UploadValidationError) {
    res.status(400).json({ error: error.message });
    return;
  }
  if (error instanceof multer.MulterError) {
    res.status(error.code === 'LIMIT_FILE_SIZE' ? 413 : 400).json({
      error: error.code === 'LIMIT_FILE_SIZE'
        ? 'Each uploaded file must be 100 MB or smaller.'
        : error.code === 'LIMIT_FILE_COUNT'
          ? 'You can upload at most 5 files at a time.'
          : 'The uploaded files could not be accepted.'
    });
    return;
  }
  if (error instanceof ZodError) {
    res.status(400).json({
      error: 'Please check the information you entered.',
      fields: error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message
      }))
    });
    return;
  }
  if (isDuplicateEntryError(error)) {
    res.status(409).json({ error: 'An account with that email address already exists.' });
    return;
  }
  console.error('Request failed:', error);
  res.status(500).json({ error: 'Something went wrong. Please try again.' });
});

io.use(async (socket, next) => {
  const user = authenticateSocket(getCookieToken(socket.handshake.headers.cookie));
  if (!user) {
    next(new Error('Authentication required.'));
    return;
  }
  try {
    const [rows] = await db.execute<(RowDataPacket & { is_active: number; role: 'admin' | 'user' })[]>(
      'SELECT is_active, role FROM users WHERE id = ?',
      [user.id]
    );
    if (!rows[0] || !rows[0].is_active) {
      next(new Error('This account is no longer active.'));
      return;
    }
    socket.data.user = { ...user, role: rows[0].role };
    next();
  } catch (error) {
    next(error instanceof Error ? error : new Error('Unable to verify your account.'));
  }
});

const chatMessageSchema = z.object({
  message: z.string().trim().min(1).max(1000)
});
const privateMessageSchema = z.object({
  conversationId: z.string().uuid(),
  message: z.string().trim().min(1).max(1000),
  replyToMessageId: z.number().int().positive().nullable().optional()
});
const chatDeleteSchema = z.object({ messageId: z.number().int().positive() });
const privateDeleteSchema = z.object({
  conversationId: z.string().uuid(),
  messageId: z.number().int().positive()
});
const forwardSchema = z.object({
  messageId: z.number().int().positive(),
  recipientIds: z.array(z.string().uuid()).min(1).max(20)
});
const privateForwardSchema = forwardSchema.extend({ conversationId: z.string().uuid() });

interface ChatActionResult {
  success: boolean;
  error?: string;
  message?: ChatMessagePayload;
  forwardedCount?: number;
}

interface ChatMessagePayload {
  id: number;
  conversationId: string;
  message: string;
  forwarded: boolean;
  replyTo?: { id: number; message: string; name: string } | null;
  createdAt: Date | string;
  userId: string;
  name: string;
}

interface PrivateConversationContext {
  id: string;
  type: 'direct' | 'group';
  participants: string[];
}

io.on('connection', (socket) => {
  let lastSentAt = 0;
  const user = socket.data.user as { id: string; name: string; role: 'admin' | 'user' };
  void socket.join(user.id);
  socket.on('chat:send', async (input: unknown) => {
    const parsed = chatMessageSchema.safeParse(input);
    if (!parsed.success) {
      socket.emit('chat:error', { error: 'Messages must be between 1 and 1000 characters.' });
      return;
    }
    if (Date.now() - lastSentAt < 700) {
      socket.emit('chat:error', { error: 'Please wait a moment before sending another message.' });
      return;
    }
    lastSentAt = Date.now();
    try {
      const [accounts] = await db.execute<(RowDataPacket & { is_active: number })[]>(
        'SELECT is_active FROM users WHERE id = ?',
        [user.id]
      );
      if (!accounts[0]?.is_active) {
        socket.disconnect(true);
        return;
      }
      const [result] = await db.execute<ResultSetHeader>(
        'INSERT INTO chat_messages (user_id, message) VALUES (?, ?)',
        [user.id, parsed.data.message]
      );
      io.emit('chat:message', {
        id: result.insertId,
        message: parsed.data.message,
        createdAt: new Date().toISOString(),
        userId: user.id,
        name: user.name
      });
    } catch (error) {
      console.error('Unable to save chat message:', error);
      socket.emit('chat:error', { error: 'Your message could not be sent. Please try again.' });
    }
  });

  socket.on('chat:delete', async (input: unknown, acknowledge?: (result: ChatActionResult) => void) => {
    const parsed = chatDeleteSchema.safeParse(input);
    if (!parsed.success) {
      acknowledge?.({ success: false, error: 'That community message could not be deleted.' });
      return;
    }
    try {
      const actor = await getActiveSocketUser(user.id);
      if (!actor) {
        socket.disconnect(true);
        acknowledge?.({ success: false, error: 'Your account is no longer active.' });
        return;
      }
      const [rows] = await db.execute<(RowDataPacket & { user_id: string })[]>(
        'SELECT user_id FROM chat_messages WHERE id = ? LIMIT 1',
        [parsed.data.messageId]
      );
      const target = rows[0];
      if (!target) {
        acknowledge?.({ success: false, error: 'This message is no longer available.' });
        return;
      }
      if (actor.role !== 'admin' && target.user_id !== user.id) {
        acknowledge?.({ success: false, error: 'You can only delete your own community messages.' });
        return;
      }
      await db.execute('DELETE FROM chat_messages WHERE id = ?', [parsed.data.messageId]);
      io.emit('chat:deleted', { messageId: parsed.data.messageId });
      acknowledge?.({ success: true });
    } catch (error) {
      console.error('Unable to delete community message:', error);
      acknowledge?.({ success: false, error: 'The message could not be deleted. Please try again.' });
    }
  });

  socket.on('chat:forward', async (input: unknown, acknowledge?: (result: ChatActionResult) => void) => {
    const parsed = forwardSchema.safeParse(input);
    if (!parsed.success) {
      acknowledge?.({ success: false, error: 'Choose up to 20 members to forward this message to.' });
      return;
    }
    try {
      const actor = await getActiveSocketUser(user.id);
      if (!actor) {
        socket.disconnect(true);
        acknowledge?.({ success: false, error: 'Your account is no longer active.' });
        return;
      }
      const [rows] = await db.execute<(RowDataPacket & { message: string })[]>(
        'SELECT message FROM chat_messages WHERE id = ? LIMIT 1',
        [parsed.data.messageId]
      );
      const source = rows[0];
      if (!source) {
        acknowledge?.({ success: false, error: 'This message is no longer available to forward.' });
        return;
      }
      const forwardedCount = await forwardToMembers(
        db,
        io,
        actor,
        source.message,
        parsed.data.recipientIds
      );
      acknowledge?.({ success: true, forwardedCount });
    } catch (error) {
      console.error('Unable to forward community message:', error);
      acknowledge?.({ success: false, error: error instanceof Error ? error.message : 'The message could not be forwarded.' });
    }
  });

  socket.on('private:send', async (input: unknown, acknowledge?: (result: ChatActionResult) => void) => {
    const parsed = privateMessageSchema.safeParse(input);
    if (!parsed.success) {
      acknowledge?.({ success: false, error: 'Messages must be between 1 and 1000 characters.' });
      return;
    }
    if (Date.now() - lastSentAt < 500) {
      acknowledge?.({ success: false, error: 'Please wait a moment before sending another message.' });
      return;
    }
    lastSentAt = Date.now();
    try {
      const sender = await getActiveSocketUser(user.id);
      if (!sender) {
        socket.disconnect(true);
        acknowledge?.({ success: false, error: 'Your account is no longer active.' });
        return;
      }
      const conversation = await getPrivateConversationForUser(parsed.data.conversationId, user.id);
      if (!conversation) {
        acknowledge?.({ success: false, error: 'Conversation not found.' });
        return;
      }
      if (conversation.type === 'direct') {
        const recipientId = conversation.participants.find((id) => id !== user.id);
        if (!recipientId || !await getActiveSocketUser(recipientId)) {
          acknowledge?.({ success: false, error: 'This member is unavailable.' });
          return;
        }
      }
      let replyTo: ChatMessagePayload['replyTo'] = null;
      if (parsed.data.replyToMessageId) {
        const [replies] = await db.execute<(RowDataPacket & {
          id: number;
          message: string;
          name: string;
        })[]>(
          `SELECT m.id, m.message, u.name
           FROM private_messages m JOIN users u ON u.id = m.sender_id
           WHERE m.id = ? AND m.conversation_id = ? LIMIT 1`,
          [parsed.data.replyToMessageId, parsed.data.conversationId]
        );
        if (!replies[0]) {
          acknowledge?.({ success: false, error: 'The message you are replying to is no longer available.' });
          return;
        }
        replyTo = {
          id: Number(replies[0].id),
          message: replies[0].message,
          name: replies[0].name
        };
      }
      const [result] = await db.execute<ResultSetHeader>(
        `INSERT INTO private_messages (conversation_id, sender_id, message, reply_to_message_id)
         VALUES (?, ?, ?, ?)`,
        [parsed.data.conversationId, user.id, parsed.data.message, replyTo?.id ?? null]
      );
      await db.execute('UPDATE private_conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?', [
        parsed.data.conversationId
      ]);
      const message: ChatMessagePayload = {
        id: result.insertId,
        conversationId: parsed.data.conversationId,
        message: parsed.data.message,
        forwarded: false,
        replyTo,
        createdAt: new Date(),
        userId: user.id,
        name: sender.name
      };
      void createNotifications(
        'private_messages',
        `${sender.name} sent a message`,
        parsed.data.message,
        '/app/messages',
        conversation.participants.filter((participantId) => participantId !== user.id)
      ).catch((error: unknown) => console.error('Unable to notify members about a private message:', error));
      emitPrivateMessage(conversation, message, io);
      acknowledge?.({ success: true, message });
    } catch (error) {
      console.error('Unable to save private message:', error);
      acknowledge?.({ success: false, error: 'Your private message could not be sent. Please try again.' });
    }
  });

  socket.on('private:delete', async (input: unknown, acknowledge?: (result: ChatActionResult) => void) => {
    const parsed = privateDeleteSchema.safeParse(input);
    if (!parsed.success) {
      acknowledge?.({ success: false, error: 'That private message could not be deleted.' });
      return;
    }
    try {
      if (!await getActiveSocketUser(user.id)) {
        socket.disconnect(true);
        acknowledge?.({ success: false, error: 'Your account is no longer active.' });
        return;
      }
      const conversation = await getPrivateConversationForUser(parsed.data.conversationId, user.id);
      if (!conversation) {
        acknowledge?.({ success: false, error: 'This message is not in one of your conversations.' });
        return;
      }
      const [rows] = await db.execute<(RowDataPacket & { sender_id: string })[]>(
        'SELECT sender_id FROM private_messages WHERE id = ? AND conversation_id = ? LIMIT 1',
        [parsed.data.messageId, parsed.data.conversationId]
      );
      if (!rows[0]) {
        acknowledge?.({ success: false, error: 'This message is no longer available.' });
        return;
      }
      await db.execute('DELETE FROM private_messages WHERE id = ?', [parsed.data.messageId]);
      emitToConversationMembers(conversation, 'private:deleted', {
        conversationId: parsed.data.conversationId,
        messageId: parsed.data.messageId
      }, io);
      acknowledge?.({ success: true });
    } catch (error) {
      console.error('Unable to delete private message:', error);
      acknowledge?.({ success: false, error: 'The private message could not be deleted. Please try again.' });
    }
  });

  socket.on('private:forward', async (input: unknown, acknowledge?: (result: ChatActionResult) => void) => {
    const parsed = privateForwardSchema.safeParse(input);
    if (!parsed.success) {
      acknowledge?.({ success: false, error: 'Choose up to 20 members to forward this message to.' });
      return;
    }
    try {
      const sender = await getActiveSocketUser(user.id);
      if (!sender) {
        socket.disconnect(true);
        acknowledge?.({ success: false, error: 'Your account is no longer active.' });
        return;
      }
      const conversation = await getPrivateConversationForUser(parsed.data.conversationId, user.id);
      if (!conversation) {
        acknowledge?.({ success: false, error: 'This private message is no longer available to forward.' });
        return;
      }
      const [rows] = await db.execute<(RowDataPacket & { message: string })[]>(
        `SELECT message FROM private_messages WHERE id = ? AND conversation_id = ? LIMIT 1`,
        [parsed.data.messageId, parsed.data.conversationId]
      );
      const source = rows[0];
      if (!source) {
        acknowledge?.({ success: false, error: 'This private message is no longer available to forward.' });
        return;
      }
      const forwardedCount = await forwardToMembers(
        db,
        io,
        sender,
        source.message,
        parsed.data.recipientIds
      );
      acknowledge?.({ success: true, forwardedCount });
    } catch (error) {
      console.error('Unable to forward private message:', error);
      acknowledge?.({ success: false, error: error instanceof Error ? error.message : 'The private message could not be forwarded.' });
    }
  });

  socket.on('private:refresh-conversation', async (input: unknown, acknowledge?: (result: ChatActionResult) => void) => {
    const parsed = z.object({ conversationId: z.string().uuid() }).safeParse(input);
    if (!parsed.success) {
      acknowledge?.({ success: false, error: 'Conversation could not be refreshed.' });
      return;
    }
    try {
      const actor = await getActiveSocketUser(user.id);
      if (!actor || actor.role !== 'admin') {
        acknowledge?.({ success: false, error: 'Only administrators can create group conversations.' });
        return;
      }
      const conversation = await getPrivateConversationForUser(parsed.data.conversationId, user.id);
      if (!conversation || conversation.type !== 'group') {
        acknowledge?.({ success: false, error: 'Group conversation not found.' });
        return;
      }
      emitToConversationMembers(conversation, 'private:conversation-updated', {
        conversationId: conversation.id
      }, io);
      acknowledge?.({ success: true });
    } catch (error) {
      console.error('Unable to notify group members:', error);
      acknowledge?.({ success: false, error: 'Group members could not be notified.' });
    }
  });
});

async function getActiveSocketUser(userId: string): Promise<{ id: string; name: string; role: 'admin' | 'user' } | null> {
  const [rows] = await db.execute<(RowDataPacket & {
    id: string;
    name: string;
    role: 'admin' | 'user';
    is_active: number;
  })[]>(
    'SELECT id, name, role, is_active FROM users WHERE id = ? LIMIT 1',
    [userId]
  );
  const account = rows[0];
  if (!account?.is_active) return null;
  return { id: account.id, name: account.name, role: account.role };
}

async function getPrivateConversationForUser(
  conversationId: string,
  userId: string
): Promise<PrivateConversationContext | null> {
  const [rows] = await db.execute<(RowDataPacket & {
    id: string;
    conversation_type: 'direct' | 'group';
    participant_a: string | null;
    participant_b: string | null;
  })[]>(
    `SELECT c.id, c.conversation_type, c.participant_a, c.participant_b
     FROM private_conversations c
     WHERE c.id = ? AND (
       (c.conversation_type = 'direct' AND (c.participant_a = ? OR c.participant_b = ?))
       OR (c.conversation_type = 'group' AND EXISTS (
         SELECT 1 FROM private_conversation_members cm
         WHERE cm.conversation_id = c.id AND cm.user_id = ?
       ))
     ) LIMIT 1`,
    [conversationId, userId, userId, userId]
  );
  const row = rows[0];
  if (!row) return null;
  if (row.conversation_type === 'direct') {
    if (!row.participant_a || !row.participant_b) return null;
    return { id: row.id, type: 'direct', participants: [row.participant_a, row.participant_b] };
  }
  const [members] = await db.execute<(RowDataPacket & { user_id: string })[]>(
    'SELECT user_id FROM private_conversation_members WHERE conversation_id = ?',
    [row.id]
  );
  return { id: row.id, type: 'group', participants: members.map((member) => member.user_id) };
}

function emitToConversationMembers(
  conversation: PrivateConversationContext,
  event: string,
  payload: unknown,
  socketServer: SocketServer
): void {
  for (const participantId of conversation.participants) {
    socketServer.to(participantId).emit(event, payload);
  }
}

function emitPrivateMessage(
  conversation: PrivateConversationContext,
  message: ChatMessagePayload,
  socketServer: SocketServer
): void {
  emitToConversationMembers(conversation, 'private:message', message, socketServer);
  emitToConversationMembers(conversation, 'private:conversation-updated', {
    conversationId: message.conversationId
  }, socketServer);
}

async function forwardToMembers(
  database: typeof db,
  socketServer: SocketServer,
  sender: { id: string; name: string },
  messageText: string,
  requestedRecipients: string[]
): Promise<number> {
  const recipients = [...new Set(requestedRecipients)].filter((id) => id !== sender.id);
  if (!recipients.length) throw new Error('Choose at least one other member.');

  const connection = await database.getConnection();
  const emitted: Array<{ conversation: PrivateConversationContext; message: ChatMessagePayload }> = [];
  try {
    const placeholders = recipients.map(() => '?').join(', ');
    const [activeMembers] = await connection.execute<(RowDataPacket & { id: string })[]>(
      `SELECT id FROM users WHERE is_active = TRUE AND id IN (${placeholders})`,
      recipients
    );
    if (activeMembers.length !== recipients.length) {
      throw new Error('One or more selected members are unavailable. Refresh the member list and try again.');
    }

    await connection.beginTransaction();
    for (const recipientId of recipients) {
      const participantA = sender.id < recipientId ? sender.id : recipientId;
      const participantB = sender.id < recipientId ? recipientId : sender.id;
      await connection.execute(
        `INSERT IGNORE INTO private_conversations (id, participant_a, participant_b, conversation_type)
         VALUES (?, ?, ?, 'direct')`,
        [randomUUID(), participantA, participantB]
      );
      const [conversations] = await connection.execute<(RowDataPacket & {
        id: string;
        participant_a: string;
        participant_b: string;
      })[]>(
        `SELECT id, participant_a, participant_b FROM private_conversations
         WHERE conversation_type = 'direct' AND participant_a = ? AND participant_b = ? LIMIT 1`,
        [participantA, participantB]
      );
      const conversation = conversations[0];
      if (!conversation) throw new Error('Unable to create a forwarding conversation.');
      const [result] = await connection.execute<ResultSetHeader>(
        'INSERT INTO private_messages (conversation_id, sender_id, message, forwarded) VALUES (?, ?, ?, ?)',
        [conversation.id, sender.id, messageText, 1]
      );
      await connection.execute('UPDATE private_conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?', [
        conversation.id
      ]);
      emitted.push({
        conversation: {
          id: conversation.id,
          type: 'direct',
          participants: [conversation.participant_a, conversation.participant_b]
        },
        message: {
          id: result.insertId,
          conversationId: conversation.id,
          message: messageText,
          forwarded: true,
          createdAt: new Date(),
          userId: sender.id,
          name: sender.name
        }
      });
    }
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  for (const entry of emitted) emitPrivateMessage(entry.conversation, entry.message, socketServer);
  void createNotifications(
    'private_messages',
    `${sender.name} forwarded a message`,
    messageText,
    '/app/messages',
    recipients
  ).catch((error: unknown) => console.error('Unable to notify members about a forwarded message:', error));
  return emitted.length;
}

async function start(): Promise<void> {
  await db.query('SELECT 1');
  const port = await listenWithPortFallback(httpServer, config.PORT);
  await mkdir(new URL('../../.runtime/', import.meta.url), { recursive: true });
  await writeFile(backendPortFile, String(port), 'utf8');
  console.log(`Streamline API listening on http://localhost:${port}`);
}

function listenWithPortFallback(server: http.Server, preferredPort: number): Promise<number> {
  return new Promise((resolve, reject) => {
    const lastPort = Math.min(preferredPort + 99, 65535);
    let port = preferredPort;

    const tryNextPort = (): void => {
      const currentPort = port;
      const onError = (error: NodeJS.ErrnoException): void => {
        server.removeListener('listening', onListening);
        if (error.code === 'EADDRINUSE' && port < lastPort) {
          port += 1;
          console.warn(`API port ${currentPort} is in use; trying ${port}.`);
          tryNextPort();
          return;
        }
        reject(error);
      };
      const onListening = (): void => {
        server.removeListener('error', onError);
        resolve(currentPort);
      };

      server.once('error', onError);
      server.once('listening', onListening);
      server.listen(currentPort);
    };

    tryNextPort();
  });
}

function isDuplicateEntryError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error
    && error.code === 'ER_DUP_ENTRY';
}

void start().catch((error: unknown) => {
  console.error('Unable to start the API:', error);
  process.exitCode = 1;
});
