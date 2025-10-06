"use client"

import * as React from "react"
import { Alert, AlertTitle } from "@/components/ui/alert"
import { LocationCombobox } from "@/components/ui/location-combobox"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { resolveCoordsFromValue, resolveCoordsByLabel } from "@/components/weather/coords"
import { useRouter } from "next/navigation"

export default function HomeHeroSection() {
  const [pinnedTop, setPinnedTop] = React.useState(false)
  const hasOpenedRef = React.useRef(false)
  const [lat, setLat] = React.useState<number | null>(null)
  const [lon, setLon] = React.useState<number | null>(null)
  const router = useRouter()

  const handleOpenChange = React.useCallback((open: boolean) => {
    // Move to top when user opens the combobox; drop back when they close without choosing
    if (open) {
      hasOpenedRef.current = true
      setPinnedTop(true)
    } else {
      setPinnedTop(false)
    }
  }, [])

  const handleChange = React.useCallback(async (value: string) => {
    // After a selection, move back to original position.
    if (value) {
      setPinnedTop(false)
      hasOpenedRef.current = false
      // Resolve coords for Nominatim selections (nomi_<id>)
      if (value.startsWith("nomi_")) {
        const resolved = await resolveCoordsFromValue(value)
        if (resolved) {
          setLat(resolved.lat)
          setLon(resolved.lon)
        }
      }
    }
  }, [])

  const handleDetectedCoords = React.useCallback((la: number, lo: number) => {
    setLat(la)
    setLon(lo)
  }, [])

  const handleResolveByLabel = React.useCallback(async (label: string) => {
    const resolved = await resolveCoordsByLabel(label)
    if (resolved) {
      setLat(resolved.lat)
      setLon(resolved.lon)
    }
  }, [])

  const canCalculate = lat != null && lon != null

  return (
    <div
      className={cn(
        "absolute left-1/2 -translate-x-1/2 z-10 transition-all duration-300",
        pinnedTop ? "top-4" : "top-[25%]",
      )}
    >
      <div className="flex flex-col gap-4 items-center">
        <Alert className="bg-white text-black text-center">
          <AlertTitle className="justify-self-center">Calculate the beauty of the sunset</AlertTitle>
        </Alert>
        <LocationCombobox
          onOpenChange={handleOpenChange}
          onChange={handleChange}
          onDetectedCoords={handleDetectedCoords}
          onResolveCoords={handleResolveByLabel}
        />
        <Button
          variant="default"
          size="lg"
          className="w-40"
          disabled={!canCalculate}
          onClick={() => {
            if (!canCalculate) return
            const z = 11
            router.push(`/map?lat=${lat}&lon=${lon}&zoom=${z}`)
          }}
        >
          <h2>Calculate</h2>
        </Button>
      </div>
    </div>
  )
}
