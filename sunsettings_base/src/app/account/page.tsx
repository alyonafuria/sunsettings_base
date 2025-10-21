"use client";

import * as React from "react";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import AccountInfo from "@/components/account/AccountInfo";
import Gallery from "@/components/account/Gallery";

export default function AccountPage() {
  const { address, isConnecting, isConnected } = useAccount();
  const { connectors, connectAsync, status: connectStatus, error: connectError } = useConnect();
  const { disconnect } = useDisconnect();

  const [avatarUrl, setAvatarUrl] = React.useState<string | null>(null);
  const [items, setItems] = React.useState<string[]>([]);

  React.useEffect(() => {
    // TODO: when connected, fetch NFTs for this address and setItems([...])
    if (!isConnected) {
      setItems([]);
      return;
    }
    // placeholder: keep empty until wired
    setItems([]);
  }, [isConnected, address]);

  const connectCoinbase = async () => {
    try {
      // Prefer coinbaseWallet connector
      const coinbase = connectors.find((c) => /coinbase/i.test(c.name));
      await connectAsync({ connector: coinbase ?? connectors[0] });
    } catch {}
  };

  return (
    <div className="w-full min-h-screen flex flex-col">
      {/* Top section: ~20% viewport height */}
      <div className="h-[20vh]">
        <AccountInfo
          loading={!isConnected || isConnecting}
          avatarUrl={avatarUrl}
          wallet={address ?? null}
          title={"sunset catcher"}
        />
      </div>

      {/* Bottom gallery or connect CTA */}
      <div className="flex-1">
        {isConnected ? (
          <Gallery items={items} />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-center">
            <div>
              <div className="mb-2 text-sm">Sign up / Log in to catch sunsets</div>
              <button
                type="button"
                onClick={connectCoinbase}
                className="px-4 py-2 border-2 border-black bg-secondary-background hover:opacity-90"
                disabled={connectStatus === 'pending'}
              >
                {connectStatus === 'pending' ? 'Connecting…' : 'Connect wallet'}
              </button>
              {connectError ? (
                <div className="mt-2 text-xs text-red-600">{String(connectError.message || 'Connection failed')}</div>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
