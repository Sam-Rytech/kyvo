// Points the bot at the deployed app. Run once after deploying.
// Run: node --env-file=.env.local --import tsx scripts/set-telegram-webhook.ts
import { webhookSecret } from '@/lib/auth/crypto';

const URL_ = 'https://kyvo-five.vercel.app/api/telegram';

async function call(method: string, body: Record<string, unknown> = {}) {
  const response = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  return (await response.json()) as { ok: boolean; description?: string; result?: Record<string, unknown> };
}

async function main() {
  const set = await call('setWebhook', { url: URL_, secret_token: webhookSecret(process.env.TOKEN_ENC_KEY as string), allowed_updates: ['message'], drop_pending_updates: true });
  console.log('setWebhook:', set.ok, set.description ?? '');
  const commands = await call('setMyCommands', {
    commands: [
      { command: 'due', description: 'What to fund and when' },
      { command: 'promise', description: 'Kyvo reminds you each week' },
      { command: 'unlink', description: 'Stop alerts' },
    ],
  });
  console.log('setMyCommands:', commands.ok);
  const info = await call('getWebhookInfo');
  console.log('webhook:', info.result?.url, '| pending:', info.result?.pending_update_count, '| last error:', info.result?.last_error_message ?? 'none');
}

main().catch((error) => {
  console.error('failed:', (error as Error).name);
  process.exitCode = 1;
});
