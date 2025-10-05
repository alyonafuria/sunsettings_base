"use client"

import * as React from "react"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import type { Option } from "./types"

export function LocationComboboxContent({
  opts,
  error,
  search,
  setSearch,
  onSelectValue,
  onFreeform,
  detectLoading,
  runDetection,
  currentValue,
  suggestions,
  suggestLoading,
}: {
  opts: Option[]
  error: string | null
  search: string
  setSearch: (v: string) => void
  onSelectValue: (value: string) => void
  onFreeform: (label: string) => void
  detectLoading: boolean
  runDetection: () => void
  currentValue: string | null
  suggestions: Option[]
  suggestLoading: boolean
}) {
  const inputRef = React.useRef<HTMLInputElement | null>(null)
  React.useEffect(() => {
    // Focus shortly after mount to ensure it's in the tree
    const id = requestAnimationFrame(() => {
      inputRef.current?.focus()
    })
    return () => cancelAnimationFrame(id)
  }, [])
  const hasQuery = search.trim().length > 0
  return (
    <Command>
      <CommandInput
        placeholder={error ? "Type your city..." : "Search locations..."}
        value={search}
        onValueChange={setSearch}
        ref={inputRef}
        onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
          if (e.key === "Enter") {
            const q = search.trim()
            if (!q) return
            e.preventDefault()
            if (suggestions && suggestions.length > 0) {
              onSelectValue(suggestions[0].value)
            } else {
              onFreeform(q)
            }
          }
        }}
      />
      {suggestLoading && search.trim().length >= 2 && (
        <div className="px-3 py-1 text-xs text-foreground/70">Searching…</div>
      )}
      <CommandList>
        <CommandEmpty>No locations found.</CommandEmpty>
        {hasQuery && suggestions && suggestions.length > 0 && (
          <CommandGroup heading="Suggestions">
            {suggestions.map((s) => (
              <CommandItem
                key={s.value}
                value={s.label}
                onSelect={() => onSelectValue(s.value)}
                className={"aria-selected:outline-0"}
              >
                <span className="truncate">{s.label}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {!hasQuery && (
          <CommandGroup heading={error ? `Locations (Error: ${error})` : "Locations"}>
            {"geolocation" in navigator && !detectLoading && (
              <CommandItem
                key="detect_current"
                value="Detect current location"
                onSelect={runDetection}
                className="py-2"
              >
                <span className="mr-2 inline-flex items-center justify-center shrink-0 leading-none w-6 h-6">
                  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className="w-full h-full opacity-70">
                    <path d="M12 2c-3.866 0-7 3.134-7 7 0 5.25 7 13 7 13s7-7.75 7-13c0-3.866-3.134-7-7-7zm0 9.5a2.5 2.5 0 110-5 2.5 2.5 0 010 5z" />
                  </svg>
                </span>
                <span className="truncate">Detect current location</span>
              </CommandItem>
            )}
            {detectLoading && (
              <CommandItem key="detecting" value="Detecting" disabled>
                <span className="truncate">Detecting current location…</span>
              </CommandItem>
            )}
            {opts.map((opt) => (
              <CommandItem
                key={opt.value}
                value={opt.label}
                onSelect={() => onSelectValue(opt.value)}
                className={"aria-selected:outline-0"}
              >
                <span className="truncate">{opt.label}</span>
                {currentValue === opt.value && (
                  <span className="ml-2 rounded-base border-2 border-border px-2 py-0.5 text-xs opacity-80">
                    Current
                  </span>
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </Command>
  )
}
