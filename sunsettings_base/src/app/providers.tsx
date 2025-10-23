"use client";

import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { OnchainKitProvider } from '@coinbase/onchainkit';
import { base } from 'wagmi/chains';
import { getConfig, getMiniAppConfig } from './wagmi';
import { WagmiProvider } from 'wagmi';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import '@coinbase/onchainkit/styles.css';
import { useMiniAppContext } from '@/hooks/useMiniAppContext';

const queryClient = new QueryClient();

export function Providers(props: { children: ReactNode }) {
  const paymasterMainnet =
    process.env.NEXT_PUBLIC_PAYMASTER_AND_BUNDLER_ENDPOINT;
  const chain = base;
  const paymaster = paymasterMainnet;
  const inMiniApp = useMiniAppContext();
  const wagmiConfig = useMemo(() => (inMiniApp ? getMiniAppConfig() : getConfig()), [inMiniApp]);
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        {inMiniApp ? (
          // In Farcaster/Base App, avoid OnchainKit smart wallet modal entirely
          props.children
        ) : (
          <OnchainKitProvider
            apiKey={process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY}
            chain={chain}
            config={{
              wallet: {
                display: "modal",
              },
              paymaster,
            }}
          >
            {props.children}
          </OnchainKitProvider>
        )}
      </QueryClientProvider>
    </WagmiProvider>
  );
}
