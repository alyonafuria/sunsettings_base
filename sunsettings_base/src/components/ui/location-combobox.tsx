"use client"

import * as React from "react"
import dynamic from "next/dynamic"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import type { Option } from "./location-combobox/types"
import { DEFAULT_LOCATIONS } from "./location-combobox/constants"
import { useLocationCombobox } from "./location-combobox/hooks"

export function LocationCombobox({
  options = DEFAULT_LOCATIONS,
  value,
  onChange,
  placeholder = "Choose your location",
  className,
  onOpenChange,
  onDetectedCoords,
  onResolveCoords,
}: {
  options?: Option[]
  value?: string | null
  onChange?: (value: string) => void
  placeholder?: string
  className?: string
  onOpenChange?: (open: boolean) => void
  onDetectedCoords?: (lat: number, lon: number) => void
  onResolveCoords?: (label: string) => void
}): React.JSX.Element {
  const {
    open,
    setOpen,
    opts,
    error,
    search,
    setSearch,
    currentValue,
    detectLoading,
    suggestions,
    suggestLoading,
    selectedLabel,
    runDetection,
    handleSelect,
    handleFreeform,
    prefetchDropdown,
  } = useLocationCombobox({ options, value, onChange, onDetectedCoords, onResolveCoords })

  // Lazy-load the heavy dropdown content only when needed
  const LazyContent = React.useMemo(
    () =>
      dynamic(() => import("@/components/ui/location-combobox/Content").then((m) => m.LocationComboboxContent), {
        ssr: false,
        loading: () => (
          <div className="p-3 w-80">
            <div className="h-8 bg-white/10 rounded mb-2" />
            <div className="h-8 bg-white/10 rounded mb-2" />
            <div className="h-8 bg-white/10 rounded" />
          </div>
        ),
      }),
    [],
  )

  // detection will be triggered explicitly by a menu item

  const handleOpenChange = React.useCallback(
    (v: boolean) => {
      setOpen(v)
      onOpenChange?.(v)
    },
    [onOpenChange, setOpen],
  )

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          key={currentValue ?? "__none__"}
          type="button"
          className={cn(
            "inline-flex items-center justify-between gap-2 h-12 px-4 border-2 border-border bg-main text-main-foreground rounded-base overflow-hidden",
            // Responsive fixed widths
            "w-[90vw] max-w-[90vw] md:w-[30vw] md:max-w-[30vw]",
            "shadow-shadow transition-colors",
            className,
          )}
          onMouseEnter={prefetchDropdown}
          onFocus={prefetchDropdown}
          onTouchStart={prefetchDropdown}
        >
          <span className="truncate flex-1 min-w-0">
            {detectLoading ? "Detecting location..." : selectedLabel ?? placeholder}
          </span>
          {detectLoading ? (
            <span
              className="inline-block size-4 border-2 border-main-foreground/40 border-t-main-foreground rounded-full animate-spin"
              aria-label="Loading"
            />
          ) : (
            <span aria-hidden className="opacity-80 shrink-0 inline-flex items-center justify-center">
              <svg
                viewBox="0 0 24 24"
                fill="currentColor"
                className="w-5 h-5"
                aria-hidden
              >
                <path d="M7 10l5 5 5-5z" />
              </svg>
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="bottom"
        align="center"
        sideOffset={8}
        avoidCollisions={false}
        className="p-0 border-0 shadow-none overflow-hidden bg-background w-[90vw] max-w-[90vw] md:w-[25vw] md:max-w-[25vw]"
      >
        {open ? (
          <LazyContent
            opts={opts}
            error={error}
            search={search}
            setSearch={setSearch}
            onSelectValue={handleSelect}
            onFreeform={handleFreeform}
            detectLoading={detectLoading}
            runDetection={runDetection}
            currentValue={currentValue}
            suggestions={suggestions}
            suggestLoading={suggestLoading}
          />
        ) : null}
      </PopoverContent>
    </Popover>
  )
}
