"use client";

import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { OnchainKitProvider } from '@coinbase/onchainkit';
import { base } from 'wagmi/chains';
import { getConfig, getMiniAppConfig } from './wagmi';
import { WagmiProvider } from 'wagmi';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import '@coinbase/onchainkit/styles.css';
import '@rainbow-me/rainbowkit/styles.css';
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';
import { useMiniAppContext } from '@/hooks/useMiniAppContext';

const queryClient = new QueryClient();

export function Providers(props: { children: ReactNode }) {
  const paymasterMainnet =
    process.env.NEXT_PUBLIC_PAYMASTER_AND_BUNDLER_ENDPOINT;
  const chain = base;
  const paymaster = paymasterMainnet;
  const inMiniApp = useMiniAppContext();
  // Strict: only Mini App when detection returns true. Base app + web get OnchainKit.
  const isMini = inMiniApp === true;
  const wagmiConfig = useMemo(() => (isMini ? getMiniAppConfig() : getConfig()), [isMini]);
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        {isMini ? (
          // In Farcaster/Base App, avoid OnchainKit smart wallet modal entirely
          <RainbowKitProvider theme={darkTheme()}>
            {props.children}
          </RainbowKitProvider>
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
            <RainbowKitProvider theme={darkTheme()}>
              {props.children}
            </RainbowKitProvider>
          </OnchainKitProvider>
        )}
      </QueryClientProvider>
    </WagmiProvider>
  );
}
