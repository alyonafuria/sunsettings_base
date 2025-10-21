import { createConfig, http } from "wagmi"
import { baseSepolia } from "wagmi/chains"
import { coinbaseWallet, injected, walletConnect } from "wagmi/connectors"

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || process.env.NEXT_PUBLIC_PROJECT_ID || ""
const chain = baseSepolia
const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || chain.rpcUrls.default.http[0]

// Control Coinbase Wallet behavior. Default to EOA only to avoid Smart Wallet
// domain authorization errors in local/dev unless explicitly enabled.
const coinbasePreference = (process.env.NEXT_PUBLIC_COINBASE_PREFERENCE as
  | "all"
  | "smartWalletOnly"
  | "eoaOnly") || "eoaOnly"

const connectors = [
  coinbaseWallet({
    appName: "Sunsettings",
    preference: coinbasePreference,
    chainId: chain.id,
    jsonRpcUrl: rpcUrl,
  }),
  injected({ shimDisconnect: true }),
  ...(projectId
    ? [
        walletConnect({
          projectId,
          showQrModal: true,
          metadata: {
            name: "Sunsettings",
            description: "Capture sunsets and mint NFTs",
            url: "https://sunsettings.app",
            icons: ["https://sunsettings.app/icon.png"],
          },
        }),
      ]
    : []),
] as const

export const wagmiConfig = createConfig({
  chains: [chain],
  connectors,
  transports: {
    [chain.id]: http(rpcUrl),
  },
  ssr: typeof window === "undefined",
})
