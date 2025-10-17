"use client"

import * as React from "react"
import { Card } from "@/components/ui/card"
import { Minimize2 } from "lucide-react"

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
}: FlipCardProps) {
  const [isFlipped, setIsFlipped] = React.useState(false)
  const [isClosed, setIsClosed] = React.useState(false)
  const [date] = React.useState(() => new Date())
  const [showContent, setShowContent] = React.useState(true)
  const lastCloseSignal = React.useRef(closeSignal)


  const formattedDate = React.useMemo(() => date.toLocaleDateString("de-DE"), [date])
  const shownProb = typeof probability === "number" ? `${probability}%` : loading ? "..." : "--"

  const rootStyle: React.CSSProperties = {
    perspective: "1000px",
    transition: "width 500ms, height 500ms, opacity 500ms",
  }
  const innerStyle: React.CSSProperties = {
    transformStyle: "preserve-3d",
    WebkitTransformStyle: "preserve-3d",
    transform: isFlipped ? "rotateY(180deg)" : undefined,
    transition: "transform 500ms",
    willChange: "transform",
    position: "relative",
    width: "100%",
    height: "100%",
    cursor: loading || forceClosed ? "default" : "pointer",
  }
  const faceStyle: React.CSSProperties = {
    backfaceVisibility: "hidden",
    WebkitBackfaceVisibility: "hidden",
    transform: "translateZ(0)",
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    borderRadius: "1rem",
  }

  const handleCardClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (loading) return
    if (forceClosed) return
    if (isClosed) {
      // Start maximize: first expand container, then reveal content
      setShowContent(false)
      setIsClosed(false)
      window.setTimeout(() => setShowContent(true), 250)
      return
    }
    setIsFlipped((f) => !f)
  }

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation()
    setShowContent(false)
    setIsClosed(true)
    setIsFlipped(false)
  }

  // External control to minimize/maximize
  React.useEffect(() => {
    if (typeof forceClosed === 'boolean') {
      if (forceClosed) {
        setShowContent(false)
        setIsClosed(true)
        setIsFlipped(false)
      } else {
        // When releasing external close, reveal content after the size transition
        setIsClosed(false)
        window.setTimeout(() => setShowContent(true), 250)
      }
    }
  }, [forceClosed])

  React.useEffect(() => {
    if (closeSignal === undefined) return
    if (lastCloseSignal.current === closeSignal) return
    lastCloseSignal.current = closeSignal
    setShowContent(false)
    setIsClosed(true)
    setIsFlipped(false)
  }, [closeSignal])

  return (
    <div
      className={[
        "mx-auto animate-in fade-in-50",
        isClosed ? "w-28 h-16" : "w-full h-44",
        className ?? "",
      ].join(" ")}
      style={rootStyle}
    >
      <div
        onClick={handleCardClick}
        style={innerStyle}
        className={["transition-transform duration-200", isClosed ? "scale-75" : "scale-100"].join(" ")}
      >
        {/* Maximize button removed per design */}
        {/* Front */}
        <div style={{ ...faceStyle, pointerEvents: isFlipped ? "none" : undefined }}>
          <Card className="relative w-full h-full px-5 py-6 flex flex-col justify-center items-center">
            {!isClosed && !isFlipped && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleClose(e)
                }}
                className="absolute top-2 right-2 w-10 h-10 md:w-11 md:h-11 rounded-full flex items-center justify-center transition-colors duration-200 z-10 bg-secondary/60 hover:bg-secondary touch-manipulation"
                style={{ opacity: isFlipped ? 0 : 1, transition: "opacity 150ms" }}
                aria-label="Close card"
              >
                <Minimize2 className="w-6 h-6 md:w-6 md:h-6" />
              </button>
            )}
            <div className="text-center">
              {isClosed ? (
                <div className="flex flex-col items-center justify-center h-full">
                  <div className="text-sm font-bold mb-1">Sunset</div>
                  <div className="text-xl font-extrabold">
                    {shownProb}
                  </div>
                </div>
              ) : (
                showContent ? (
                  <>
                    {sunsetText && (
                      <div className="text-[11px] opacity-70 mb-0.5">Sunset: {sunsetText}</div>
                    )}
                    <div className="text-[13px] font-medium mb-1 opacity-90 leading-snug">Today in {location || "—"}</div>
                    <div className="text-2xl font-bold mb-1 leading-tight">Sunset Beauty</div>
                    <div className="relative">
                      <div className="text-5xl font-extrabold leading-none">
                        {shownProb}
                      </div>
                    </div>
                    <div className="mt-0.5 text-[13px] font-medium opacity-85 leading-snug">
                      {(function(){
                        if (typeof probability !== 'number') return '—'
                        const p = probability
                        if (p <= 30) return 'Horrible'
                        if (p <= 50) return 'Poor'
                        if (p <= 70) return 'Okay'
                        if (p <= 90) return 'Great'
                        return 'Fabulous'
                      })()}
                    </div>
                    <p className="mt-0.5 text-[12px] opacity-75 leading-snug">{loading ? "Analyzing the sunset…" : "Tap card for details"}</p>
                    {!loading && typeof probability === "number" && probability === 0 && (
                      <p className="text-[10px] text-muted-foreground mt-0.5">No data</p>
                    )}
                  </>
                ) : null
              )}
            </div>
          </Card>
        </div>

        {/* Back */}
        <div style={{ ...faceStyle, transform: "rotateY(180deg)", pointerEvents: isFlipped ? undefined : "none" }}>
          <Card className="relative w-full h-full p-6 flex flex-col justify-center">
            {!isClosed && isFlipped && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleClose(e)
                }}
                className="absolute top-2 right-2 w-10 h-10 md:w-11 md:h-11 rounded-full flex items-center justify-center transition-colors duration-200 z-10 bg-secondary/60 hover:bg-secondary touch-manipulation"
                style={{ opacity: isFlipped ? 1 : 0, transition: "opacity 150ms" }}
                aria-label="Close card"
              >
                <Minimize2 className="w-6 h-6 md:w-6 md:h-6" />
              </button>
            )}
            <div className="text-sm leading-relaxed opacity-95">
              {isClosed ? (
                <div className="flex flex-col items-center justify-center h-full">
                  <div className="text-sm font-bold mb-1">Details</div>
                  <div className="text-sm opacity-80">Tap to expand</div>
                </div>
              ) : (
                <>
                  <div className="mb-3 text-lg font-semibold opacity-95">{formattedDate}</div>
                  {loading && <div className="opacity-90">Fetching description...</div>}
                  {!loading && error && <span className="text-destructive">{error}</span>}
                  {!loading && !error && (
                    <span>{description && description.trim().length > 0 ? description : "No description available."}</span>
                  )}
                </>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
