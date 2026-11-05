// Pulls a varied set of real billing emails, redacts them, and records what the extractor
// says about each. Output goes to a git-ignored file for the owner's review before anything
// is committed (CLAUDE.md). Prints counts only, never email content.
// Run: node --env-file=.env.local --import tsx scripts/export-fixtures.ts
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { eq, ne } from 'drizzle-orm';
import { createDb } from '@/db';
import { tokens, users } from '@/db/schema';
import { decryptToken } from '@/lib/auth/crypto';
import { refreshAccessToken } from '@/lib/auth/google';
import { createExtractor } from '@/lib/inbox/extractor';
import { createGmailClient, type GmailMessage } from '@/lib/inbox/gmail';
import { redactEmailText, redactFrom } from '@/lib/inbox/redact';
import { userHash } from '@/lib/memory/namespaces';

// Names and handles to remove. The list itself is personal, so it lives in a git-ignored file.
const PERSONAL_TERMS: string[] = JSON.parse(readFileSync(new URL('./personal-terms.local.json', import.meta.url), 'utf8'));

const SEARCHES = [
  'from:anthropic subject:receipt',
  'from:anthropic subject:unsuccessful',
  'from:anthropic subject:paused',
  'from:instawp subject:"Your receipt from"',
  'from:instawp subject:"usage invoice"',
  'from:instawp subject:"upcoming invoice"',
  'from:instawp subject:refund',
  'from:instawp subject:"Your InstaWP Inc receipt"',
  'from:vercel subject:receipt',
  'from:gitlab subject:trial',
  'from:opay subject:"Payment Successful"',
  'from:bybit subject:Declined',
  'from:googleplay-noreply subject:"Order Receipt" CapCut',
  'from:paystack subject:Receipt',
  'from:canva subject:trial',
  'from:respondent subject:"$15"',
  'from:temu subject:Payment',
];

const wanted = 15;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  const db = createDb();
  const demo = userHash('demo-account', process.env.NS_SALT as string);
  const [user] = await db.select().from(users).where(ne(users.id, demo));
  const [token] = await db.select().from(tokens).where(eq(tokens.userId, user.id));
  const gmail = createGmailClient(await refreshAccessToken(decryptToken(token.refreshTokenEnc, process.env.TOKEN_ENC_KEY as string)));
  const extract = createExtractor(user.homeCurrency);

  const output = new URL('../tests/fixtures/emails.local.json', import.meta.url);
  mkdirSync(new URL('../tests/fixtures/', import.meta.url), { recursive: true });

  const fixtures: unknown[] = [];
  for (const search of SEARCHES) {
    if (fixtures.length >= wanted) break;
    let email: GmailMessage;
    try {
      const { ids } = await gmail.listMessages(`${search} newer_than:1y`);
      if (ids.length === 0) {
        console.log(`no match: ${search}`);
        continue;
      }
      email = await gmail.getMessage(ids[0]);
    } catch (error) {
      console.log(`skipped (${(error as Error).name}): ${search}`);
      continue;
    }
    const redacted: GmailMessage = {
      id: `fixture-${fixtures.length + 1}`,
      from: redactFrom(email.from, PERSONAL_TERMS),
      subject: redactEmailText(email.subject, PERSONAL_TERMS),
      date: email.date,
      text: redactEmailText(email.text, PERSONAL_TERMS),
    };
    // The extractor sees only the redacted copy, which is exactly what the test will replay.
    let got: unknown = 'error';
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        got = (await extract(redacted)) ?? { kind: 'none' };
        break;
      } catch (error) {
        console.log(`extractor waiting (${(error as Error).name})`);
        await sleep(30_000);
      }
    }
    fixtures.push({ search, email: redacted, got });
    writeFileSync(output, JSON.stringify(fixtures, null, 2)); // saved each time, so a failure loses nothing
    console.log(`${fixtures.length}: ${search} -> ${(got as { kind?: string }).kind ?? got}`);
    await sleep(8_000);
  }

  console.log(`wrote ${fixtures.length} fixtures to tests/fixtures/emails.local.json`);
}

main()
  .catch((error) => {
    console.error('export failed:', (error as Error).name);
    process.exitCode = 1;
  })
  .finally(() => process.exit());
