import { createHash, timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { createDb } from '@/db';
import { runDaily } from '@/lib/daily';

// Vercel Hobby allows up to 300 seconds, and cron runs once a day (±59 minutes).
export const maxDuration = 300;
const BUDGET_MS = 270_000;

const hash = (value: string) => createHash('sha256').update(value).digest();

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return timingSafeEqual(hash(request.headers.get('authorization') ?? ''), hash(`Bearer ${secret}`));
}

export async function GET(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    return NextResponse.json(await runDaily(createDb(), { budgetMs: BUDGET_MS }));
  } catch (error) {
    console.error('daily run failed:', (error as Error).name);
    return NextResponse.json({ error: 'Daily run failed' }, { status: 500 });
  }
}
