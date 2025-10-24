"use client"

import * as React from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import FlipCard from "@/components/ai/FlipCard"
import UploadPhotoPanel from "@/components/ai/UploadPhotoPanel"
// (unused) import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Card } from "@/components/ui/card"
 

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
  const router = useRouter()
  const pathname = usePathname()
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
  const [geoLoading, setGeoLoading] = React.useState(false)
  const [geoError, setGeoError] = React.useState<string | null>(null)
  const [selectedPin, setSelectedPin] = React.useState<null | {
    metadataCid: string
    photoCid: string
    lat: number
    lon: number
    locationLabel: string | null
    takenAtIso: string | null
  }>(null)

  // Derive lat/lon from URL for display fallback
  const latStr = sp.get("lat")
  const lonStr = sp.get("lon") || sp.get("lng")
  const latNum = latStr ? Number(latStr) : undefined
  const lonNum = lonStr ? Number(lonStr) : undefined

  React.useEffect(() => {
    // Prefer explicit URL coordinates if provided, fallback to cached label
    if (latStr && lonStr) {
      const ln = Number(latStr)
      const lo = Number(lonStr)
      const latFmt = Number.isFinite(ln) ? ln.toFixed(3) : latStr
      const lonFmt = Number.isFinite(lo) ? lo.toFixed(3) : lonStr
      setLocationLabel(`${latFmt}, ${lonFmt}`)
    } else {
      const cached = buildLocationLabelFromCache()
      setLocationLabel(cached || "")
    }
  }, [latStr, lonStr, dayBump])

  // When coords are present, resolve a human-readable label and cache it
  React.useEffect(() => {
    const hasCoords = typeof latNum === 'number' && typeof lonNum === 'number'
    if (!hasCoords) return
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/geocode/reverse', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lat: latNum, lon: lonNum }),
        })
        if (!res.ok) return
        const data = await res.json().catch(() => null)
        if (cancelled) return
        const label = (data && typeof data.label === 'string' && data.label.trim().length)
          ? data.label
          : `${latNum.toFixed(3)}, ${lonNum.toFixed(3)}`
        setLocationLabel(label)
        try { localStorage.setItem('locationCache', JSON.stringify({ label })) } catch {}
      } catch {}
    })()
    return () => { cancelled = true }
  }, [latNum, lonNum])

  // Open photo panel on marker click
  React.useEffect(() => {
    const onPin = (e: Event) => {
      try {
        const ce = e as CustomEvent
        type PinDetail = {
          metadataCid?: unknown
          photoCid?: unknown
          lat?: unknown
          lon?: unknown
          locationLabel?: unknown
          takenAtIso?: unknown
        }
        const d = (ce?.detail ?? {}) as PinDetail
        const metadataCid = typeof d.metadataCid === 'string' ? d.metadataCid : null
        const photoCid = typeof d.photoCid === 'string' ? d.photoCid : null
        const lat = typeof d.lat === 'number' ? d.lat : (typeof d.lat === 'string' ? Number(d.lat) : null)
        const lon = typeof d.lon === 'number' ? d.lon : (typeof d.lon === 'string' ? Number(d.lon) : null)
        const locationLabel = typeof d.locationLabel === 'string' ? d.locationLabel : null
        const takenAtIso = typeof d.takenAtIso === 'string' ? d.takenAtIso : null
        if (!metadataCid || !photoCid || lat == null || lon == null) return
        setSelectedPin({ metadataCid, photoCid, lat, lon, locationLabel, takenAtIso })
        setCardForceClosed(true)
      } catch {}
    }
    window.addEventListener('sunsettings:pinSelected', onPin as EventListener)
    return () => window.removeEventListener('sunsettings:pinSelected', onPin as EventListener)
  }, [])

  const closeSelectedPin = React.useCallback(() => {
    setSelectedPin(null)
    // Minimize via closeSignal, but release forceClosed so it is clickable
    setCardForceClosed(false)
    setCardCloseSignal((n) => n + 1)
  }, [])

  // Load scores from metadata JSON for the selected pin
  const [metaScores, setMetaScores] = React.useState<{
    scorePercent?: number | null
    scoreLabel?: string | null
    userScorePercent?: number | null
    userScoreLabel?: string | null
  } | null>(null)
  React.useEffect(() => {
    let aborted = false
    async function loadMeta() {
      try {
        if (!selectedPin?.metadataCid) { setMetaScores(null); return }
        const gw = (process.env.NEXT_PUBLIC_PINATA_GATEWAY || 'https://tan-mad-gorilla-689.mypinata.cloud').replace(/\/$/, '')
        const res = await fetch(`${gw}/ipfs/${selectedPin.metadataCid}`, { cache: 'force-cache' })
        const raw: unknown = await res.json().catch(() => null)
        if (aborted || !raw || typeof raw !== 'object') { setMetaScores(null); return }
        const j = raw as Record<string, unknown>
        const sp = typeof j.sunsetScorePercent === 'number' ? j.sunsetScorePercent as number : null
        const sl = typeof j.sunsetScoreLabel === 'string' ? j.sunsetScoreLabel as string : null
        const usp = typeof j.userSunsetScorePercent === 'number' ? j.userSunsetScorePercent as number : null
        const usl = typeof j.userSunsetScoreLabel === 'string' ? j.userSunsetScoreLabel as string : null
        setMetaScores({ scorePercent: sp, scoreLabel: sl, userScorePercent: usp, userScoreLabel: usl })
      } catch {
        if (!aborted) setMetaScores(null)
      }
    }
    if (selectedPin) loadMeta()
    return () => { aborted = true }
  }, [selectedPin])

  const SelectedPhotoPanel: React.FC = React.useCallback(() => {
    if (!selectedPin) return null
    const scorePercent = metaScores?.scorePercent ?? null
    const userScorePercent = metaScores?.userScorePercent ?? null
    const scoreLabel = metaScores?.scoreLabel ?? null
    const userScoreLabel = metaScores?.userScoreLabel ?? null
    const taken = selectedPin.takenAtIso ? new Date(selectedPin.takenAtIso).toLocaleString() : ''
    return (
      <div className="pointer-events-auto">
        <Card className="relative overflow-hidden p-0">
          <button
            aria-label="Close"
            onClick={closeSelectedPin}
            className="absolute right-2 top-2 z-10 h-10 w-10 rounded-full bg-black/70 text-white text-2xl leading-none flex items-center justify-center"
          >
            ×
          </button>
          <div className="relative w-full bg-black">
            <div className="pt-[100%]" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`${process.env.NEXT_PUBLIC_PINATA_GATEWAY || 'https://tan-mad-gorilla-689.mypinata.cloud'}/ipfs/${selectedPin.photoCid}`}
              alt={selectedPin.locationLabel || 'Photo'}
              className="absolute inset-0 w-full h-full object-cover object-center"
            />
          </div>
          <div className="px-3 py-2">
            {selectedPin.locationLabel && (
              <div className="text-sm font-medium leading-snug truncate">{selectedPin.locationLabel}</div>
            )}
            {taken && (
              <div className="text-xs opacity-80 mt-0.5">{taken}</div>
            )}
            <div className="mt-2 flex items-center justify-between text-xs gap-3">
              <div className="flex min-w-0 flex-col">
                <span className="text-[11px] opacity-80">Prediction</span>
                <span className="font-semibold text-[12px] leading-tight truncate">
                  {typeof scorePercent === 'number' ? `${Math.round(scorePercent)}%` : '—'}
                  {scoreLabel ? <span className="opacity-70"> ({String(scoreLabel)})</span> : null}
                </span>
              </div>
              <div className="flex flex-col text-right">
                <span className="text-[11px] opacity-80">User score</span>
                <span className="font-semibold text-[12px] leading-tight">
                  {typeof userScorePercent === 'number' ? `${Math.round(userScorePercent)}%` : '—'}
                  {userScoreLabel ? <span className="opacity-70"> ({String(userScoreLabel)})</span> : null}
                </span>
              </div>
            </div>
          </div>
        </Card>
      </div>
    )
  }, [selectedPin, closeSelectedPin, metaScores])

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
              const cutoffMs = Number.isFinite(sunMs) ? (sunMs + 60 * 60 * 1000) : NaN
              if (Number.isFinite(cutoffMs) && nowMs > cutoffMs) {
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
      className={selectedPin
        ? "pointer-events-none fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 w-[min(92vw,320px)]"
        : "pointer-events-none fixed left-1/2 -translate-x-1/2 z-20 w-[min(92vw,640px)]"}
      style={{ bottom: selectedPin ? undefined : "12vh" }}
      data-past={isPastSunset ? '1' : '0'}
    >
      <div className="pointer-events-auto space-y-3">
        {selectedPin && <SelectedPhotoPanel />}
        <AlertDialog open={locationMismatch} onOpenChange={setLocationMismatch}>
          <AlertDialogContent className="relative">
            <AlertDialogCancel asChild>
              <button
                aria-label="Close"
                className="absolute right-2 top-2 z-10 p-1 leading-none text-[32px] text-black/70 hover:text-black focus:outline-none flex items-center justify-center"
              >
                ×
              </button>
            </AlertDialogCancel>
            <AlertDialogHeader>
              <AlertDialogTitle>Location mismatch</AlertDialogTitle>
              <AlertDialogDescription>
                Locations of the sunset forecast and your current device location differ. Please re-run the forecast for your current location before taking a photo.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="justify-start">
              <AlertDialogAction
                onClick={async () => {
                  setGeoError(null)
                  setGeoLoading(true)
                  try {
                    if (!navigator.geolocation) throw new Error("Geolocation not available")
                    const pos: GeolocationPosition = await new Promise((resolve, reject) => {
                      navigator.geolocation.getCurrentPosition(resolve, reject, {
                        enableHighAccuracy: true,
                        timeout: 10000,
                        maximumAge: 0,
                      })
                    })
                    const lat = pos.coords.latitude
                    const lon = pos.coords.longitude
                    // Update URL params and re-run analysis for detected location
                    const params = new URLSearchParams(sp.toString())
                    params.set("lat", String(lat))
                    params.set("lon", String(lon))
                    router.push(`${pathname}?${params.toString()}`, { scroll: false })
                    setLocationMismatch(false)
                  } catch (e) {
                    setGeoError((e as Error)?.message || "Failed to detect location")
                  } finally {
                    setGeoLoading(false)
                  }
                }}
                disabled={geoLoading}
              >
                {geoLoading ? "Detecting…" : "Detect location"}
              </AlertDialogAction>
              
            </AlertDialogFooter>
            {geoError ? (
              <div className="mt-2 text-sm text-red-600">{geoError}</div>
            ) : null}
          </AlertDialogContent>
        </AlertDialog>
        {!selectedPin && (
          <>
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
                const p = typeof probability === 'number' ? probability : null
                if (p === null) return undefined
                if (p <= 30) return 'Horrible'
                if (p <= 50) return 'Poor'
                if (p <= 70) return 'Okay'
                if (p <= 90) return 'Great'
                return 'Fabulous'
              })()}
              scorePercent={typeof probability === 'number' ? probability : undefined}
              onOpenPicker={() => { setCardForceClosed(true) }}
              onUploadingChange={(u) => { if (u) setCardForceClosed(true) }}
              onUploaded={() => setCardForceClosed(true)}
              onReset={() => setCardForceClosed(false)}
              onCloseRequested={() => {
                setCardForceClosed(false)
                setCardCloseSignal((n) => n + 1)
              }}
            />
          </>
        )}
      </div>
    </div>
  )
}
