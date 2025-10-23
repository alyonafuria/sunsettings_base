"use client";

import { useCallback } from "react";
import { sdk } from "@farcaster/miniapp-sdk";
import { useMiniAppContext } from "@/hooks/useMiniAppContext";

export default function AddMiniAppButton() {
  const inMiniApp = useMiniAppContext();

  const onAdd = useCallback(async () => {
    try {
      await sdk.actions.addMiniApp();
    } catch {
      // no-op; optionally log
    }
  }, []);

  if (!inMiniApp) return null;

  return (
    <button
      type="button"
      onClick={onAdd}
      className="text-xs underline"
      aria-label="Add to Farcaster"
      title="Add to Farcaster"
    >
      Add to Farcaster
    </button>
  );
}
