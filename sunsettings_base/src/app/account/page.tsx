"use client";

import * as React from "react";
import { useAccount, useConnect } from "wagmi";
import AccountInfo from "@/components/account/AccountInfo";
import Gallery from "@/components/account/Gallery";

export default function AccountPage() {
  const { address, isConnecting, isConnected, chainId } = useAccount();
  const { connectors, connectAsync, status: connectStatus, error: connectError } = useConnect();
  // const { disconnect } = useDisconnect(); // not used on this page

  // Avatar URL is currently unused; AccountInfo renders a generated avatar when absent
  const [avatarUrl] = React.useState<string | null>(null);
  const [items, setItems] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(false);

  const refetch = React.useCallback(async () => {
    if (!isConnected || !address) {
      setItems([]);
      return;
    }
    setLoading(true);
    try {
      const chain = chainId ?? 8453;
      const params = new URLSearchParams({ address, chainId: String(chain) });
      const res = await fetch(`/api/wallet-nfts?${params.toString()}`, { cache: "no-store" });
      const data = await res.json();
      setItems(Array.isArray(data?.items) ? data.items : []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [isConnected, address, chainId]);

  React.useEffect(() => {
    refetch();
    const onVis: EventListener = () => { if (document.visibilityState === 'visible') refetch(); };
    const onMinted: EventListener = () => refetch();
    const onPhotoUploaded: EventListener = () => setTimeout(() => refetch(), 1500);
    if (typeof window !== 'undefined') {
      window.addEventListener('visibilitychange', onVis);
      window.addEventListener('sunsettings:nftMinted', onMinted);
      window.addEventListener('sunsettings:photoUploaded', onPhotoUploaded);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('visibilitychange', onVis);
        window.removeEventListener('sunsettings:nftMinted', onMinted);
        window.removeEventListener('sunsettings:photoUploaded', onPhotoUploaded);
      }
    };
  }, [refetch]);

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
          avatarUrl={null}
          wallet={address ?? null}
          title={"sunset catcher"}
        />
        <div className="px-4">
          <button
            type="button"
            onClick={refetch}
            className="mt-2 text-xs underline"
            disabled={loading}
          >
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
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
