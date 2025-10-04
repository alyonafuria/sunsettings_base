"use client"

import * as React from "react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { cn } from "@/lib/utils"

type Option = {
  value: string
  label: string
}

const DEFAULT_LOCATIONS: Option[] = [
  { value: "new_york", label: "New York, USA" },
  { value: "san_francisco", label: "San Francisco, USA" },
  { value: "london", label: "London, UK" },
  { value: "paris", label: "Paris, France" },
  { value: "berlin", label: "Berlin, Germany" },
  { value: "tokyo", label: "Tokyo, Japan" },
  { value: "sydney", label: "Sydney, Australia" },
]

export function LocationCombobox({
  options = DEFAULT_LOCATIONS,
  value,
  onChange,
  placeholder = "Choose your location",
  className,
}: {
  options?: Option[]
  value?: string | null
  onChange?: (value: string) => void
  placeholder?: string
  className?: string
}) {
  const [open, setOpen] = React.useState(false)
  const [internalValue, setInternalValue] = React.useState<string | null>(value ?? null)

  React.useEffect(() => {
    if (value !== undefined) setInternalValue(value)
  }, [value])

  const selected = options.find((o) => o.value === internalValue)

  const handleSelect = (val: string) => {
    setInternalValue(val)
    onChange?.(val)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex items-center justify-between gap-2 h-12 px-4 min-w-72 border-2 border-border bg-main text-main-foreground rounded-base font-heading",
            "shadow-shadow transition-colors",
            className,
          )}
        >
          <span className="truncate">
            {selected ? selected.label : placeholder}
          </span>
          <span aria-hidden className="opacity-60">▾</span>
        </button>
      </PopoverTrigger>
      <PopoverContent side="bottom" align="center" sideOffset={8} avoidCollisions={false} className="p-0 w-80">
        <Command>
          <CommandInput placeholder="Search locations..." />
          <CommandList>
            <CommandEmpty>No locations found.</CommandEmpty>
            <CommandGroup heading="Locations">
              {options.map((opt) => (
                <CommandItem
                  key={opt.value}
                  value={opt.label}
                  onSelect={() => handleSelect(opt.value)}
                  className={cn(internalValue === opt.value && "aria-selected:outline-2")}
                >
                  <span className="truncate">{opt.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
