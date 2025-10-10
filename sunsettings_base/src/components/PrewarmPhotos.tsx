"use client"

import * as React from "react"

type PhotoPin = {
  metadataCid: string
  photoCid: string
  lat: number
  lon: number
  locationLabel: string | null
  takenAtIso: string | null
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null
}

function isPhotoPin(v: unknown): v is PhotoPin {
  if (!isRecord(v)) return false
  return (
    typeof v.photoCid === "string" &&
    typeof v.lat === "number" &&
    typeof v.lon === "number" &&
    (v.locationLabel === null || typeof v.locationLabel === "string") &&
    (v.takenAtIso === null || typeof v.takenAtIso === "string") &&
    typeof (v as Record<string, unknown>).metadataCid === "string"
  )
}

const CACHE_KEY = "sunsettings:photos:v1"

// Fire-and-forget prewarm for /api/photos shortly after landing on /
export default function PrewarmPhotos() {
  React.useEffect(() => {
    const t = setTimeout(async () => {
      try {
        const res = await fetch("/api/photos")
        if (!res.ok) return
        const json = await res.json().catch(() => null)
        const items: unknown[] = Array.isArray(json?.items) ? json.items : []
        const pins: PhotoPin[] = items.filter(isPhotoPin)
        if (pins.length) {
          try {
            const payload = { ts: Date.now(), items: pins }
            localStorage.setItem(CACHE_KEY, JSON.stringify(payload))
          } catch {}
        }
      } catch {}
    }, 400) // slight delay to avoid competing with first paint
    return () => clearTimeout(t)
  }, [])
  return null
}
