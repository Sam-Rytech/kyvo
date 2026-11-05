import type { TatumClient } from './tatum-client';

// Confirmed against mainnet by scripts/probe-tatum.ts: symbol USDC, 6 decimals.
export const USDC_COIN_TYPE = '0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC';
export const USDC_DECIMALS = 6;

/** Base units to USDC. Goes through BigInt so large balances keep their precision. */
export function usdcFromBaseUnits(raw: string | bigint): number {
  const value = BigInt(raw);
  const scale = 10n ** BigInt(USDC_DECIMALS);
  return Number(value / scale) + Number(value % scale) / Number(scale);
}

function endpoint(): string {
  const url = process.env.TATUM_SUI_GRAPHQL;
  if (!url) throw new Error('TATUM_SUI_GRAPHQL is not set');
  return url;
}

export async function getVaultUsdcBalance(tatum: TatumClient, address: string): Promise<number> {
  const data = await tatum.graphql<{ address: { balance: { totalBalance: string } | null } | null }>(
    endpoint(),
    'query($a:SuiAddress!,$c:String!){ address(address:$a){ balance(coinType:$c){ totalBalance } } }',
    { a: address, c: USDC_COIN_TYPE },
  );
  return usdcFromBaseUnits(data.address?.balance?.totalBalance ?? '0');
}

export type VaultTransaction = {
  digest: string;
  sender: string | null;
  timestamp: string | null;
  success: boolean;
  /** USDC received by the vault in this transaction */
  usdcReceived: number;
};

type TxNode = {
  digest: string;
  sender: { address: string } | null;
  effects: {
    timestamp: string | null;
    status: string;
    balanceChanges: { nodes: { owner: { address: string } | null; amount: string; coinType: { repr: string } }[] };
  } | null;
};

export function toVaultTransaction(node: TxNode, vault: string): VaultTransaction {
  const received = (node.effects?.balanceChanges.nodes ?? [])
    .filter((c) => c.owner?.address?.toLowerCase() === vault.toLowerCase() && c.coinType.repr === USDC_COIN_TYPE && BigInt(c.amount) > 0n)
    .reduce((sum, c) => sum + BigInt(c.amount), 0n);
  return {
    digest: node.digest,
    sender: node.sender?.address ?? null,
    timestamp: node.effects?.timestamp ?? null,
    success: node.effects?.status === 'SUCCESS',
    usdcReceived: usdcFromBaseUnits(received),
  };
}

/** About 4.2 checkpoints a second, measured on mainnet in November 2026. */
const CHECKPOINTS_PER_DAY = 364_000;
const LOOKBACK_DAYS = [120, 30, 7];

export async function getLatestCheckpoint(tatum: TatumClient): Promise<number> {
  const data = await tatum.graphql<{ checkpoint: { sequenceNumber: number } }>(endpoint(), '{ checkpoint{ sequenceNumber } }');
  return Number(data.checkpoint.sequenceNumber);
}

/**
 * The gateway prunes old history, and refuses an address filter with no starting checkpoint.
 * So this asks from a recent checkpoint, and looks back less far if that's refused too.
 */
export async function getVaultTransactions(tatum: TatumClient, address: string, last = 50): Promise<VaultTransaction[]> {
  const latest = await getLatestCheckpoint(tatum);
  let lastError: unknown;
  for (const days of LOOKBACK_DAYS) {
    try {
      const data = await tatum.graphql<{ transactions: { nodes: TxNode[] } }>(
        endpoint(),
        `query($a:SuiAddress!,$n:Int!,$f:UInt53!){ transactions(last:$n, filter:{affectedAddress:$a, afterCheckpoint:$f}){ nodes{
          digest sender{address}
          effects{ timestamp status balanceChanges{ nodes{ owner{address} amount coinType{repr} } } }
        } } }`,
        { a: address, n: last, f: latest - days * CHECKPOINTS_PER_DAY },
      );
      return data.transactions.nodes.map((node) => toVaultTransaction(node, address));
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}
