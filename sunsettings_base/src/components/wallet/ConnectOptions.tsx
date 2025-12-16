"use client";

import * as React from "react";
import { useConnect } from "wagmi";

export default function ConnectOptions() {
  const { connectors, connectAsync, status, error } = useConnect();
  const [localError, setLocalError] = React.useState<string | null>(null);
  const [pendingId, setPendingId] = React.useState<string | null>(null);

  const findBy = (predicate: (n: string, id: string) => boolean) =>
    connectors.find((c) => predicate(c.name, (c as any).id ?? c.uid ?? c.name));

  const metaMask = findBy((n, id) => /metamask/i.test(n) || /meta/i.test(id));
  const coinbase = findBy((n, id) => /coinbase/i.test(n) || /coinbase/i.test(id));
  const injected = findBy((n, id) => /injected/i.test(n) || /injected/i.test(id));

  const connect = async (connectorKey: string) => {
    try {
      setLocalError(null);
      setPendingId(connectorKey);
      const conn =
        connectorKey === "metamask" ? metaMask : connectorKey === "coinbase" ? coinbase : injected;
      if (!conn) throw new Error("Connector not available");
      await connectAsync({ connector: conn });
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : "Connection failed");
    } finally {
      setPendingId(null);
    }
  };

  const disabled = status === "pending";

  return (
    <div className="flex flex-col gap-2 items-stretch">
      <button
        type="button"
        onClick={() => connect("coinbase")}
        disabled={disabled || pendingId === "coinbase"}
        className="px-4 py-2 border-2 border-black bg-secondary-background hover:opacity-90 disabled:opacity-50"
      >
        {pendingId === "coinbase" ? "Connecting…" : "Connect Coinbase"}
      </button>
      <button
        type="button"
        onClick={() => connect("metamask")}
        disabled={disabled || pendingId === "metamask"}
        className="px-4 py-2 border-2 border-black bg-secondary-background hover:opacity-90 disabled:opacity-50"
      >
        {pendingId === "metamask" ? "Connecting…" : "Connect MetaMask"}
      </button>
      <button
        type="button"
        onClick={() => connect("injected")}
        disabled={disabled || pendingId === "injected"}
        className="px-4 py-2 border-2 border-black bg-secondary-background hover:opacity-90 disabled:opacity-50"
      >
        {pendingId === "injected" ? "Connecting…" : "Connect Rabby / Browser Wallet"}
      </button>
      {(error || localError) ? (
        <div className="mt-1 text-xs text-red-600">
          {String((error as any)?.message || localError)}
        </div>
      ) : null}
    </div>
  );
}
