import { MemWal } from '@mysten-incubation/memwal';

let client: MemWal | undefined;

/** Server only. The SDK doesn't read env vars, so every value is passed explicitly (§12). */
export function getMemWal(): MemWal {
  if (client) return client;
  const { MEMWAL_KEY, MEMWAL_ACCOUNT_ID, MEMWAL_SERVER_URL } = process.env;
  if (!MEMWAL_KEY || !MEMWAL_ACCOUNT_ID) throw new Error('MEMWAL_KEY and MEMWAL_ACCOUNT_ID must be set');
  client = MemWal.create({ key: MEMWAL_KEY, accountId: MEMWAL_ACCOUNT_ID, serverUrl: MEMWAL_SERVER_URL });
  return client;
}
