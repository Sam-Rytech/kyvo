import { describe, expect, it } from 'vitest';
import { redactEmailText, redactFrom } from '@/lib/inbox/redact';

const redact = (text: string, terms: string[] = ['Ada', 'Lovelace']) => redactEmailText(text, terms);

describe('redactEmailText', () => {
  it.each([
    ['logo stripped', 'Paid on October 18, 2026 with - 1234 (invoice', 'with - 0000 (invoice'],
    ['payment method', 'Payment method - 9876\nReceipt', 'Payment method - 0000\nReceipt'],
    ['card brand', 'Payment method Visa - 9876', 'Visa - 0000'],
    ['ending in', 'charge your Mastercard ending in 1234 for', 'ending in 0000 for'],
    ['dots', 'card •••• 1234', '****0000'],
  ])('removes card digits: %s', (_name, input, expected) => {
    const output = redact(input);
    expect(output).toContain(expected);
    expect(output).not.toMatch(/1234|9876/);
  });

  it('removes email addresses, names, references and owned domains', () => {
    const output = redact('Hi Ada Lovelace, ada@gmail.com bought mysite.xyz. Receipt #1111-2222 Invoice number ABCD1234-0001 tr_FAKEfakeFAKEfake GPA.1111-2222');
    for (const leak of ['Ada', 'Lovelace', 'gmail', 'mysite', '1111-2222', 'ABCD1234', 'tr_FAKE', 'GPA.1111']) expect(output).not.toContain(leak);
  });

  it('keeps what the extractor is judged on', () => {
    const input = 'Refunded $4.51 on August 25, 2026. Order Receipt from 13 Apr 2026. Your transaction of 0.13 USD on 2026-04-19 21:44:37 failed. Your invoice illustration. Qty 93 $6.51';
    const output = redact(input);
    for (const kept of ['Refunded', '$4.51', 'August 25, 2026', 'Order Receipt', 'transaction of 0.13', '2026-04-19', 'invoice illustration', '$6.51']) expect(output).toContain(kept);
    expect(output).not.toContain('REDACTED');
  });

  it('removes partly masked account numbers', () => {
    expect(redact('Account\n987XXXX321\nGlovo')).toBe('Account\nACCOUNT\nGlovo');
  });

  it('removes phone numbers but not dates or copyright years', () => {
    expect(redact('call us at +1 415 555 0100 now')).toContain('PHONE');
    expect(redact('Copyright 2018-2026 Acme')).toContain('2018-2026');
  });

  it('matches whole words, so a short name inside another word survives', () => {
    expect(redact('Your Adapter by Ada')).toBe('Your Adapter by REDACTED');
  });
});

describe('redactFrom', () => {
  it('keeps the brand, loses the address and stray quotes', () => {
    expect(redactFrom('"Anthropic, PBC" <invoice+abc@stripe.com>', [])).toBe('Anthropic, PBC <user@example.com>');
  });
});
