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

declare module "wagmi" {
  interface Register {
    config: ReturnType<typeof getConfig>;
  }
}
