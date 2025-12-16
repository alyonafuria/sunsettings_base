// @noErrors: 2554
import { http, cookieStorage, createConfig, createStorage } from "wagmi";
import { base, baseSepolia, celo } from "wagmi/chains";
import { coinbaseWallet, injected, metaMask } from "wagmi/connectors";

// const projectID = process.env.NEXT_PUBLIC_PROJECT_ID; // unused
// const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL; // unused

export function getConfig() {
  return createConfig({
    chains: [base, celo],
    connectors: [
      coinbaseWallet({
        appName: "Sunsettings",
        // Allow users to choose between EOA and Smart Wallet inside Coinbase
        preference: "all",
        version: "4",
        // Provide Paymaster URLs for sponsored transactions (Base only)
        paymasterUrls: {
          [base.id]: process.env
            .NEXT_PUBLIC_PAYMASTER_AND_BUNDLER_ENDPOINT as string,
          [baseSepolia.id]: process.env
            .NEXT_PUBLIC_PAYMASTER_AND_BUNDLER_SEPOLIA_ENDPOINT as string,
        },
      }),
      metaMask({
        dappMetadata: {
          name: "Sunsettings",
        },
      }),
      injected(),
    ],
    storage: createStorage({ storage: cookieStorage, key: "wagmi-web" }),
    ssr: true,
    transports: {
      [base.id]: http(),
      [celo.id]: http(),
    },
  });
}

// Prefer the Base/Farcaster injected provider when running inside the Mini App.
// Avoid forcing smart wallets here to prevent Base smart wallet modal from opening.
export function getMiniAppConfig() {
  return createConfig({
    chains: [base, celo],
    // Expose multiple options even inside Mini App
    connectors: [
      coinbaseWallet({
        appName: "Sunsettings",
        preference: "all",
        version: "4",
        paymasterUrls: {
          [base.id]: process.env
            .NEXT_PUBLIC_PAYMASTER_AND_BUNDLER_ENDPOINT as string,
          [baseSepolia.id]: process.env
            .NEXT_PUBLIC_PAYMASTER_AND_BUNDLER_SEPOLIA_ENDPOINT as string,
        },
      }),
      metaMask({
        dappMetadata: {
          name: "Sunsettings",
        },
      }),
      injected(),
    ],
    // Use a different storage key to avoid reusing prior web connector state
    storage: createStorage({ storage: cookieStorage, key: "wagmi-miniapp" }),
    ssr: true,
    transports: {
      [base.id]: http(),
      [celo.id]: http(),
    },
  });
}

// (duplicate getMiniAppConfig removed)

declare module "wagmi" {
  interface Register {
    config: ReturnType<typeof getConfig> | ReturnType<typeof getMiniAppConfig>;
  }
}
