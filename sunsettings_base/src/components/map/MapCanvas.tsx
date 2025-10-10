"use client"

import * as React from "react"
import * as mapboxgl from "mapbox-gl"
import { applyHighContrastBW } from "@/components/map/applyHighContrastBW"
import { getMapboxToken, MAPBOX_TOKEN_MISSING_MSG, getMapboxStyle } from "@/config/keys"
import "mapbox-gl/dist/mapbox-gl.css"

const DEFAULT_PINATA_GATEWAY = "https://tan-mad-gorilla-689.mypinata.cloud"
const PINATA_GATEWAY = (process.env.NEXT_PUBLIC_PINATA_GATEWAY || DEFAULT_PINATA_GATEWAY).replace(/\/$/, "")

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
    typeof v.metadataCid === "string"
  )
}

// Simple localStorage cache for pins
const CACHE_KEY = "sunsettings:photos:v1"
type CachePayload = { ts: number; items: unknown[] }

function loadCachedPins(): PhotoPin[] | null {
  try {
    const raw = typeof window !== "undefined" ? localStorage.getItem(CACHE_KEY) : null
    if (!raw) return null
    const data = JSON.parse(raw) as CachePayload
    if (!data || typeof data.ts !== "number" || !Array.isArray(data.items)) return null
    const pins = data.items.filter(isPhotoPin) as PhotoPin[]
    return pins.length ? pins : null
  } catch {
    return null
  }
}

function saveCachedPins(items: PhotoPin[]) {
  try {
    if (typeof window === "undefined") return
    const payload: CachePayload = { ts: Date.now(), items }
    localStorage.setItem(CACHE_KEY, JSON.stringify(payload))
  } catch {
    // ignore storage errors
  }
}

