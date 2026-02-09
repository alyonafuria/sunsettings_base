"use client";

import * as React from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { sdk } from "@farcaster/miniapp-sdk";
import { useMiniAppContext } from "@/hooks/useMiniAppContext";
import AccountInfo from "@/components/account/AccountInfo";
import Gallery from "@/components/account/Gallery";
import { getBasename, getBasenameAvatar } from "@/apis/basenames";
import type { Basename } from "@/apis/basenames";
import PrivyLoginButton from "@/components/auth/PrivyLoginButton";

export default function AccountPage() {
  const { ready, authenticated } = usePrivy();
  const { wallets } = useWallets();
  const inMiniApp = useMiniAppContext();
  const isMini = inMiniApp === true;

  const address = wallets[0]?.address;
  const isConnected = authenticated;
  const isConnecting = !ready;
  const chainId = wallets[0]?.chainId === 'eip155:84532' ? 84532 : 8453;

  type WalletItem = { image: string; time?: number };
  const [items, setItems] = React.useState<WalletItem[]>([]);
  const refetchingRef = React.useRef(false);
  const [basename, setBasename] = React.useState<string | null>(null);
  const [basenameAvatar, setBasenameAvatar] = React.useState<string | null>(null);

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
      const res = await fetch(`/api/wallet-nfts?${params.toString()}`);
      const data = await res.json();
      console.log('[AccountPage] API response:', data);
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
      console.log('[AccountPage] Parsed items:', itemsParsed);
      console.log('[AccountPage] Items with time:', itemsParsed.filter(it => it.time));
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

  React.useEffect(() => {
    if (!authenticated) {
      setItems([]);
      setBasename(null);
      setBasenameAvatar(null);
    }
  }, [authenticated]);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!isConnected || !address) {
          setBasename(null);
          setBasenameAvatar(null);
          return;
        }
        const name = await getBasename(address as `0x${string}`);
        if (!cancelled) {
          const validName: Basename | null = typeof name === 'string' && name.length ? (name as Basename) : null;
          setBasename(validName);
          if (validName) {
            try {
              const av = await getBasenameAvatar(validName);
              if (!cancelled) setBasenameAvatar(typeof av === 'string' && av.length ? av : null);
            } catch {
              if (!cancelled) setBasenameAvatar(null);
            }
          } else {
            setBasenameAvatar(null);
          }
        }
      } catch {
        if (!cancelled) {
          setBasename(null);
          setBasenameAvatar(null);
        }
      }
    })();
    return () => { cancelled = true };
  }, [isConnected, address]);

  // No modal; errors will be set by WalletCombobox via wagmi/useConnect

  const [authPending, setAuthPending] = React.useState(false);
  const [authError, setAuthError] = React.useState<string | null>(null);
  const [fcAuthed, setFcAuthed] = React.useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try { return sessionStorage.getItem('fc_authed') === '1'; } catch { return false; }
  });
  const signInFarcaster = async () => {
    setAuthError(null);
    setAuthPending(true);
    try {
      const bytes = new Uint8Array(16);
      if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
        crypto.getRandomValues(bytes);
      } else {
        for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
      }
      const nonce = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join("");
      type MiniAppSdk = { actions?: { signIn?: (args: { nonce: string }) => Promise<unknown> } };
      const maybe = (sdk as unknown as MiniAppSdk);
      if (!maybe?.actions?.signIn) {
        throw new Error('Farcaster signIn is unavailable in this context');
      }
      const res = await maybe.actions.signIn({ nonce });
      // Log for debugging; UI remains on the same page
      console.log('Farcaster signIn result:', res);
      setFcAuthed(true);
      try { sessionStorage.setItem('fc_authed', '1'); } catch {}
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Sign-in failed';
      console.warn('Farcaster signIn error:', e);
      setAuthError(msg);
    } finally {
      setAuthPending(false);
    }
  };

  return (
    <div className="w-full h-full overflow-auto flex flex-col pb-16">
      {/* Top section: content-sized for mobile to avoid overlap */}
      <div className="shrink-0">
        <AccountInfo
          loading={isConnected && isConnecting}
          avatarUrl={basenameAvatar ?? null}
          wallet={address ?? null}
          displayName={basename ?? null}
          title={"sunset catcher"}
          postTimes={items
            .map((it) => (typeof it.time === "number" ? it.time : undefined))
            .filter((n): n is number => typeof n === "number")}
        />
        {/* Removed Refresh link per request */}
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
                fcAuthed ? (
                  <div className="text-sm">Signed in with Farcaster</div>
                ) : (
                  <button
                    type="button"
                    onClick={signInFarcaster}
                    className="px-4 py-2 border-2 border-black bg-secondary-background hover:opacity-90 disabled:opacity-50"
                    disabled={authPending}
                  >
                    {authPending ? 'Signing in…' : 'Sign in with Farcaster'}
                  </button>
                )
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <PrivyLoginButton />
                </div>
              )}
              {authError ? (
                <div className="mt-2 text-xs text-red-600">
                  {authError}
                </div>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
