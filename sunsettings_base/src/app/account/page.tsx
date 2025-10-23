"use client";

import * as React from "react";
import { useAccount, useConnect } from "wagmi";
import { sdk } from "@farcaster/miniapp-sdk";
import { useMiniAppContext } from "@/hooks/useMiniAppContext";
import AccountInfo from "@/components/account/AccountInfo";
import Gallery from "@/components/account/Gallery";

export default function AccountPage() {
  const { address, isConnecting, isConnected, chainId } = useAccount();
  const {
    connectors,
    connectAsync,
    status: connectStatus,
    error: connectError,
  } = useConnect();
  // const { disconnect } = useDisconnect(); // not used on this page
  const inMiniApp = useMiniAppContext();
  const isMini = inMiniApp ?? true;

  // Avatar URL is currently unused; AccountInfo renders a generated avatar when absent
  type WalletItem = { image: string; time?: number };
  const [items, setItems] = React.useState<WalletItem[]>([]);
  const refetchingRef = React.useRef(false);

  const refetch = React.useCallback(async () => {
    if (!isConnected || !address) {
      setItems([]);
      return;
    }
    if (refetchingRef.current) return;
    refetchingRef.current = true;
    try {
      const chain = chainId ?? 8453;
      const params = new URLSearchParams({ address, chainId: String(chain) });
      const res = await fetch(`/api/wallet-nfts?${params.toString()}`, {
        cache: "no-store",
      });
      const data = await res.json();
      const arr: unknown = data?.items;
      type UnknownItem = { image?: unknown; time?: unknown };
      const itemsParsed: WalletItem[] = Array.isArray(arr)
        ? (arr as unknown[])
            .map((v) =>
              typeof v === "object" && v !== null ? (v as UnknownItem) : null
            )
            .filter((v): v is UnknownItem => !!v && typeof v.image === "string")
            .map((v) => ({
              image: String(v.image),
              time: typeof v.time === "number" ? v.time : undefined,
            }))
        : [];
      setItems(itemsParsed);
    } catch {
      setItems([]);
    } finally {
      refetchingRef.current = false;
    }
  }, [isConnected, address, chainId]);

  React.useEffect(() => {
    refetch();
    const onVis: EventListener = () => {
      if (document.visibilityState === "visible") refetch();
    };
    const onMinted: EventListener = () => refetch();
    const onPhotoUploaded: EventListener = () =>
      setTimeout(() => refetch(), 1500);
    if (typeof window !== "undefined") {
      window.addEventListener("visibilitychange", onVis);
      window.addEventListener("sunsettings:nftMinted", onMinted);
      window.addEventListener("sunsettings:photoUploaded", onPhotoUploaded);
    }
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("visibilitychange", onVis);
        window.removeEventListener("sunsettings:nftMinted", onMinted);
        window.removeEventListener(
          "sunsettings:photoUploaded",
          onPhotoUploaded
        );
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

  const signInFarcaster = async () => {
    try {
      const bytes = new Uint8Array(16);
      if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
        crypto.getRandomValues(bytes);
      } else {
        for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
      }
      const nonce = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join("");
      await sdk.actions.signIn({ nonce });
    } catch {}
  };

  return (
    <div className="w-full h-full overflow-auto flex flex-col">
      {/* Top section: content-sized for mobile to avoid overlap */}
      <div className="shrink-0">
        <AccountInfo
          loading={!isConnected || isConnecting}
          avatarUrl={null}
          wallet={address ?? null}
          title={"sunset catcher"}
          postTimes={items
            .map((it) => (typeof it.time === "number" ? it.time : undefined))
            .filter((n): n is number => typeof n === "number")}
        />
      </div>

      {/* Bottom gallery or connect CTA */}
      <div className="flex-1 min-h-0">
        {isConnected ? (
          <Gallery items={items.map((it) => it.image)} />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-center">
            <div>
              <div className="mb-2 text-sm">Sign up / Log in to catch sunsets</div>
              {isMini ? (
                <button
                  type="button"
                  onClick={signInFarcaster}
                  className="px-4 py-2 border-2 border-black bg-secondary-background hover:opacity-90"
                >
                  Sign in with Farcaster
                </button>
              ) : (
                <button
                  type="button"
                  onClick={connectCoinbase}
                  className="px-4 py-2 border-2 border-black bg-secondary-background hover:opacity-90"
                  disabled={connectStatus === 'pending'}
                >
                  {connectStatus === 'pending' ? 'Connecting…' : 'Connect wallet'}
                </button>
              )}
              {connectError ? (
                <div className="mt-2 text-xs text-red-600">
                  {String(connectError.message || "Connection failed")}
                </div>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
