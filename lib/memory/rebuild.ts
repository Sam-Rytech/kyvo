// Total Recall: wipe the cache and rebuild it from Walrus alone (architecture §5.4).
import type { NamespacesResult, RecallResult } from '@mysten-incubation/memwal';
import { decodeEnvelope } from './envelope';
import { namespaces } from './namespaces';

export const RECALL_CAP = 100;
/** Recalled per call, so a large rebuild can't outrun serverless limits. */
export const REBUILD_BATCH = 5;

export class RebuildIncompleteError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RebuildIncompleteError';
  }
}

export interface RebuildMemory {
  listNamespaces(options?: { cursor?: string; limit?: number }): Promise<NamespacesResult>;
  recall(params: { query: string; namespace: string; limit: number; sort: 'recent'; timeoutMs?: number }): Promise<RecallResult>;
}

export type NamespaceInfo = { name: string; count: number };

/** Every namespace this user holds, with how many memories the relayer says it contains. */
export async function listUserNamespaces(memory: RebuildMemory, userId: string): Promise<NamespaceInfo[]> {
  const prefix = namespaces.prefix(userId);
  const found: NamespaceInfo[] = [];
  let cursor: string | undefined;
  let more = true;
  while (more) {
    const page = await memory.listNamespaces({ cursor, limit: 500 });
    for (const ns of page.namespaces) {
      if (ns.name.startsWith(prefix)) found.push({ name: ns.name, count: Number(ns.memory_count) });
    }
    cursor = page.next_cursor ?? undefined;
    more = page.has_more;
  }
  return found.sort((a, b) => a.name.localeCompare(b.name));
}

export type RecalledMemory = { text: string; blobId: string; writtenAt: Date | null };

/** Fails loudly rather than silently losing records. */
export async function recallNamespace(memory: RebuildMemory, ns: NamespaceInfo): Promise<RecalledMemory[]> {
  const result = await memory.recall({
    query: 'charge payment declined refund usage bill trial card subscription promise forecast profile',
    namespace: ns.name,
    limit: RECALL_CAP,
    sort: 'recent',
    timeoutMs: 45_000,
  });
  if (result.results.length >= RECALL_CAP) {
    throw new RebuildIncompleteError(`${ns.name} reached the recall cap of ${RECALL_CAP}`);
  }
  if (result.results.length < ns.count) {
    throw new RebuildIncompleteError(
      `${ns.name} returned ${result.results.length} of ${ns.count} memories${result.dropped_count ? ` (${result.dropped_count} unreadable)` : ''}`,
    );
  }
  return result.results.map((m) => ({ text: m.text, blobId: m.blob_id, writtenAt: m.created_at ? new Date(m.created_at) : null }));
}

/** Results come newest first, so the first one found is the current vault. */
export function decodedVault(texts: string[]): string | null {
  const vault = texts.map(decodeEnvelope).find((d) => d?.event.t === 'vault');
  return typeof vault?.event.address === 'string' ? vault.event.address : null;
}

export function decodedProfile(texts: string[]): { homeCurrency?: string; providers?: string[] } | null {
  const profile = texts.map(decodeEnvelope).find((d) => d?.event.t === 'profile');
  if (!profile) return null;
  return { homeCurrency: profile.event.homeCurrency as string | undefined, providers: profile.event.providers as string[] | undefined };
}
