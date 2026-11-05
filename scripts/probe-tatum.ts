// Confirms every Tatum call Kyvo depends on returns real data (architecture §8).
// Run: pnpm probe:tatum [vault address]
const USDC = '0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC';
const VAULT = process.argv[2] ?? '0x6a9da6d366b8abe74aaf59929f7c107c522dffbcd81d00ea37a7f9e65d6d7ca0';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name} in .env.local`);
  return value;
}

const apiKey = requireEnv('TATUM_API_KEY');
const graphqlUrl = requireEnv('TATUM_SUI_GRAPHQL');

async function graphql(query: string, variables: Record<string, unknown>) {
  const started = Date.now();
  const response = await fetch(graphqlUrl, {
    method: 'POST',
    headers: { 'x-api-key': apiKey, 'content-type': 'application/json' },
    body: JSON.stringify({ query, variables }),
    signal: AbortSignal.timeout(30_000),
  });
  const body = await response.json();
  return { status: response.status, ms: Date.now() - started, body };
}

async function rest(path: string) {
  const started = Date.now();
  const response = await fetch(`https://api.tatum.io${path}`, {
    headers: { 'x-api-key': apiKey },
    signal: AbortSignal.timeout(30_000),
  });
  const text = await response.text();
  return { status: response.status, ms: Date.now() - started, text: text.slice(0, 700) };
}

async function main() {
  const balance = await graphql(
    'query($a:SuiAddress!,$c:String!){ address(address:$a){ balance(coinType:$c){ totalBalance } } }',
    { a: VAULT, c: USDC },
  );
  console.log(`vault USDC [${balance.status}, ${balance.ms}ms]:`, JSON.stringify(balance.body));

  const coin = await graphql('query($c:String!){ coinMetadata(coinType:$c){ symbol decimals name } }', { c: USDC });
  console.log(`USDC coin type [${coin.status}, ${coin.ms}ms]:`, JSON.stringify(coin.body));

  const latest = await graphql(
    'query{ transactions(last:1){ nodes{ digest sender{address} effects{ timestamp status balanceChanges{ nodes{ owner{address} amount coinType{repr} } } } } } }',
    {},
  );
  console.log(`latest transaction [${latest.status}, ${latest.ms}ms]:`, JSON.stringify(latest.body).slice(0, 500));

  const digest = latest.body?.data?.transactions?.nodes?.[0]?.digest;
  if (digest) {
    const byDigest = await graphql('query($d:String!){ transaction(digest:$d){ digest effects{ status timestamp } } }', { d: digest });
    console.log(`lookup by digest [${byDigest.status}, ${byDigest.ms}ms]:`, JSON.stringify(byDigest.body));
  }

  const history = await graphql(
    'query($a:SuiAddress!){ transactions(last:5, filter:{affectedAddress:$a}){ nodes{ digest } } }',
    { a: VAULT },
  );
  console.log(`vault history filter [${history.status}, ${history.ms}ms]:`, JSON.stringify(history.body).slice(0, 300));

  const rate = await rest('/v4/data/rate/symbol?symbol=USDC&basePair=NGN');
  console.log(`FX USDC→NGN [${rate.status}, ${rate.ms}ms]:`, rate.text);
}

main().catch((error) => {
  console.error('probe failed:', (error as Error).message);
  process.exitCode = 1;
});
