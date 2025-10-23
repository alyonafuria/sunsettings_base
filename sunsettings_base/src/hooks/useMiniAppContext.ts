"use client";

import { useEffect, useState } from "react";
import { sdk } from "@farcaster/miniapp-sdk";

export function useMiniAppContext() {
  const [inMiniApp, setInMiniApp] = useState<boolean | null>(null);

  useEffect(() => {
    let mounted = true;
    const detect = async () => {
      try {
        type Ctx = { context?: { isInMiniApp?: () => boolean | Promise<boolean> } };
        const ctx = sdk as unknown as Ctx;
        const maybe = ctx.context?.isInMiniApp ? ctx.context.isInMiniApp() : false;
        const val = await Promise.resolve(maybe);
        if (mounted) setInMiniApp(!!val);
      } catch {
        if (mounted) setInMiniApp(false);
      }
    };
    detect();
    return () => { mounted = false };
  }, []);

  return inMiniApp;
}
