// Postgres is a rebuildable cache plus the write outbox (architecture §3).
// Walrus Memory is the source of truth for everything learned.
import { sql } from 'drizzle-orm';
import { bigserial, boolean, integer, jsonb, pgTable, primaryKey, text, timestamp, uniqueIndex, index } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  // userHash: sha256(googleSub + NS_SALT), first 16 hex characters (architecture §6.1)
  id: text('id').primaryKey(),
  email: text('email'),
  homeCurrency: text('home_currency').notNull().default('NGN'),
  providers: jsonb('providers').$type<string[]>().notNull().default([]),
  vaultAddress: text('vault_address'),
  telegramChatId: text('telegram_chat_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const tokens = pgTable('tokens', {
  userId: text('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  // AES-GCM ciphertext; the key is TOKEN_ENC_KEY (architecture §9)
  refreshTokenEnc: text('refresh_token_enc').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const outbox = pgTable(
  'outbox',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    userId: text('user_id').notNull(),
    namespace: text('namespace').notNull(),
    text: text('text').notNull(),
    idempotencyKey: text('idempotency_key').notNull(),
    // pending → sending → submitted → stored, or failed
    status: text('status').notNull().default('pending'),
    batchKey: text('batch_key'),
    jobId: text('job_id'),
    blobId: text('blob_id'),
    attempts: integer('attempts').notNull().default(0),
    lastError: text('last_error'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('outbox_idempotency_key').on(t.idempotencyKey), index('outbox_status').on(t.status, t.id)],
);

// Every event recalled or written, decoded. Engines derive current state from this.
export const cacheEvents = pgTable(
  'cache_events',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    userId: text('user_id').notNull(),
    namespace: text('namespace').notNull(),
    type: text('type').notNull(),
    merchant: text('merchant'),
    eventDate: text('event_date'),
    sentence: text('sentence').notNull(),
    event: jsonb('event').$type<Record<string, unknown>>().notNull(),
    blobId: text('blob_id').notNull(),
    writtenAt: timestamp('written_at', { withTimezone: true }),
  },
  (t) => [uniqueIndex('cache_events_blob').on(t.blobId), index('cache_events_user_type').on(t.userId, t.type)],
);

export const seenMessages = pgTable(
  'seen_messages',
  {
    userId: text('user_id').notNull(),
    // sha256 of the Gmail message ID. Raw email is never stored (architecture §9).
    messageHash: text('message_hash').notNull(),
    seenAt: timestamp('seen_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.messageHash] })],
);

export const scanCursors = pgTable('scan_cursors', {
  userId: text('user_id').primaryKey(),
  pageToken: text('page_token'),
  done: boolean('done').notNull().default(false),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// What has already been sent. Cron delivery can repeat, and this makes that harmless.
export const notifications = pgTable(
  'notifications',
  {
    userId: text('user_id').notNull(),
    key: text('key').notNull(),
    sentAt: timestamp('sent_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.key] })],
);

// One row. The write cap is per account, shared by every user (architecture §5.3).
export const drainState = pgTable('drain_state', {
  id: integer('id').primaryKey().default(1),
  lockedUntil: timestamp('locked_until', { withTimezone: true }).notNull().default(sql`'epoch'`),
  blockedUntil: timestamp('blocked_until', { withTimezone: true }).notNull().default(sql`'epoch'`),
  windowStartedAt: timestamp('window_started_at', { withTimezone: true }).notNull().default(sql`'epoch'`),
  windowCount: integer('window_count').notNull().default(0),
});
