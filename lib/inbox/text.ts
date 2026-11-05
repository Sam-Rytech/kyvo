// Cuts an email down to its billing text before it reaches the LLM (§5.2). This
// saves tokens and sends less personal data. Nothing here is stored or logged.
export const MAX_EMAIL_CHARS = 3000;

const ENTITIES: Record<string, string> = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&apos;': "'", '&nbsp;': ' ' };

export function htmlToText(html: string): string {
  return html
    .replace(/<(style|script|head|title)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<br\s*\/?>|<\/(p|div|tr|td|th|li|h[1-6])>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&[a-z#0-9]+;/gi, (entity) => ENTITIES[entity.toLowerCase()] ?? ' ');
}

export function cleanEmailText(text: string, max: number = MAX_EMAIL_CHARS): string {
  return text
    .replace(/https?:\/\/\S+/g, ' ') // links can carry tokens, and they waste quota
    .replace(/[͏​-‏⁠﻿­]/g, '')
    .replace(/[ \t ]+/g, ' ')
    .replace(/\s*\n\s*/g, '\n')
    .trim()
    .slice(0, max);
}

const BILLING_SIGNAL = /[$€£₦]\s?\d|\b\d[\d,.]*\s?(usd|eur|gbp|ngn)\b|\b(usd|ngn)\b|\btrial\b|declin|unsuccessful|payment failed|failed payment|refund|price (change|increase)|renew/i;

/** A cheap check that spares LLM quota: mail with no sign of billing isn't sent at all. */
export function looksLikeBilling(subject: string, text: string): boolean {
  return BILLING_SIGNAL.test(subject) || BILLING_SIGNAL.test(text);
}
