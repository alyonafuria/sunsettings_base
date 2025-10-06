"use client"

import * as React from "react"
import { Alert, AlertTitle } from "@/components/ui/alert"
import { LocationCombobox } from "@/components/ui/location-combobox"
import { cn } from "@/lib/utils"
import { Button, buttonVariants } from "@/components/ui/button"

export default function HomeHeroSection() {
  const [pinnedTop, setPinnedTop] = React.useState(false)
  const hasOpenedRef = React.useRef(false)

  const handleOpenChange = React.useCallback((open: boolean) => {
    // Move to top when user opens the combobox; drop back when they close without choosing
    if (open) {
      hasOpenedRef.current = true
      setPinnedTop(true)
    } else {
      setPinnedTop(false)
    }
  }, [])

  const handleChange = React.useCallback((value: string) => {
    // After a selection, move back to original position.
    if (value) {
      setPinnedTop(false)
      hasOpenedRef.current = false
    }
  }, [])

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
        <LocationCombobox onOpenChange={handleOpenChange} onChange={handleChange} />
        <Button variant="default" size="lg" className="w-80"><h2>Calculate</h2></Button>
      </div>
    </div>
  )
}
