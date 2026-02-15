"use client";

import type { ReactNode } from 'react';
import { PrivyProvider, dataSuffix } from '@privy-io/react-auth';
import { SmartWalletsProvider } from '@privy-io/react-auth/smart-wallets';
import { WagmiProvider, createConfig } from '@privy-io/wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { base, baseSepolia } from 'wagmi/chains';
import { http } from 'wagmi';
import { useMemo } from 'react';
import { Attribution } from 'ox/erc8021';
import '@coinbase/onchainkit/styles.css';

const queryClient = new QueryClient();

const ERC_8021_ATTRIBUTION_SUFFIX = process.env.NEXT_PUBLIC_BASE_BUILDER_CODE
  ? Attribution.toDataSuffix({
      codes: [process.env.NEXT_PUBLIC_BASE_BUILDER_CODE],
    })
  : undefined;

export function Providers(props: { children: ReactNode }) {
  const wagmiConfig = useMemo(
    () =>
      createConfig({
        chains: [base, baseSepolia],
        transports: {
          [base.id]: http(),
          [baseSepolia.id]: http(),
        },
      }),
    []
  );

  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID as string}
      config={{
        appearance: {
          theme: 'dark',
          accentColor: '#000000',
        },
        loginMethods: ['google', 'email'],
        embeddedWallets: {
          createOnLogin: 'users-without-wallets',
          noPromptOnSignature: false,
        },
        externalWallets: {
          coinbaseWallet: {
            connectionOptions: 'smartWalletOnly',
          },
        },
        defaultChain: base,
        supportedChains: [base, baseSepolia],
        solanaClusters: [],
        plugins: ERC_8021_ATTRIBUTION_SUFFIX ? [dataSuffix(ERC_8021_ATTRIBUTION_SUFFIX)] : [],
      } as any}
    >
      <QueryClientProvider client={queryClient}>
        <WagmiProvider config={wagmiConfig as any}>
          <SmartWalletsProvider>
            {props.children}
          </SmartWalletsProvider>
        </WagmiProvider>
      </QueryClientProvider>
    </PrivyProvider>
  );
}
