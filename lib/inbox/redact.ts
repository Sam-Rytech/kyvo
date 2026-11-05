// Strips personal details from an email before it can become a test fixture.
// Amounts, dates and merchants stay, because the extractor is judged on those.
const looksLikeDateOrYears = (value: string) => /^\d{4}\s?-\s?\d{2,4}/.test(value.trim());

export function redactEmailText(text: string, personalTerms: string[]): string {
  let out = text
    .replace(/[\w.+-]+@[\w-]+(\.[\w-]+)+/g, 'user@example.com')
    // Card digits: "Visa - 9876", "ending in 1234", "•••• 1234", and "with - 1234" where a logo was stripped
    .replace(/((?:visa|mastercard|master card|card|ending(?: in)?|amex|verve)\s*[-–—:•*.\s]*(?:ending\s*(?:in)?\s*)?)\d{4}\b/gi, '$10000')
    .replace(/(\s[-–—]\s)\d{4}(?=[\s.,)]|$)/g, '$10000')
    .replace(/[•*xX]{2,}\s*\d{4}\b/g, '****0000')
    // Partly masked account numbers such as 987XXXX321
    .replace(/\b\d{2,}[xX*•]{2,}\d{2,}\b/g, 'ACCOUNT')
    // Receipt, invoice and order references. A reference always contains a digit.
    .replace(/#\s?[\w-]*\d[\w-]*/g, '#REDACTED')
    .replace(/\b((?:receipt|invoice|order|transaction|reference|ref)\s*(?:number|no\.?|id|code)?\s*[:,：]?\s*)(?=[\w-]*\d)[A-Z0-9][\w-]{4,}/gi, '$1REDACTED')
    .replace(/\bGPA\.[\d-]+/g, 'GPA.REDACTED')
    .replace(/\b(?:tr|txn|pi|ch|in)_[A-Za-z0-9]{8,}/g, 'REDACTED')
    // Hostnames the user owns, such as domains bought or sites created
    .replace(/\b[\w-]+\.(?:xyz|instawp\.site|instawp\.xyz|vercel\.app)\b/gi, 'example.test')
    .replace(/\+?\d[\d\s()-]{9,}\d/g, (match) => (/[.,]\d{2}\b/.test(match) || looksLikeDateOrYears(match) ? match : 'PHONE'));

  for (const term of personalTerms) {
    if (term.length < 3) continue;
    out = out.replace(new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi'), 'REDACTED');
  }
  return out;
}

/** Sender's display name only, with no address worth keeping. */
export function redactFrom(from: string, personalTerms: string[]): string {
  return redactEmailText(from, personalTerms).replace(/"/g, '');
}
