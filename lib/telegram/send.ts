import { and, eq } from 'drizzle-orm';
import type { Db } from '@/db';
import { notifications, users } from '@/db/schema';
import type { Notification } from '@/lib/engines/notify';

export type SendResult = 'sent' | 'blocked' | 'failed';

/** The bot token is in the URL, so errors from here are reported by status only. */
export async function sendTelegram(chatId: string, text: string, doFetch: typeof fetch = fetch): Promise<SendResult> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return 'failed';
  try {
    const response = await doFetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML', link_preview_options: { is_disabled: true } }),
      signal: AbortSignal.timeout(15_000),
    });
    if (response.ok) return 'sent';
    return response.status === 403 ? 'blocked' : 'failed';
  } catch {
    return 'failed';
  }
}

/**
 * Claims each key before sending, so a repeated cron can't send twice. A failed send gives
 * its claim back, so it's retried next time. Someone who blocked the bot gets unlinked.
 */
export async function deliver(db: Db, userId: string, chatId: string, list: Notification[]): Promise<{ sent: number; skipped: number; failed: number }> {
  const result = { sent: 0, skipped: 0, failed: 0 };
  for (const notification of list) {
    const claimed = await db.insert(notifications).values({ userId, key: notification.key }).onConflictDoNothing().returning({ key: notifications.key });
    if (claimed.length === 0) {
      result.skipped++;
      continue;
    }
    const outcome = await sendTelegram(chatId, notification.text);
    if (outcome === 'sent') {
      result.sent++;
      continue;
    }
    await db.delete(notifications).where(and(eq(notifications.userId, userId), eq(notifications.key, notification.key)));
    result.failed++;
    if (outcome === 'blocked') {
      await db.update(users).set({ telegramChatId: null }).where(eq(users.id, userId));
      break;
    }
  }
  return result;
}
