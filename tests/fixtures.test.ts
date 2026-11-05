import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ExtractedEvent } from '@/lib/inbox/extractor';

// Real, redacted emails, committed only after the owner reviewed them (CLAUDE.md).
const path = new URL('./fixtures/emails.json', import.meta.url);
type Fixture = { email: { id: string; from: string; subject: string; date: string; text: string }; expected: { kind: string } };
const fixtures: Fixture[] = existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : [];

describe.runIf(fixtures.length > 0)('reviewed email fixtures', () => {
  it('has 15', () => {
    expect(fixtures).toHaveLength(15);
  });

  it('every expected event is valid', () => {
    for (const { expected } of fixtures) {
      if (expected.kind !== 'none') expect(ExtractedEvent.safeParse(expected).success).toBe(true);
    }
  });

  it('nothing personal got in', () => {
    // The real text, because in escaped JSON a line break turns user@ into nuser@.
    const all = fixtures.map(({ email }) => `${email.from}\n${email.subject}\n${email.text}`).join('\n');
    const addresses = all.match(/[\w.+-]+@[\w-]+(\.[\w-]+)+/g) ?? [];
    expect(addresses.filter((address) => address !== 'user@example.com')).toEqual([]);
    expect(all).not.toMatch(/\b\d{2,}[xX*•]{2,}\d{2,}\b/); // masked account numbers
    expect(all).not.toMatch(/https?:\/\//);
    expect(all).not.toMatch(/\s[-–—]\s(?!0000)\d{4}(?=[\s.,)])/); // card digits
    expect(all).not.toMatch(/\b(?:visa|mastercard|verve)\s*-?\s*(?!0000)\d{4}\b/i);
  });
});
