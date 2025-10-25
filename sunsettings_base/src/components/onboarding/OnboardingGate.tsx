"use client";

import * as React from "react";
import { useAccount } from "wagmi";
import OnboardingModal from "./OnboardingModal";

export default function OnboardingGate() {
  const { isConnected, status } = useAccount();
  const [open, setOpen] = React.useState(false);
  const timerRef = React.useRef<number | null>(null);

  // Decide when to show onboarding
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    // Debounce the decision to avoid flashing before auth settles
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    timerRef.current = window.setTimeout(() => {
      try {
        const seen = localStorage.getItem("onboarding_seen") === "1";
        // Only show onboarding if user is NOT connected and hasn't seen it
        const shouldOpen = !isConnected && !seen;
        setOpen(shouldOpen);
      } catch {
        if (!isConnected) setOpen(true);
      }
    }, 1000);
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isConnected, status]);

  // Auto-close if user becomes connected after modal opened
  React.useEffect(() => {
    if (isConnected && open) setOpen(false);
  }, [isConnected, open]);

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
