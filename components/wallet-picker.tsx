'use client';

import { DAppKitProvider, createDAppKit, useCurrentAccount } from '@mysten/dapp-kit-react';
import { ConnectButton } from '@mysten/dapp-kit-react/ui';
import { SuiGrpcClient } from '@mysten/sui/grpc';

// Only used to read the connected address. Kyvo never asks a wallet to sign or send anything.
const dAppKit = createDAppKit({
  networks: ['mainnet'],
  autoConnect: false,
  createClient: (network) => new SuiGrpcClient({ network, baseUrl: 'https://fullnode.mainnet.sui.io:443' }),
});

function Picker({ onAddress, saving }: { onAddress: (address: string) => void; saving: boolean }) {
  const account = useCurrentAccount();
  return (
    <div className="flex flex-wrap items-center gap-xs">
      <ConnectButton instance={dAppKit} />
      {account && (
        <button onClick={() => onAddress(account.address)} disabled={saving} className="rounded-full bg-brand-solid px-md py-xs text-sm font-semibold text-primary-on-brand disabled:opacity-50">
          Use {account.address.slice(0, 6)}…{account.address.slice(-4)} as my vault
        </button>
      )}
    </div>
  );
}

export default function WalletPicker(props: { onAddress: (address: string) => void; saving: boolean }) {
  return (
    <DAppKitProvider dAppKit={dAppKit}>
      <Picker {...props} />
    </DAppKitProvider>
  );
}
