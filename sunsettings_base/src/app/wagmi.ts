// @noErrors: 2554
import { http, cookieStorage, createConfig, createStorage, WagmiProvider } from 'wagmi';
import { baseSepolia } from 'wagmi/chains';
import { coinbaseWallet, injected, metaMask } from 'wagmi/connectors';

const projectID = process.env.NEXT_PUBLIC_PROJECT_ID;
const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL;

export function getConfig() {
  return createConfig({
    chains: [baseSepolia],
    connectors: [
      coinbaseWallet({
        appName: 'Sunsettings',
        preference: 'smartWalletOnly',
        version: '4',
      }),
      metaMask({
        dappMetadata: {
          name: 'Sunsettings',
        },
      }),
      injected()
    ],
    storage: createStorage({
      storage: cookieStorage,
    }),
    ssr: true,
    transports: {
      [baseSepolia.id]: http(),
    },
  });
}

declare module 'wagmi' {
  interface Register {
    config: ReturnType<typeof getConfig>;
  }
}