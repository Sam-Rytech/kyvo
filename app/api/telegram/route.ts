import { eq } from 'drizzle-orm';
import { Bot, webhookCallback } from 'grammy';
import { createDb } from '@/db';
import { cacheEvents, users } from '@/db/schema';
import { readLinkCode, webhookSecret } from '@/lib/auth/crypto';
import { getTatum } from '@/lib/chain/tatum-client';
import { today } from '@/lib/engines/dates';
import { buildNotifications } from '@/lib/engines/notify';
import { getUsdcRate } from '@/lib/fx/tatum-rates';
import { addPromise } from '@/lib/memory/promises';

export const maxDuration = 30;

const SITE = 'https://kyvo-five.vercel.app';
const HELP = ['/due: what to fund and when', '/promise cancel Canva: Kyvo reminds you each week', '/unlink: stop alerts'].join('\n');

function createBot() {
  const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN as string);
  const db = createDb();
  const linkedUser = async (chatId: number) => (await db.select().from(users).where(eq(users.telegramChatId, String(chatId))))[0];

  bot.command('start', async (ctx) => {
    const userId = ctx.match ? readLinkCode(ctx.match, process.env.TOKEN_ENC_KEY as string) : null;
    if (!userId) {
      await ctx.reply(`Open ${SITE} and tap "Connect Telegram" to link your account. Links expire after an hour.`);
      return;
    }
    const updated = await db.update(users).set({ telegramChatId: String(ctx.chat.id) }).where(eq(users.id, userId)).returning({ id: users.id });
    await ctx.reply(updated.length ? `Linked. Kyvo will warn you here before a charge can fail.\n\n${HELP}` : "That link didn't match an account. Open Kyvo and try again.");
  });

  bot.command('due', async (ctx) => {
    const user = await linkedUser(ctx.chat.id);
    if (!user) {
      await ctx.reply(`This chat isn't linked yet. Open ${SITE} and tap "Connect Telegram".`);
      return;
    }
    const events = await db.select().from(cacheEvents).where(eq(cacheEvents.userId, user.id));
    let rate: number | null = null;
    if (user.homeCurrency !== 'USD') rate = await getUsdcRate(getTatum(), user.homeCurrency).then((r) => r.value).catch(() => null);
    const digest = buildNotifications({ events, homeCurrency: user.homeCurrency, asOf: today(), rate, vault: user.vaultAddress ?? undefined }).find((n) => n.key.startsWith('digest:'));
    await ctx.reply(digest?.text ?? 'Nothing due in the next 30 days.', { parse_mode: 'HTML' });
  });

  bot.command('promise', async (ctx) => {
    const user = await linkedUser(ctx.chat.id);
    const text = ctx.match.trim();
    if (!user || text.length < 3) {
      await ctx.reply(user ? 'Tell me what you plan to do, like: /promise cancel Canva' : `This chat isn't linked yet. Open ${SITE}.`);
      return;
    }
    await addPromise(db, user.id, text.slice(0, 200));
    await ctx.reply("Got it. I'll remind you each week until it's done.");
  });

  bot.command('unlink', async (ctx) => {
    await db.update(users).set({ telegramChatId: null }).where(eq(users.telegramChatId, String(ctx.chat.id)));
    await ctx.reply('Unlinked. No more alerts here.');
  });

  bot.on('message', (ctx) => ctx.reply(HELP));
  bot.catch((error) => console.error('telegram handler failed:', error.error instanceof Error ? error.error.name : 'unknown'));
  return bot;
}

let handler: ((request: Request) => Promise<Response>) | undefined;

export async function POST(request: Request) {
  handler ??= webhookCallback(createBot(), 'std/http', { secretToken: webhookSecret(process.env.TOKEN_ENC_KEY as string) });
  return handler(request);
}
