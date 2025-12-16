"use client";

import * as React from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { useChainId, useSwitchChain } from "wagmi";
import { base, celo } from "wagmi/chains";

type ChainIdUnion = typeof base.id | typeof celo.id;

export type ChainOption = {
  id: ChainIdUnion;
  label: string;
  short: string;
  icon?: React.ReactNode;
};

const ChainIcon = ({ type }: { type: "base" | "celo" }) => {
  if (type === "base") {
    return (
      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden>
        <circle cx="12" cy="12" r="10" fill="#0052FF" />
        <rect x="6.5" y="11" width="11" height="2" rx="1" fill="#fff" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden>
      <circle cx="12" cy="12" r="10" fill="#35D07F" />
      <circle cx="12" cy="12" r="4" fill="#fff" />
    </svg>
  );
};

const CHAINS: ChainOption[] = [
  { id: base.id, label: "Base", short: "Base", icon: <ChainIcon type="base" /> },
  { id: celo.id, label: "Celo", short: "Celo", icon: <ChainIcon type="celo" /> },
];

export default function ChainCombobox({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  const chainId = useChainId() as ChainIdUnion;
  const { switchChain, isPending } = useSwitchChain();
  const [open, setOpen] = React.useState(false);
  const current = CHAINS.find((c) => c.id === chainId) ?? CHAINS[0];

  const onSelect = async (targetId: ChainIdUnion) => {
    try {
      if (targetId === chainId) {
        setOpen(false);
        return;
      }
      switchChain({ chainId: targetId });
      setOpen(false);
    } catch {
      // swallow; UI remains
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {compact ? (
          <button
            type="button"
            className={cn(
              "inline-flex items-center justify-center w-8 h-8 p-0 border-2 border-border bg-main text-main-foreground rounded-base overflow-hidden shadow-shadow",
              className
            )}
            disabled={isPending}
            aria-label={`${current.label} chain`}
            title={current.label}
          >
            <span className="shrink-0">{current.icon}</span>
          </button>
        ) : (
          <button
            type="button"
            className={cn(
              "inline-flex items-center justify-between gap-2 h-10 px-3 border-2 border-border bg-main text-main-foreground rounded-base overflow-hidden",
              "w-[60vw] max-w-[60vw] md:w-[16rem] md:max-w-[16rem]",
              "shadow-shadow transition-colors",
              className
            )}
            disabled={isPending}
          >
            <span className="inline-flex items-center gap-2">
              <span className="shrink-0">{current.icon}</span>
              <span className="truncate">{current.label}</span>
            </span>
            <span aria-hidden className="opacity-80 shrink-0 inline-flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4" aria-hidden>
                <path d="M7 10l5 5 5-5z" />
              </svg>
            </span>
          </button>
        )}
      </PopoverTrigger>
      <PopoverContent
        side="bottom"
        align="end"
        sideOffset={8}
        avoidCollisions={false}
        className={cn(
          "p-0 border-0 shadow-none overflow-hidden bg-background",
          compact
            ? "w-[80vw] max-w-[80vw] md:w-[16rem] md:max-w-[16rem]"
            : "w-[60vw] max-w-[60vw] md:w-[16rem] md:max-w-[16rem]"
        )}
      >
        <Command>
          <CommandList>
            <CommandEmpty>No chains</CommandEmpty>
            <CommandGroup heading="Chains">
              {CHAINS.map((c) => (
                <CommandItem
                  key={c.id}
                  value={c.label}
                  onSelect={() => onSelect(c.id)}
                  className="aria-selected:outline-0"
                >
                  <span className="mr-2 inline-flex items-center justify-center shrink-0">{c.icon}</span>
                  <span className="truncate">{c.label}</span>
                  {c.id === chainId && (
                    <span className="ml-2 rounded-base border-2 border-border px-2 py-0.5 text-xs opacity-80">
                      Current
                    </span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
