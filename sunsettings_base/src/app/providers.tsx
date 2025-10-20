'use client';

import type { ReactNode } from 'react';
import { OnchainKitProvider } from '@coinbase/onchainkit';
import { baseSepolia } from 'wagmi/chains';
import { getConfig } from './wagmi';
import { WagmiProvider } from 'wagmi';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import '@coinbase/onchainkit/styles.css';

const queryClient = new QueryClient();

export function Providers(props: { children: ReactNode }) {
  return (
    <WagmiProvider config={getConfig()}>
    <QueryClientProvider client={queryClient}>
    <OnchainKitProvider
      apiKey={process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY}
      chain={baseSepolia}
      config={{
        wallet: {
          display: "modal",
        }
      }}
    >
      {props.children}
    </OnchainKitProvider>
    </QueryClientProvider>
    </WagmiProvider>
  );
}