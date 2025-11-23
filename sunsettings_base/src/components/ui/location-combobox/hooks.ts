"use client"

import * as React from "react"
import type { Option } from "./types"
import { reverseGeocode } from "./geocode"
import { searchPlaces, buildAcceptLanguage } from "@/lib/nominatim"
import { getPreferredLocation } from "@/lib/location"

export function useLocationCombobox({
  options,
  value,
  onChange,
  onDetectedCoords,
  onResolveCoords,
}: {
  options: Option[]
  value?: string | null
  onChange?: (value: string) => void
  onDetectedCoords?: (lat: number, lon: number) => void
  onResolveCoords?: (label: string) => void
}) {
  const [open, setOpen] = React.useState(false)
  const [internalValue, setInternalValue] = React.useState<string | null>(value ?? null)
  const [opts, setOpts] = React.useState<Option[]>(options)
  const [error, setError] = React.useState<string | null>(null)
  const [search, setSearch] = React.useState<string>("")
  const [currentValue, setCurrentValue] = React.useState<string | null>(null)
  const [lastPicked, setLastPicked] = React.useState<Option | null>(null)
  const didStartRef = React.useRef(false)
  const userSelectedRef = React.useRef(false)
  const [detectLoading, setDetectLoading] = React.useState(false)
  const [suggestions, setSuggestions] = React.useState<Option[]>([])
  const [suggestLoading, setSuggestLoading] = React.useState(false)

  const sortOptions = React.useCallback((list: Option[]) => {
    const coll = new Intl.Collator(typeof navigator !== "undefined" ? navigator.language : "en", { sensitivity: "base" })
    return [...list].sort((a, b) => coll.compare(a.label, b.label))
  }, [])

  React.useEffect(() => {
    if (value !== undefined) setInternalValue(value)
  }, [value])

  React.useEffect(() => {
    setOpts(options)
  }, [options])

  // Cache hydration on mount
  React.useEffect(() => {
    if (didStartRef.current) return
    didStartRef.current = true
    if (typeof window === "undefined") return
    try {
      const raw = localStorage.getItem("locationCache")
      if (raw) {
        const cached = JSON.parse(raw) as { label: string; value: string; timestamp: number }
        if (cached?.value && cached?.label) {
          setLastPicked({ value: cached.value, label: cached.label })
          setInternalValue((iv) => iv ?? cached.value)
          setCurrentValue((cv) => cv ?? cached.value)
          onChange?.(cached.value)
          // Also resolve coordinates by cached label so downstream can act immediately (e.g., enable Calculate)
          try { onResolveCoords?.(cached.label) } catch {}
        }
      }
    } catch {}
  }, [onChange, onResolveCoords])

  // Explicit detection (Base-aware)
  const runDetection = React.useCallback(() => {
    setDetectLoading(true)
    setError(null)
    const controller = new AbortController()
    const t = setTimeout(() => controller.abort(), 12000)
    ;(async () => {
      try {
        const pref = await getPreferredLocation()
        const latitude = pref.lat
        const longitude = pref.lon
        const lang = typeof navigator !== "undefined" && navigator.language ? navigator.language : "en"
        const { label, value: detectedValue } = await reverseGeocode(latitude, longitude, controller.signal, lang)

        setLastPicked({ value: detectedValue, label })
        setCurrentValue(detectedValue)
        setInternalValue(detectedValue)
        onChange?.(detectedValue)
        try { onDetectedCoords?.(latitude, longitude) } catch {}
        try {
          localStorage.setItem(
            "locationCache",
            JSON.stringify({ label, value: detectedValue, timestamp: Date.now() }),
          )
        } catch {}
        setTimeout(() => setOpen(false), 0)
      } catch (e: unknown) {
        if (e instanceof DOMException && e.name === "AbortError") setError("Reverse geocoding timed out")
        else setError((e as Error)?.message || "Failed to detect location")
      } finally {
        clearTimeout(t)
        setDetectLoading(false)
      }
    })()
  }, [onChange, onDetectedCoords])

  const selected =
    opts.find((o) => o.value === internalValue) ||
    (lastPicked && lastPicked.value === internalValue ? lastPicked : null)

  // Debounced suggestions (1s)
  React.useEffect(() => {
    const q = search.trim()
    if (!open || q.length < 2) {
      setSuggestions([])
      setSuggestLoading(false)
      return
    }
    setSuggestLoading(true)
    const controller = new AbortController()
    const handle = setTimeout(async () => {
      try {
        const acceptLang = buildAcceptLanguage()
        const mapped = await searchPlaces(q, { limit: 8, signal: controller.signal, lang: acceptLang })
        setSuggestions(mapped)
      } catch (e: unknown) {
        if (!(e instanceof DOMException && e.name === "AbortError")) {
          // ignore
        }
      } finally {
        setSuggestLoading(false)
      }
    }, 1000)
    return () => {
      controller.abort()
      clearTimeout(handle)
    }
  }, [search, open])

  const handleSelect = (val: string) => {
    userSelectedRef.current = true
    const inSuggest = suggestions.find((s) => s.value === val)
    if (inSuggest) {
      setLastPicked(inSuggest)
      try {
        localStorage.setItem(
          "locationCache",
          JSON.stringify({ label: inSuggest.label, value: inSuggest.value, timestamp: Date.now() }),
        )
      } catch {}
      // Ask parent to resolve coordinates by label for suggestions
      try { onResolveCoords?.(inSuggest.label) } catch {}
    }
    if (!inSuggest) {
      const inOpts = opts.find((o) => o.value === val)
      if (inOpts) {
        // Persist default option selections too, so it becomes the new last-picked
        setLastPicked(inOpts)
        try {
          localStorage.setItem(
            "locationCache",
            JSON.stringify({ label: inOpts.label, value: inOpts.value, timestamp: Date.now() }),
          )
        } catch {}
        try { onResolveCoords?.(inOpts.label) } catch {}
      }
    }
    setInternalValue(val)
    setCurrentValue(val)
    onChange?.(val)
    setSuggestions([])
    setSearch("")
    setOpen(false)
  }

  const handleFreeform = (label: string) => {
    const trimmed = label.trim()
    if (!trimmed) return
    const value = `custom_${trimmed.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "")}`
    setOpts((prev) => {
      if (prev.some((o) => o.value === value)) return prev
      return sortOptions([{ value, label: trimmed }, ...prev])
    })
    setLastPicked({ value, label: trimmed })
    userSelectedRef.current = true
    setInternalValue(value)
    setCurrentValue(value)
    onChange?.(value)
    // Ask parent to resolve coordinates by label for freeform
    try { onResolveCoords?.(trimmed) } catch {}
    setSuggestions([])
    setSearch("")
    setOpen(false)
  }

  const prefetchDropdown = React.useCallback(() => {
    import("./Content").then(() => {})
  }, [])

  return {
    // state
    open,
    setOpen,
    internalValue,
    opts,
    error,
    search,
    setSearch,
    currentValue,
    detectLoading,
    suggestions,
    suggestLoading,
    // derived
    selected,
    selectedLabel: selected ? selected.label : null,
    // actions
    runDetection,
    handleSelect,
    handleFreeform,
    prefetchDropdown,
  }
}