export default function MapCanvas({
  center,
  zoom = 11,
}: {
  center?: { lat: number; lon: number }
  zoom?: number
}) {
  const containerRef = React.useRef<HTMLDivElement | null>(null)
  const mapRef = React.useRef<mapboxgl.Map | null>(null)
  const markersRef = React.useRef<mapboxgl.Marker[]>([])
  const [/*errorMsg*/, setErrorMsg] = React.useState<string | null>(null)
  const [photoPins, setPhotoPins] = React.useState<PhotoPin[]>([])
  const [mapReady, setMapReady] = React.useState(false)

  const reloadPins = React.useCallback(async () => {
    try {
      const res = await fetch("/api/photos", { cache: "no-store" })
      if (!res.ok) throw new Error(`photos api ${res.status}`)
      const json = await res.json().catch(() => null)
      const items: unknown[] = Array.isArray(json?.items) ? json.items : []
      const mapped = items.filter(isPhotoPin).map((item) => ({
        metadataCid: item.metadataCid,
        photoCid: item.photoCid,
        lat: item.lat,
        lon: item.lon,
        locationLabel: item.locationLabel,
        takenAtIso: item.takenAtIso,
      }))
      setPhotoPins(mapped)
      saveCachedPins(mapped)
    } catch (err) {
      console.error("[MapCanvas] Failed to reload photo pins", err)
    }
  }, [])

  React.useEffect(() => {
    let cancelled = false

    const controller = new AbortController()
    const loadPins = async () => {
      try {
        // Try cache-first for instant UI
        const cached = loadCachedPins()
        if (cached && !cancelled) {
          setPhotoPins(cached)
        }
        const res = await fetch("/api/photos", { cache: "no-store", signal: controller.signal })
        if (!res.ok) throw new Error(`photos api ${res.status}`)
        const json = await res.json().catch(() => null)
        const items: unknown[] = Array.isArray(json?.items) ? json.items : []
        if (!cancelled) {
          const mapped = items.filter(isPhotoPin).map((item) => ({
            metadataCid: item.metadataCid,
            photoCid: item.photoCid,
            lat: item.lat,
            lon: item.lon,
            locationLabel: item.locationLabel,
            takenAtIso: item.takenAtIso,
          }))
          setPhotoPins(mapped)
          saveCachedPins(mapped)
        }
      } catch (err) {
        if (!cancelled && !(err instanceof DOMException && err.name === "AbortError")) {
          console.error("[MapCanvas] Failed to load photo pins", err)
          setPhotoPins([])
        }
      }
    }

    loadPins()

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [])

  React.useEffect(() => {
    const onUploaded = async (e: Event) => {
      try {
        const ce = e as CustomEvent
        const detail = (ce?.detail || {}) as { photoCid?: string | null; metadataCid?: string | null }
        const metadataCid = typeof detail.metadataCid === "string" ? detail.metadataCid : null
        const photoCid = typeof detail.photoCid === "string" ? detail.photoCid : null
        const url = metadataCid
          ? `/api/photos?metadataCid=${encodeURIComponent(metadataCid)}`
          : (photoCid ? `/api/photos?photoCid=${encodeURIComponent(photoCid)}` : null)
        if (url) {
          // Fetch the single item quickly (metadataCid path is immediate) and merge into state+cache
          const res = await fetch(url)
          if (res.ok) {
            const json = await res.json().catch(() => null)
            const items: unknown[] = Array.isArray(json?.items) ? json.items : []
            const mapped = items.filter(isPhotoPin).map((item) => ({
              metadataCid: item.metadataCid,
              photoCid: item.photoCid,
              lat: item.lat,
              lon: item.lon,
              locationLabel: item.locationLabel,
              takenAtIso: item.takenAtIso,
            }))
            if (mapped.length) {
              setPhotoPins((prev) => {
                const byId = new Map(prev.map((p) => [p.metadataCid, p]))
                for (const m of mapped) byId.set(m.metadataCid, m)
                const next = Array.from(byId.values())
                saveCachedPins(next)
                return next
              })
              // Center map on the newly uploaded pin to make it visible
              try {
                const pin = mapped[0]
                const map = mapRef.current
                if (map && typeof pin.lat === "number" && typeof pin.lon === "number") {
                  const targetZoom = Math.max(map.getZoom() || 0, 12)
                  map.easeTo({ center: [pin.lon, pin.lat], zoom: targetZoom, duration: 700 })
                }
              } catch {}
            }
          }
        }
      } catch {}
      // Reconcile full list in background
      void reloadPins()
    }
    window.addEventListener("sunsettings:photoUploaded", onUploaded as EventListener)
    return () => {
      window.removeEventListener("sunsettings:photoUploaded", onUploaded as EventListener)
    }
  }, [reloadPins])

  // Refresh on window focus or when tab becomes visible again
  React.useEffect(() => {
    const onFocus = () => { void reloadPins() }
    const onVisibility = () => {
      if (!document.hidden) { void reloadPins() }
    }
    window.addEventListener("focus", onFocus)
    document.addEventListener("visibilitychange", onVisibility)
    return () => {
      window.removeEventListener("focus", onFocus)
      document.removeEventListener("visibilitychange", onVisibility)
    }
  }, [reloadPins])

  React.useEffect(() => {
    let cancelled = false

    const init = async () => {
      const token = getMapboxToken()
      if (!token) {
        console.error(MAPBOX_TOKEN_MISSING_MSG)
        setErrorMsg(MAPBOX_TOKEN_MISSING_MSG)
        return
      }
      const container = containerRef.current
      if (!container) return

      // Wait until container has a measurable size to avoid zero-sized canvas on reload
      const waitForSize = async (el: HTMLElement, timeoutMs = 1200) => {
        const start = performance.now()
        return new Promise<void>((resolve) => {
          const tick = () => {
            const w = el.clientWidth
            const h = el.clientHeight
            if (w > 0 && h > 0) return resolve()
            if (performance.now() - start > timeoutMs) return resolve()
            requestAnimationFrame(tick)
          }
          tick()
        })
      }
      await waitForSize(container)
      if (cancelled) return

      const userStyle = getMapboxStyle()
      const style = userStyle || "mapbox://styles/mapbox/light-v11"
      const map = new mapboxgl.Map({
        container,
        style,
        center: center ? [center.lon, center.lat] : [13.404954, 52.520008], // Berlin default
        zoom,
        attributionControl: true,
        preserveDrawingBuffer: false,
        accessToken: token,
      })
      mapRef.current = map

      map.on("style.load", () => {
        if (!userStyle) {
          try { applyHighContrastBW(map) } catch {}
        }
      })

      map.on("error", (e: mapboxgl.ErrorEvent) => {
        const msg = e?.error?.message ?? "Mapbox error"
        console.error("Mapbox error:", msg)
        setErrorMsg(String(msg))
      })

      map.once("load", () => {
        try {
          map.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), "top-right")
        } catch {}
        try { map.resize() } catch {}
        try {
          requestAnimationFrame(() => { try { map.resize() } catch {} })
          setTimeout(() => { try { map.resize() } catch {} }, 300)
        } catch {}
        if (!cancelled) setMapReady(true)
      })

      // Keep map sized with container changes
      let ro: ResizeObserver | null = null
      if (typeof window !== "undefined" && "ResizeObserver" in window) {
        ro = new ResizeObserver(() => {
          try { map.resize() } catch {}
        })
        ro.observe(container)
      }

      const onWinResize = () => { try { map.resize() } catch {} }
      window.addEventListener("resize", onWinResize)

      // Cleanup
      const cleanup = () => {
        try { map.remove() } catch {}
        mapRef.current = null
        if (ro) { try { ro.disconnect() } catch {} }
        window.removeEventListener("resize", onWinResize)
        setMapReady(false)
      }
      return cleanup
    }

    let cleanupFn: (() => void) | undefined
    init().then((cleanup) => { cleanupFn = cleanup }).catch(() => {})

    return () => {
      cancelled = true
      if (cleanupFn) cleanupFn()
      markersRef.current.forEach((marker) => {
        try {
          marker.remove()
        } catch {
          // ignore cleanup errors
        }
      })
      markersRef.current = []
    }
  }, [])

  // Recenter if center prop changes later
  React.useEffect(() => {
    if (mapRef.current && center) {
      mapRef.current.easeTo({ center: [center.lon, center.lat], duration: 600 })
    }
  }, [center, zoom])

  React.useEffect(() => {
    const map = mapRef.current
    if (!mapReady || !map) return

    markersRef.current.forEach((marker) => {
      try {
        marker.remove()
      } catch {
        // ignore
      }
    })
    markersRef.current = []

    photoPins.forEach((pin) => {
      try {
        const el = document.createElement("div")
        el.style.width = "52px"
        el.style.display = "flex"
        el.style.flexDirection = "column"
        el.style.alignItems = "center"
        el.style.pointerEvents = "auto"

        const frame = document.createElement("div")
        frame.style.width = "48px"
        frame.style.height = "48px"
        frame.style.borderRadius = "14px"
        frame.style.overflow = "hidden"
        frame.style.boxShadow = "0 6px 16px rgba(0,0,0,0.35)"
        frame.style.border = "2px solid #ffffff"
        frame.style.backgroundColor = "#111"

        const img = document.createElement("img")
        img.src = `${PINATA_GATEWAY}/ipfs/${pin.photoCid}`
        img.alt = pin.locationLabel || "Uploaded photo"
        img.style.width = "100%"
        img.style.height = "100%"
        img.style.objectFit = "cover"
        frame.appendChild(img)

        const stem = document.createElement("div")
        stem.style.width = "2px"
        stem.style.height = "16px"
        stem.style.background = "#ffffff"
        stem.style.marginTop = "4px"

        el.appendChild(frame)
        el.appendChild(stem)
        // label intentionally hidden

        const marker = new mapboxgl.Marker({ element: el, anchor: "bottom" })
          .setLngLat([pin.lon, pin.lat])
          .addTo(map)

        markersRef.current.push(marker)
      } catch (err) {
        console.error("[MapCanvas] failed to render pin", err)
      }
    })

    return () => {
      markersRef.current.forEach((marker) => {
        try {
          marker.remove()
        } catch {
          // ignore
        }
      })
      markersRef.current = []
    }
  }, [photoPins, mapReady])

  return (
    <>
      <div
        ref={containerRef}
        className="fixed top-16 left-0 w-screen h-[calc(100vh-4rem)] z-10 bg-[#e5e7eb]"
        style={{ width: '100vw', height: '100vh' }}
      />
    </>
  )
}
