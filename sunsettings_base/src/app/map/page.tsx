"use client"

import MapCanvas from "@/components/map/MapCanvas"
import { useSearchParams } from "next/navigation"
import { Suspense } from "react"
import MapAnalysisOverlay from "@/components/ai/MapAnalysisOverlay"

function MapPageInner() {
  const sp = useSearchParams()
  const latStr = sp.get("lat")
  const lonStr = sp.get("lon") || sp.get("lng")
  const zoomStr = sp.get("zoom")

  const lat = latStr ? Number(latStr) : undefined
  const lon = lonStr ? Number(lonStr) : undefined
  const zoom = zoomStr ? Number(zoomStr) : undefined

  const hasCenter = typeof lat === "number" && !Number.isNaN(lat) && typeof lon === "number" && !Number.isNaN(lon)
  const center = hasCenter ? { lat: lat as number, lon: lon as number } : undefined

  return (
    <>
      <MapCanvas center={center} zoom={zoom} />
      <MapAnalysisOverlay />
    </>
  )
}

export default function MapPage() {
  return (
    <Suspense fallback={null}>
      <MapPageInner />
    </Suspense>
  )
}
