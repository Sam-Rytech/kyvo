import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { createDb } from '@/db';
import { users } from '@/db/schema';
import { getSession } from '@/lib/auth/session';
import { checkFamilyPayments } from '@/lib/daily';

export const maxDuration = 60;

/** Reads the vault's real transactions through Tatum and matches them to members. */
export async function POST() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  const db = createDb();
  const [user] = await db.select({ vault: users.vaultAddress }).from(users).where(eq(users.id, session.userId));
  if (!user?.vault) return NextResponse.json({ error: 'Set your vault address first' }, { status: 400 });

  try {
    const { matched, unmatched } = await checkFamilyPayments(db, session.userId, user.vault);
    return NextResponse.json({ matched: matched.length, unmatched });
  } catch (error) {
    console.error('family check failed:', (error as Error).name);
    return NextResponse.json({ error: 'Chain data is temporarily unavailable. Try again shortly.' }, { status: 502 });
  }
}
