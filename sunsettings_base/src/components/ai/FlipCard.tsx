"use client"

import * as React from "react"
import { Card } from "@/components/ui/card"
import { ArrowDown, ArrowUp } from "lucide-react"

export interface FlipCardProps {
  location: string
  probability?: number | null
  description?: string
  loading?: boolean
  error?: string | null
  className?: string
  forceClosed?: boolean
  closeSignal?: number
  sunsetText?: string
  isPastSunset?: boolean
}

export default function FlipCard({
  location,
  probability,
  description,
  loading,
  error,
  className,
  forceClosed,
  closeSignal,
  sunsetText,
  isPastSunset,
}: FlipCardProps) {
  const [isExpanded, setIsExpanded] = React.useState(false)
  const [isClosed, setIsClosed] = React.useState(false)
  const [showContent, setShowContent] = React.useState(true)
  const lastCloseSignal = React.useRef(closeSignal)

  // Calculate sunfocard rating based on percentage
  const getSunfocardRating = React.useCallback((prob: number | null | undefined, compact?: boolean) => {
    if (typeof prob !== 'number') return []
    let count = 0
    if (prob >= 0 && prob <= 15) count = 1
    else if (prob >= 16 && prob <= 25) count = 2
    else if (prob >= 26 && prob <= 60) count = 3
    else if (prob >= 61 && prob <= 80) count = 4
    else if (prob >= 81 && prob <= 100) count = 5
    
    return Array.from({ length: count }, (_, i) => (
      <img 
        key={i} 
        src="/sunforcard.svg" 
        alt="sunfocard" 
        className={compact ? "w-15 h-15 -ml-2" : "w-15 h-15 -mt-3 -ml-2"}
      />
    ))
  }, [])

  // Get the count of suns for display - reuse the same logic from getSunfocardRating
  const getSunCount = React.useCallback((prob: number | null | undefined) => {
    return getSunfocardRating(prob).length
  }, [getSunfocardRating])

  // Truncate location name if too long
  const truncateLocation = React.useCallback((loc: string | null | undefined, maxLength: number = 20) => {
    if (!loc) return loc
    return loc.length > maxLength ? `${loc.slice(0, maxLength)}...` : loc
  }, [])

  // Calculate time remaining until sunset
  const getTimeRemaining = React.useCallback(() => {
    if (!sunsetText) return '--:--'
    // Parse sunset time (assuming format like "17:16")
    const [hours, minutes] = sunsetText.split(':').map(Number)
    if (isNaN(hours) || isNaN(minutes)) return '--:--'
    
    const now = new Date()
    const sunset = new Date()
    sunset.setHours(hours, minutes, 0, 0)
    
    // If sunset has passed today, show negative time (past sunset)
    if (sunset <= now) {
      const diff = now.getTime() - sunset.getTime()
      const hoursPast = Math.floor(diff / (1000 * 60 * 60))
      const minutesPast = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      return `-${hoursPast}h ${minutesPast}m`
    }
    
    const diff = sunset.getTime() - now.getTime()
    const hoursRemaining = Math.floor(diff / (1000 * 60 * 60))
    const minutesRemaining = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    
    return `${hoursRemaining}h ${minutesRemaining}m`
  }, [sunsetText])

  const handleCardClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (loading) return
    if (forceClosed) return
    if (isClosed) {
      // Start maximize: first expand container, then reveal content
      setShowContent(false)
      setIsClosed(false)
      window.setTimeout(() => setShowContent(true), 150)
      return
    }
    setIsExpanded((v) => !v)
  }

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation()
    setShowContent(false)
    setIsClosed(true)
    setIsExpanded(false)
  }

  // External control to minimize/maximize
  React.useEffect(() => {
    if (typeof forceClosed === 'boolean') {
      if (forceClosed) {
        setShowContent(false)
        setIsClosed(true)
        setIsExpanded(false)
      } else {
        // When releasing external close, reveal content after the size transition
        setIsClosed(false)
        window.setTimeout(() => setShowContent(true), 150)
      }
    }
  }, [forceClosed])

  React.useEffect(() => {
    if (closeSignal === undefined) return
    if (lastCloseSignal.current === closeSignal) return
    lastCloseSignal.current = closeSignal
    setShowContent(false)
    setIsClosed(true)
    setIsExpanded(false)
  }, [closeSignal])

  return (
    <div
      className={[
        "mx-auto animate-in fade-in-50",
        "w-full",
        className ?? "",
      ].join(" ")}
    >
      <div
        onClick={handleCardClick}
        className={["w-full", loading || forceClosed ? "cursor-default" : "cursor-pointer"].join(" ")}
      >
        {/* Maximize button removed per design */}
        {/* Front */}
        <div className="w-full">
          <Card
            className={[
              "relative w-full px-4 flex flex-col gap-0 overflow-hidden transition-[height] duration-300 ease-in-out",
              isClosed ? "py-0 h-14 justify-center" : isExpanded ? "py-2 h-88" : "py-1 h-44",
            ].join(" ")}
          >
            {!isClosed && (
              <div className="flex items-center gap-1 text-base opacity-75 mb-1">
                <span>{isExpanded ? "tap for less" : "tap for more"}</span>
                {isExpanded ? (
                  <ArrowDown className="w-4 h-4" />
                ) : (
                  <ArrowUp className="w-4 h-4" />
                )}
              </div>
            )}

            {!isClosed && !isPastSunset && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleClose(e)
                }}
                className="absolute top-1 right-1 w-8 h-8 rounded-full flex items-center justify-center transition-colors duration-200 z-10 bg-secondary/60 hover:bg-secondary touch-manipulation"
                aria-label="Close card"
              >
                <svg className="w-4 h-4" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
  <path d="M2 2L30 30M2 30L30 2" />
