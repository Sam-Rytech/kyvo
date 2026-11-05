// Replays the reviewed email fixtures through the real model and reports accuracy.
// Costs Groq quota, so it isn't part of the unit tests.
// Run: pnpm eval:extractor
import { readFileSync } from 'node:fs';
import { createExtractor, type ExtractedEvent } from '@/lib/inbox/extractor';
import type { GmailMessage } from '@/lib/inbox/gmail';

type Fixture = { email: GmailMessage; expected: { kind: string; merchant?: string; amount?: number; currency?: string; date?: string } };

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  const fixtures: Fixture[] = JSON.parse(readFileSync(new URL('../tests/fixtures/emails.json', import.meta.url), 'utf8'));
  const extract = createExtractor('NGN');
  let correct = 0;

  for (const { email, expected } of fixtures) {
    let got: ExtractedEvent | null = null;
    for (let attempt = 0; ; attempt++) {
      try {
        got = await extract(email);
        break;
      } catch (error) {
        if (attempt >= 3) throw error;
        await sleep(30_000);
      }
    }
    const same =
      (got?.kind ?? 'none') === expected.kind &&
      (expected.kind === 'none' ||
        ((got as { merchant?: string }).merchant ?? '').toLowerCase() === (expected.merchant ?? '').toLowerCase() &&
          (got as { amount?: number }).amount === expected.amount &&
          got?.date === expected.date);
    if (same) correct++;
    console.log(`${same ? 'PASS' : 'FAIL'} ${email.id}: expected ${expected.kind}, got ${got?.kind ?? 'none'}`);
    await sleep(8_000);
  }
  console.log(`${correct}/${fixtures.length} correct`);
  process.exitCode = correct === fixtures.length ? 0 : 1;
}

main()
  .catch((error) => {
    console.error('eval failed:', (error as Error).name);
    process.exitCode = 1;
  })
  .finally(() => process.exit());
