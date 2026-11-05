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
    .filter((c) => c.owner?.address === vault && c.coinType.repr === USDC_COIN_TYPE && BigInt(c.amount) > 0n)
    .reduce((sum, c) => sum + BigInt(c.amount), 0n);
  return {
    digest: node.digest,
    sender: node.sender?.address ?? null,
    timestamp: node.effects?.timestamp ?? null,
    success: node.effects?.status === 'SUCCESS',
    usdcReceived: usdcFromBaseUnits(received),
  };
}

export async function getVaultTransactions(tatum: TatumClient, address: string, last = 50): Promise<VaultTransaction[]> {
  const data = await tatum.graphql<{ transactions: { nodes: TxNode[] } }>(
    endpoint(),
    `query($a:SuiAddress!,$n:Int!){ transactions(last:$n, filter:{affectedAddress:$a}){ nodes{
      digest sender{address}
      effects{ timestamp status balanceChanges{ nodes{ owner{address} amount coinType{repr} } } }
    } } }`,
    { a: address, n: last },
  );
  return data.transactions.nodes.map((node) => toVaultTransaction(node, address));
}