</svg>
              </button>
            )}

            {/* Middle section - Sunset info */}
            <div
              className={[
                "text-center flex flex-col justify-center mt-0",
                isExpanded ? "flex-none" : "flex-1",
              ].join(" ")}
            >
              {isClosed ? (
                isPastSunset ? (
                  <div className="flex flex-col items-center justify-center h-full">
                    <div className="text-center text-[15px] md:text-lg font-semibold opacity-90 leading-snug px-2">
                      <div>you missed sunset today.</div>
                      <div>try again tomorrow</div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="flex justify-center items-center gap-0">
                      {getSunfocardRating(probability, true)}
                    </div>
                  </div>
                )
              ) : (
                showContent ? (
                  <>
                    {isPastSunset ? (
                      <div className="text-center text-base md:text-lg font-semibold opacity-90 leading-snug px-2">
                        <div>you missed sunset today.</div>
                        <div>try again tomorrow</div>
                      </div>
                    ) : (
                      <>
                        {loading ? (
                          <div className="text-center">
                            <div className="text-xl font-medium mb-0.5 opacity-90">Today in {truncateLocation(location) || "—"} </div>
                            <div className="text-xl font-bold mb-0.5 leading-tight">Sunset Score: {getSunCount(probability)}/5</div>
                            <p className="text-sm opacity-75">Analyzing the sunset…</p>
                          </div>
                        ) : (
                          <>
                            <div className="flex justify-between items-center mb-0.5 mt-0">
                              <div className="text-base opacity-70">Sunset: {sunsetText || '--:--'}</div>
                              <div className="text-base opacity-75">
                                Remains: {getTimeRemaining()}
                              </div>
                            </div>
                            <div className="text-xl font-medium mb-0.5 opacity-90">Today in {truncateLocation(location) || "—"}</div>
                            <div className="text-xl font-bold mb-0.5 leading-tight">Sunset Score: {getSunCount(probability)}/5</div>
                            <div
                              className={[
                                "flex justify-center items-center gap-0",
                                isExpanded ? "mb-0" : "mb-2",
                              ].join(" ")}
                            >
                              {getSunfocardRating(probability)}
                            </div>
                          </>
                        )}
                      </>
                    )}
                  </>
                ) : null
              )}
            </div>

            {/* Back */}
            <div
              className={[
                "grid transition-[grid-template-rows] duration-300 ease-in-out",
                isExpanded && !isClosed ? "grid-rows-[1fr] mt-0" : "grid-rows-[0fr]",
              ].join(" ")}
            >
              <div className="overflow-hidden">
                <div className="flex-1 overflow-auto text-base leading-relaxed opacity-95 pb-3 text-left">
                  {loading && <div className="opacity-90">Fetching description...</div>}
                  {!loading && error && <span className="text-destructive">{error}</span>}
                  {!loading && !error && (
                    <span>{description && description.trim().length > 0 ? description : "No description available."}</span>
                  )}
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
