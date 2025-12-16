"use client";

import * as React from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import type { Connector } from "wagmi";

export type WalletOption = {
  value: "coinbase" | "injected";
  label: string;
};

const DEFAULT_WALLETS: WalletOption[] = [
  { value: "coinbase", label: "Base Smart Wallet" },
  { value: "injected", label: "Browser Wallet" },
];

export default function WalletCombobox({
  className,
  placeholder = "Choose a wallet",
  options = DEFAULT_WALLETS,
}: {
  className?: string;
  placeholder?: string;
  options?: WalletOption[];
}) {
  const [open, setOpen] = React.useState(false);
  const [pending, setPending] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const { connectors, connectAsync, status } = useConnect();
  const { connector: activeConnector, isConnected } = useAccount();
  const { disconnect } = useDisconnect();

  const findBy = React.useCallback(
    (pred: (n: string, id: string) => boolean) =>
      connectors.find((c: Connector) => pred(c.name, c.id ?? c.name)),
    [connectors]
  );

  const metaMask = findBy((n, id) => /metamask/i.test(n) || /meta/i.test(id));
  const coinbase = findBy((n, id) => /coinbase/i.test(n) || /coinbase/i.test(id));
  const injected = findBy((n, id) => /injected/i.test(n) || /injected/i.test(id));

  const resolveConnector = (key: WalletOption["value"]): Connector | undefined => {
    if (key === "coinbase") return coinbase ?? injected;
    // Browser Wallet: prefer injected (Rabby/MetaMask), then MetaMask explicit, then Coinbase as fallback
    return injected ?? metaMask ?? coinbase ?? connectors[0];
  };

  const onSelect = async (key: WalletOption["value"]) => {
    try {
      setError(null);
      setPending(key);
      const conn = resolveConnector(key);
      if (!conn) throw new Error("No compatible wallet found");
      // If already connected to the same connector, try to prompt account selection; otherwise reset connection first
      if (isConnected && activeConnector && activeConnector.id === conn.id) {
        try {
          type Eip1193Provider = { request: (args: { method: string; params?: unknown[] | object }) => Promise<unknown> };
          const providerUnknown = await conn.getProvider?.();
          const provider = providerUnknown as unknown as Partial<Eip1193Provider> | undefined;
          if (provider && typeof provider.request === 'function') {
            await provider.request({ method: "eth_requestAccounts" });
            setOpen(false);
            return;
          }
        } catch {}
        try { disconnect(); } catch {}
      } else if (isConnected && activeConnector && activeConnector.id !== conn.id) {
        try { disconnect(); } catch {}
      }
      await connectAsync({ connector: conn });
      setOpen(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e ?? "");
      if (/already connected/i.test(msg)) {
        try {
          const retryConn = resolveConnector(key);
          if (!retryConn) throw new Error("No compatible wallet found");
          try { disconnect(); } catch {}
          await new Promise((r) => setTimeout(r, 50));
          await connectAsync({ connector: retryConn });
          setOpen(false);
          return;
        } catch (e2) {
          setError(e2 instanceof Error ? e2.message : "Connection failed");
        }
      } else {
        setError(e instanceof Error ? e.message : "Connection failed");
      }
    } finally {
      setPending(null);
    }
  };

  const isBusy = status === "pending" || pending !== null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex items-center justify-between gap-2 h-12 px-4 border-2 border-border bg-main text-main-foreground rounded-base overflow-hidden",
            "w-[90vw] max-w-[90vw] md:w-[30vw] md:max-w-[30vw]",
            "shadow-shadow transition-colors",
            className
          )}
        >
          <span className="truncate flex-1 min-w-0">{pending ? "Connecting…" : placeholder}</span>
          <span aria-hidden className="opacity-80 shrink-0 inline-flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5" aria-hidden>
              <path d="M7 10l5 5 5-5z" />
            </svg>
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="bottom"
        align="center"
        sideOffset={8}
        avoidCollisions={false}
        className="p-0 border-0 shadow-none overflow-hidden bg-background w-[90vw] max-w-[90vw] md:w-[25vw] md:max-w-[25vw]"
      >
        <Command>
          <CommandList>
            <CommandEmpty>No wallets available.</CommandEmpty>
            <CommandGroup heading="Wallets">
              {options.map((opt, idx) => (
                <React.Fragment key={opt.value}>
                  {idx === 1 ? (
                    <div className="my-1 border-t-2 border-black" />
                  ) : null}
                  <CommandItem
                    value={opt.label}
                    onSelect={() => onSelect(opt.value)}
                    className="aria-selected:outline-0"
                    disabled={isBusy}
                  >
                    <span className="truncate">{opt.label}</span>
                  </CommandItem>
                </React.Fragment>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
        {error ? <div className="px-3 py-2 text-xs text-red-600">{error}</div> : null}
      </PopoverContent>
    </Popover>
  );
}
