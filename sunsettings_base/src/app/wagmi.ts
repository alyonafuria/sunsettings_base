// @noErrors: 2554
import { http, cookieStorage, createConfig, createStorage } from "wagmi";
import { base } from "wagmi/chains";
import { coinbaseWallet, injected, metaMask } from "wagmi/connectors";

// const projectID = process.env.NEXT_PUBLIC_PROJECT_ID; // unused
// const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL; // unused

export function getConfig() {
  return createConfig({
    chains: [base],
    connectors: [
      coinbaseWallet({
        appName: "Sunsettings",
        preference: "smartWalletOnly",
        version: "4",
      }),
      metaMask({
        dappMetadata: {
          name: "Sunsettings",
        },
      }),
      injected(),
    ],
    storage: createStorage({
      storage: cookieStorage,
    }),
    ssr: true,
    transports: {
      [base.id]: http(),
    },
  });
}

// Prefer the Base/Farcaster injected provider when running inside the Mini App.
// Avoid forcing smart wallets here to prevent Base smart wallet modal from opening.
export function getMiniAppConfig() {
  return createConfig({
    chains: [base],
    connectors: [
      injected(),
      coinbaseWallet({
        appName: 'Sunsettings',
        preference: 'eoaOnly',
        version: '4',
      }),
      metaMask({
        dappMetadata: {
          name: 'Sunsettings',
        },
      }),
    ],
    storage: createStorage({
      storage: cookieStorage,
    }),
    ssr: true,
    transports: {
      [base.id]: http(),
    },
  });
}

// Prefer the Base/Farcaster injected provider when running inside the Mini App.
// Avoid forcing smart wallets here to prevent Base smart wallet modal from opening.
export function getMiniAppConfig() {
  return createConfig({
    chains: [base],
    connectors: [
      injected(),
      coinbaseWallet({
        appName: 'Sunsettings',
        preference: 'eoaOnly',
        version: '4',
      }),
      metaMask({
        dappMetadata: {
          name: 'Sunsettings',
        },
      }),
    ],
    storage: createStorage({
      storage: cookieStorage,
    }),
    ssr: true,
    transports: {
      [base.id]: http(),
    },
  });
}

declare module "wagmi" {
  interface Register {
    config: ReturnType<typeof getConfig> | ReturnType<typeof getMiniAppConfig>;
  }
}
