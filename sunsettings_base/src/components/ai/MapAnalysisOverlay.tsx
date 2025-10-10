"use client"

import * as React from "react"
import { useSearchParams } from "next/navigation"
import FlipCard from "@/components/ai/FlipCard"
import UploadPhotoPanel from "@/components/ai/UploadPhotoPanel"
import { Button } from "@/components/ui/button"

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
  const [uploaderVisible, setUploaderVisible] = React.useState(true)
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

  // Helper: fetch BrightSky and build WeatherFeatures with prompt's expected keys
  const buildWeatherFeatures = React.useCallback(async (lat: number, lon: number): Promise<string> => {
    try {
      const today = new Date()
      const dateParam = today.toISOString().slice(0, 10)
      const url = `https://api.brightsky.dev/weather?date=${dateParam}&lat=${lat}&lon=${lon}&tz=UTC&units=dwd`
      const res = await fetch(url)
      if (!res.ok) throw new Error(`Weather HTTP ${res.status}`)
      const json = await res.json()
      type Rec = { timestamp?: string; cloud_cover?: number; relative_humidity?: number; temperature?: number; precipitation_probability?: number; precipitation?: number }
      const records: Rec[] = (json.weather as Rec[]) || []
      if (!records.length) return ""

      const sameDay = records.filter((r) => r.timestamp?.startsWith(dateParam))
      const sample = sameDay.length ? sameDay : records
      const sunsetWindow = sample.filter((r) => {
        const hour = parseInt(r.timestamp?.substring(11, 13) || "0", 10)
        return hour >= 15 && hour <= 22
      })
      const target = sunsetWindow.length ? sunsetWindow : sample.slice(-6)

      const avg = (arr: number[]) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null)
      const cloudArr = target.map((r) => (typeof r.cloud_cover === "number" ? r.cloud_cover : null)).filter((n): n is number => n !== null)
      const humidArr = target.map((r) => (typeof r.relative_humidity === "number" ? r.relative_humidity : null)).filter((n): n is number => n !== null)
      const precipProbArr = target.map((r) => (typeof r.precipitation_probability === "number" ? r.precipitation_probability : null)).filter((n): n is number => n !== null)
      const precipArr = target.map((r) => (typeof r.precipitation === "number" ? r.precipitation : 0))

      const cloud_total_pct = avg(cloudArr)
      const humidity_pct = avg(humidArr)
      const avg_temp = avg(target.map((r) => (typeof r.temperature === "number" ? r.temperature : null)).filter((n): n is number => n !== null))
      const precip_prob_max_pct = precipProbArr.length ? Math.max(...precipProbArr) : null
      const precip_total_mm = precipArr.reduce((a, b) => a + (b || 0), 0)

      const parts: string[] = []
      // Prompt-expected keys
      if (cloud_total_pct !== null) parts.push(`cloud_total_pct=${Math.round(cloud_total_pct)}`)
      if (humidity_pct !== null) parts.push(`humidity_pct=${Math.round(humidity_pct)}`)
      if (typeof precip_prob_max_pct === "number") parts.push(`precip_prob_max_pct=${Math.round(precip_prob_max_pct)}`)
      parts.push(`precip_total_mm=${precip_total_mm.toFixed(1)}`)
      // Legacy/aux keys (prompt will ignore unknowns, but this helps with compatibility)
      if (cloud_total_pct !== null) parts.push(`avg_cloud=${Math.round(cloud_total_pct)}`)
      if (humidity_pct !== null) parts.push(`avg_humidity=${Math.round(humidity_pct)}`)
      if (typeof avg_temp === "number") parts.push(`avg_temp=${avg_temp.toFixed(1)}`)
      if (typeof precip_prob_max_pct === "number") parts.push(`precip_prob_max=${Math.round(precip_prob_max_pct)}`)
      parts.push(`precip_total=${precip_total_mm.toFixed(1)}`)
      parts.push(`hours_analyzed=${target.length}`)
      return parts.join("; ")
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
        {uploaderVisible ? (
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
            onOpenPicker={() => {
              setCardForceClosed(true)
            }}
            onUploadingChange={(u) => { if (u) setCardForceClosed(true) }}
            onUploaded={() => setCardForceClosed(true)}
            onReset={() => setCardForceClosed(false)}
            onCloseRequested={() => {
              setUploaderVisible(false)
              setCardForceClosed(false)
              setCardCloseSignal((n) => n + 1)
            }}
          />
        ) : (
          <div className="flex justify-center">
            <Button
              type="button"
              variant="neutral"
              onClick={() => {
                setUploaderVisible(true)
                setCardForceClosed(false)
              }}
            >
              Upload photo
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
