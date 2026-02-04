import { base, baseSepolia } from 'wagmi/chains';

export const privyConfig = {
  appId: process.env.NEXT_PUBLIC_PRIVY_APP_ID as string,
  config: {
    appearance: {
      theme: 'dark' as const,
      accentColor: '#000000',
    },
    loginMethods: ['email', 'wallet', 'farcaster'],
    embeddedWallets: {
      createOnLogin: 'users-without-wallets' as const,
      requireUserPasswordOnCreate: false,
    },
    defaultChain: base,
    supportedChains: [base, baseSepolia],
    externalWallets: {
      coinbaseWallet: {
        connectionOptions: 'all' as const,
      },
    },
  },
};
