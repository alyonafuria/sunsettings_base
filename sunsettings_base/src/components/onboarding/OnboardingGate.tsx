"use client";

import * as React from "react";
import { useAccount } from "wagmi";
import OnboardingModal from "./OnboardingModal";

export default function OnboardingGate() {
  const { isConnected, status } = useAccount();
  const [open, setOpen] = React.useState(false);

  // Decide when to show onboarding
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    // Wait until wagmi has resolved connection state to avoid false opens
    if (status === "connecting" || status === "reconnecting") return;
    try {
      const seen = localStorage.getItem("onboarding_seen") === "1";
      const shouldOpen = !seen && !isConnected;
      if (shouldOpen) setOpen(true);
    } catch {
      if (!isConnected) setOpen(true);
    }
  }, [isConnected, status]);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) {
      try { localStorage.setItem("onboarding_seen", "1"); } catch {}
    }
  };

  // Optionally, expose window event to reset onboarding_seen
  React.useEffect(() => {
    const reset = () => {
      try { localStorage.removeItem("onboarding_seen"); } catch {}
      setOpen(true);
    };
    if (typeof window !== "undefined") {
      window.addEventListener("sunsettings:resetOnboarding", reset);
      return () => window.removeEventListener("sunsettings:resetOnboarding", reset);
    }
  }, []);

  return (
    <OnboardingModal open={open} onOpenChange={handleOpenChange} />
  );
}
