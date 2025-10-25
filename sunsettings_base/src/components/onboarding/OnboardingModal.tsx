"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export type OnboardingModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenUpload?: () => void;
};

// Typography and controls now use shared UI components

export default function OnboardingModal({ open, onOpenChange, onOpenUpload }: OnboardingModalProps) {
  const router = useRouter();

  type Step = {
    key: string;
    title: string;
    body: string;
    action?: () => void;
    actionLabel?: string;
  };

  const steps: Step[] = React.useMemo(
    () => [
      {
        key: "welcome",
        title: "Hi!",
        body:
          "A short tour of sunsettings. We will show you where to check the sunset, how to post photos, and where your profile is.",
      },
      {
        key: "what_is_this",
        title: "What is this app?",
        body:
          "SunSettings is a community for sky lovers. We measure the \"beauty of the sunset\", share photos, and mark locations.",
      },
      {
        key: "how_to_score",
        title: "How to calculate the sunset quality?",
        body:
          "We analyze weather data (temperature, clouds, air quality, humidity, wind, and more) to predict the beauty of the sunset - what science says. However, personal perception can differ, so you can set your own rating after you see it.",
      },
      {
        key: "how_to_post",
        title: "How to post a photo?",
        body:
          "When you’re at the same location you analyzed, take a photo directly within the app. We’ll attach rounded coordinates and time.",
        action: onOpenUpload,
        actionLabel: onOpenUpload ? "Open upload" : undefined,
      },
      {
        key: "your_account",
        title: "Your account",
        body:
          "Just sign up, view your posts and track your progress and streaks.",
      },
      {
        key: "lets_go",
        title: "Let’s go!",
        body: "You are ready to become a sunset catcher!",
      },
    ],
    [onOpenUpload, router]
  );

  const [pageIndex, setPageIndex] = React.useState(0);
  const isFirst = pageIndex === 0;
  const isLast = pageIndex === steps.length - 1;
  const step = steps[pageIndex];

  const close = () => onOpenChange(false);
  const complete = () => onOpenChange(false);

  // allow global event to open onboarding
  React.useEffect(() => {
    const handler = () => {
      setPageIndex(0);
      onOpenChange(true);
    };
    if (typeof window !== "undefined") {
      window.addEventListener("open-onboarding", handler);
      return () => window.removeEventListener("open-onboarding", handler);
    }
  }, [onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-none w-[90vw] md:max-w-[960px] max-h-[90vh] overflow-y-auto rounded-2xl p-6 md:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <DialogTitle>{step.title}</DialogTitle>
            <DialogDescription className="mt-2">{step.body}</DialogDescription>
          </div>
        </div>

        {/* Actions using shared Button - single non-wrapping row */}
        <div className="mt-6 flex items-center gap-3 justify-between flex-nowrap">
          {/* Back */}
          <div className="flex items-center gap-3 shrink-0">
            <Button size="sm" variant="neutral" onClick={() => setPageIndex((i) => Math.max(0, i - 1))} disabled={isFirst} aria-disabled={isFirst}>
              Back
            </Button>
          </div>

          {/* Compact step indicator centered */}
          <div className="min-w-0 flex-1 text-center">
            <span className="text-sm font-base text-foreground/80">Step {pageIndex + 1} of {steps.length}</span>
          </div>

          {/* Next / Complete and optional action */}
          <div className="flex items-center gap-3 justify-end shrink-0">
            {!isLast ? (
              <Button size="sm" onClick={() => setPageIndex((i) => Math.min(steps.length - 1, i + 1))}>Next</Button>
            ) : (
              <Button size="sm" onClick={complete}>Let’s go!</Button>
            )}
            {step.action && step.actionLabel && (
              <Button size="sm" variant="neutral" onClick={step.action}>{step.actionLabel}</Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
