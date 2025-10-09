"use client"

import * as React from "react"
import * as mapboxgl from "mapbox-gl"
import { applyHighContrastBW } from "@/components/map/applyHighContrastBW"
import { getMapboxToken, MAPBOX_TOKEN_MISSING_MSG, getMapboxStyle } from "@/config/keys"
import "mapbox-gl/dist/mapbox-gl.css"

export default function MapCanvas({
  center,
  zoom = 11,
}: {
  center?: { lat: number; lon: number }
  zoom?: number
}) {
  const containerRef = React.useRef<HTMLDivElement | null>(null)
  const mapRef = React.useRef<mapboxgl.Map | null>(null)
  const [/*errorMsg*/, setErrorMsg] = React.useState<string | null>(null)

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
      const style = userStyle || "mapbox://styles/mapbox/streets-v12"
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
      }
      return cleanup
    }

    let cleanupFn: (() => void) | undefined
    init().then((cleanup) => { cleanupFn = cleanup }).catch(() => {})

    return () => {
      cancelled = true
      if (cleanupFn) cleanupFn()
    }
  }, [])

  // Recenter if center prop changes later
  React.useEffect(() => {
    if (mapRef.current && center) {
      mapRef.current.easeTo({ center: [center.lon, center.lat], duration: 600 })
    }
  }, [center, zoom])

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
