"use client"

import * as React from "react"
import { useSearchParams } from "next/navigation"
import FlipCard from "@/components/ai/FlipCard"
import UploadPhotoPanel from "@/components/ai/UploadPhotoPanel"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
 

function buildLocationLabelFromCache(): string | null {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem("locationCache")
    if (!raw) return null
    const parsed = JSON.parse(raw) as { label?: string } | null
    return parsed?.label ?? null
  } catch {
    return null
  }
}

export default function MapAnalysisOverlay(): React.JSX.Element {
  const sp = useSearchParams()
  const [visible, setVisible] = React.useState(true)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [probability, setProbability] = React.useState<number | null>(null)
  const [description, setDescription] = React.useState<string>("")
  const [locationLabel, setLocationLabel] = React.useState<string>("")
  const locationLabelRef = React.useRef<string>("")
  const [cardForceClosed, setCardForceClosed] = React.useState(false)
  const [cardCloseSignal, setCardCloseSignal] = React.useState(0)
  const [sunsetText, setSunsetText] = React.useState<string>("")
  const [isPastSunset, setIsPastSunset] = React.useState(false)
  const [dayBump, setDayBump] = React.useState(0)
  const [locationMismatch, setLocationMismatch] = React.useState(false)

  // Derive lat/lon from URL for display fallback
  const latStr = sp.get("lat")
  const lonStr = sp.get("lon") || sp.get("lng")
  const latNum = latStr ? Number(latStr) : undefined
  const lonNum = lonStr ? Number(lonStr) : undefined

  React.useEffect(() => {
    const cached = buildLocationLabelFromCache()
    if (cached) setLocationLabel(cached)
    else if (latStr && lonStr) setLocationLabel(`${latStr}, ${lonStr}`)
    else setLocationLabel("")
  }, [latStr, lonStr, dayBump])

  React.useEffect(() => {
    locationLabelRef.current = locationLabel
  }, [locationLabel])

  React.useEffect(() => {
    const now = new Date()
    const nextMidnight = new Date(now)
    nextMidnight.setHours(24, 0, 0, 0)
    const ms = nextMidnight.getTime() - now.getTime()
    const t = window.setTimeout(() => {
      setIsPastSunset(false)
      setDayBump((n) => n + 1)
    }, Math.max(1000, ms))
    return () => window.clearTimeout(t)
  }, [])

  const buildWeatherFeatures = React.useCallback(async (lat: number, lon: number): Promise<{ summary: string; sunsetUtc: string | null; sunsetLocal: string | null }> => {
    try {
      const res = await fetch(`/api/weather?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`, { cache: "no-store" })
      if (!res.ok) return { summary: "", sunsetUtc: null, sunsetLocal: null }
      const data = await res.json().catch(() => null)
      const ws = typeof data?.weatherSummary === "string" ? data.weatherSummary : ""
      const sunsetUtc = typeof data?.sunsetUtc === "string" ? data.sunsetUtc : null
      const sunsetLocal = typeof data?.sunsetLocal === "string" ? data.sunsetLocal : null
      return { summary: ws, sunsetUtc, sunsetLocal }
    } catch {
      return { summary: "", sunsetUtc: null, sunsetLocal: null }
    }
  }, [])

  const inFlightRef = React.useRef<Promise<void> | null>(null)
  const lastKeyRef = React.useRef<string | null>(null)
  const lastAtRef = React.useRef<number>(0)
  const debounceRef = React.useRef<number | null>(null)

  React.useEffect(() => {
    let cancelled = false
    const hasCoords = typeof latNum === "number" && typeof lonNum === "number"
    if (!hasCoords) return () => { cancelled = true }

    const round = (x: number, step = 0.05) => Math.round(x / step) * step
    const ymd = new Date().toISOString().slice(0, 10)
    const key = `${round(latNum as number)},${round(lonNum as number)}:${ymd}`

    if (lastKeyRef.current === key && Date.now() - lastAtRef.current < 2000) {
      return () => { cancelled = true }
    }

    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
      debounceRef.current = null
    }

    debounceRef.current = window.setTimeout(async () => {
      if (cancelled) return
      if (inFlightRef.current) return
      lastKeyRef.current = key
      lastAtRef.current = Date.now()
      setLoading(true)
      setError(null)
      inFlightRef.current = (async () => {
        try {
          const wf = await buildWeatherFeatures(latNum as number, lonNum as number)
          const weatherSummary = wf.summary
          setSunsetText(wf.sunsetLocal || "")
          if (wf.sunsetUtc) {
            try {
              const nowMs = Date.now()
              const sunMs = Date.parse(wf.sunsetUtc)
              if (Number.isFinite(sunMs) && nowMs > sunMs) {
                if (!cancelled) {
                  setIsPastSunset(true)
                  setProbability(null)
                  setDescription("you missed sunset today, go to sleep and try tomorrow")
                  setLoading(false)
                }
                return
              }
              setIsPastSunset(false)
            } catch {}
          }
          setIsPastSunset(false)
          const res = await fetch("/api/sunset-analyze", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              location: locationLabelRef.current || "Unknown",
              weatherSummary,
              seed: Math.floor(Math.random() * 1_000_000),
            }),
          })
          if (!res.ok) throw new Error(`HTTP ${res.status}`)
          const data = (await res.json()) as { ok?: boolean; result?: { probability: number | null; description: string } }
          if (!cancelled && data?.result) {
            setProbability(data.result.probability ?? null)
            setDescription(data.result.description ?? "")
          }
        } catch (e) {
          if (!cancelled) setError((e as Error)?.message || "Failed to analyze")
        } finally {
          if (!cancelled) setLoading(false)
          inFlightRef.current = null
        }
      })()
    }, 200)

    return () => {
      cancelled = true
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
        debounceRef.current = null
      }
    }
  }, [latNum, lonNum, buildWeatherFeatures])

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setVisible(false)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  if (!visible) return <></>

  return (
    <div
      className="pointer-events-none fixed left-1/2 -translate-x-1/2 z-20 w-[min(92vw,640px)]"
      style={{ bottom: "10vh" }}
    >
      <div className="pointer-events-auto space-y-3">
        {locationMismatch && (
          <Alert className="mb-2">
            <AlertTitle>Location mismatch</AlertTitle>
            <AlertDescription>
              Locations of the sunset forecast and photo capture differ. Please re-run analysis for your current location.
            </AlertDescription>
          </Alert>
        )}
        <FlipCard
          location={locationLabel}
          probability={probability}
          description={description}
          loading={loading}
          error={error}
          forceClosed={cardForceClosed}
          closeSignal={cardCloseSignal}
          sunsetText={sunsetText}
        />
        <UploadPhotoPanel
          locationLabel={locationLabel}
          coords={{ lat: latNum, lon: lonNum }}
          onLocationMismatchChange={setLocationMismatch}
          scoreLabel={(function(){
            const p = typeof probability === "number" ? probability : null
            if (p === null) return undefined
            if (p <= 30) return "Horrible"
            if (p <= 50) return "Poor"
            if (p <= 70) return "Okay"
            if (p <= 90) return "Great"
            return "Fabulous"
          })()}
          scorePercent={typeof probability === "number" ? probability : undefined}
          onOpenPicker={() => { setCardForceClosed(true) }}
          onUploadingChange={(u) => { if (u) setCardForceClosed(true) }}
          onUploaded={() => setCardForceClosed(true)}
          onReset={() => setCardForceClosed(false)}
          onCloseRequested={() => {
            setCardForceClosed(false)
            setCardCloseSignal((n) => n + 1)
          }}
        />
      </div>
    </div>
  )
}
