"use client"

import * as React from "react"
import { useSearchParams } from "next/navigation"
import FlipCard from "@/components/ai/FlipCard"
import UploadPhotoPanel from "@/components/ai/UploadPhotoPanel"
import { getWeatherSummary } from "@/lib/weather/getWeatherSummary"

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
  const [cardForceClosed, setCardForceClosed] = React.useState(false)
  const [cardCloseSignal, setCardCloseSignal] = React.useState(0)

  // Derive lat/lon from URL for display fallback
  const latStr = sp.get("lat")
  const lonStr = sp.get("lon") || sp.get("lng")
  const latNum = latStr ? Number(latStr) : undefined
  const lonNum = lonStr ? Number(lonStr) : undefined

  // Resolve location label from cache or fallback to coordinates
  React.useEffect(() => {
    const cached = buildLocationLabelFromCache()
    if (cached) setLocationLabel(cached)
    else if (latStr && lonStr) setLocationLabel(`${latStr}, ${lonStr}`)
    else setLocationLabel("")
  }, [latStr, lonStr])

  // Shared weather summary builder (BrightSky -> OpenMeteo fallback)
  const buildWeatherFeatures = React.useCallback(async (lat: number, lon: number): Promise<string> => {
    try {
      return await getWeatherSummary(lat, lon)
    } catch {
      return ""
    }
  }, [])

  // Trigger analysis when arriving or when coords change
  React.useEffect(() => {
    let cancelled = false
    const doAnalyze = async () => {
      setLoading(true)
      setError(null)
      try {
        // Build weather summary if coords available; else let API use fallback
        const weatherSummary =
          typeof latNum === "number" && typeof lonNum === "number"
            ? await buildWeatherFeatures(latNum, lonNum)
            : ""

        const res = await fetch("/api/sunset-analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            location: locationLabel || "Unknown",
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
      }
    }

    // Run if we have either a label or valid coordinates
    if (locationLabel || (typeof latNum === "number" && typeof lonNum === "number")) doAnalyze()
    return () => {
      cancelled = true
    }
  }, [locationLabel, latNum, lonNum, buildWeatherFeatures])

  // Hide on ESC
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
        <FlipCard
          location={locationLabel}
          probability={probability}
          description={description}
          loading={loading}
          error={error}
          forceClosed={cardForceClosed}
          closeSignal={cardCloseSignal}
        />
        <UploadPhotoPanel
          locationLabel={locationLabel}
          coords={{ lat: latNum, lon: lonNum }}
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
            // Do not hide the uploader; just close FlipCard if needed
            setCardForceClosed(false)
            setCardCloseSignal((n) => n + 1)
          }}
        />
      </div>
    </div>
  )
}
