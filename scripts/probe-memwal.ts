// Proves the Walrus Memory path end to end against mainnet, with no personal data:
//   health → remember → wait for blob_id → recall from a second process → read the raw blob.
// The raw-blob step answers whether content is readable on public Walrus.
// Run: pnpm probe:memwal
import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { MemWal } from '@mysten-incubation/memwal';

const NAMESPACE = 'ky:probe';
const AGGREGATORS = [
  'https://aggregator.walrus-mainnet.walrus.space',
  'https://walrus-mainnet-aggregator.nodes.guru',
];

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name} in .env.local`);
  return value;
}

function client() {
  return MemWal.create({
    key: requireEnv('MEMWAL_KEY'),
    accountId: requireEnv('MEMWAL_ACCOUNT_ID'),
    serverUrl: requireEnv('MEMWAL_SERVER_URL'),
    namespace: NAMESPACE,
    recallTimeoutMs: 30_000,
  });
}

async function recallFromSecondProcess(token: string) {
  const memwal = client();
  const result = await memwal.recall({ query: `Kyvo probe ${token}`, namespace: NAMESPACE, limit: 5, sort: 'recent' });
  const hit = result.results.find((memory) => memory.text.includes(token));
  console.log(hit ? `RECALLED ${hit.blob_id} written ${hit.created_at ?? 'unknown'}` : `NOT_FOUND (${result.total} results)`);
  process.exitCode = hit ? 0 : 3;
}

async function readRawBlob(blobId: string, token: string) {
  for (const base of AGGREGATORS) {
    try {
      const response = await fetch(`${base}/v1/blobs/${blobId}`, { signal: AbortSignal.timeout(30_000) });
      if (!response.ok) {
        console.log(`  ${new URL(base).hostname}: HTTP ${response.status}`);
        continue;
      }
      const bytes = Buffer.from(await response.arrayBuffer());
      const readable = bytes.toString('latin1').includes(token) || bytes.toString('utf8').includes('Kyvo probe');
      console.log(`  ${new URL(base).hostname}: ${bytes.length} bytes, plaintext readable: ${readable}`);
      return readable;
    } catch (error) {
      console.log(`  ${new URL(base).hostname}: ${(error as Error).message}`);
    }
  }
  return null;
}

async function main() {
  if (process.argv[2] === '--recall') return recallFromSecondProcess(process.argv[3]);

  const memwal = client();
  console.log('health:', JSON.stringify(await memwal.health()));
  console.log('delegate key matches MEMWAL_AGENT_ID:', (await memwal.getPublicKeyHex()) === requireEnv('MEMWAL_AGENT_ID'));

  const token = randomBytes(6).toString('hex');
  const started = Date.now();
  const stored = await memwal.rememberAndWait(`Kyvo probe ${token}: relayer write check, no personal data.`, NAMESPACE, {
    timeoutMs: 120_000,
  });
  console.log(`stored: blob_id=${stored.blob_id} in ${Math.round((Date.now() - started) / 1000)}s`);

  let recalled = false;
  for (let attempt = 1; attempt <= 5 && !recalled; attempt++) {
    const child = spawnSync(process.execPath, [...process.execArgv, fileURLToPath(import.meta.url), '--recall', token], {
      encoding: 'utf8',
      env: process.env,
    });
    console.log(`recall attempt ${attempt}: ${(child.stdout || child.stderr).trim().split('\n').pop()}`);
    recalled = child.status === 0;
    if (!recalled) await new Promise((resolve) => setTimeout(resolve, 5_000));
  }

  console.log('raw blob on public Walrus:');
  const readable = await readRawBlob(stored.blob_id, token);

  const inventory = await memwal.listMemories();
  const namespaces = await memwal.listNamespaces();
  console.log(`account: ${inventory.memories.length} memories on first page, namespaces: ${namespaces.namespaces.map((n) => `${n.name}=${n.memory_count}`).join(', ')}`);
  console.log(`RESULT write=ok recall=${recalled ? 'ok' : 'FAILED'} plaintext_on_walrus=${readable === null ? 'UNKNOWN' : readable}`);
  if (!recalled) process.exitCode = 1;
}

main().catch((error) => {
  console.error('probe failed:', (error as Error).name, (error as Error).message);
  process.exitCode = 1;
});
