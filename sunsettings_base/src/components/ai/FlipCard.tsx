"use client"

import * as React from "react"
import { Card } from "@/components/ui/card"

export interface FlipCardProps {
  location: string
  probability?: number | null
  description?: string
  loading?: boolean
  error?: string | null
  className?: string
}

export default function FlipCard({
  location,
  probability,
  description,
  loading,
  error,
  className,
}: FlipCardProps) {
  const [isFlipped, setIsFlipped] = React.useState(false)
  const [isClosed, setIsClosed] = React.useState(false)
  const [date] = React.useState(() => new Date())


  const formattedDate = React.useMemo(() => date.toLocaleDateString("de-DE"), [date])
  const shownProb = typeof probability === "number" ? `${probability}%` : loading ? "..." : "--"

  const rootStyle: React.CSSProperties = {
    perspective: "1000px",
    transition: "all 0.5s",
  }
  const innerStyle: React.CSSProperties = {
    transformStyle: "preserve-3d",
    transform: isFlipped ? "rotateY(180deg)" : undefined,
    transition: "transform 700ms",
    position: "relative",
    width: "100%",
    height: "100%",
    cursor: loading ? "default" : "pointer",
  }
  const faceStyle: React.CSSProperties = {
    backfaceVisibility: "hidden",
    WebkitBackfaceVisibility: "hidden",
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    borderRadius: "1rem",
  }

  const handleCardClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (loading) return
    if (isClosed) {
      setIsClosed(false)
      return
    }
    setIsFlipped((f) => !f)
  }

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsClosed(true)
    setIsFlipped(false)
  }

  return (
    <div
      className={[
        "mx-auto animate-in fade-in-50",
        isClosed ? "w-20 h-12" : "w-full h-48",
        className ?? "",
      ].join(" ")}
      style={rootStyle}
    >
      <div onClick={handleCardClick} style={innerStyle}>
        {/* Front */}
        <div style={faceStyle}>
          <Card className="relative w-full h-full p-6 flex flex-col justify-center items-center">
            {!isClosed && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleClose(e)
                }}
                className="absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center transition-colors duration-200 z-10 bg-secondary/60 hover:bg-secondary"
                aria-label="Close card"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
            <div className="text-center">
              {isClosed ? (
                <div className="flex flex-col items-center justify-center h-full">
                  <div className="text-xs font-bold mb-1">Sunset</div>
                  <div className="text-lg font-extrabold">
                    {shownProb}
                  </div>
                </div>
              ) : (
                <>
                  <div className="text-sm font-medium mb-2 opacity-90">Today in {location || "—"}</div>
                  <div className="text-3xl font-bold mb-3">Sunset Quality</div>
                  <div className="relative">
                    <div
                      key={shownProb}
                      className="text-6xl font-extrabold transition-all"
                    >
                      {shownProb}
                    </div>
                  </div>
                  <p className="mt-2 text-sm opacity-70">{loading ? "Analyzing the sunset…" : "Tap card for details"}</p>
                  {!loading && typeof probability === "number" && probability === 0 && (
                    <p className="text-[10px] text-muted-foreground mt-1">No data</p>
                  )}
                </>
              )}
            </div>
          </Card>
        </div>

        {/* Back */}
        <div style={{ ...faceStyle, transform: "rotateY(180deg)" }}>
          <Card className="relative w-full h-full p-6 flex flex-col justify-center">
            {!isClosed && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleClose(e)
                }}
                className="absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center transition-colors duration-200 z-10 bg-secondary/60 hover:bg-secondary"
                aria-label="Close card"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
            <div className="text-sm leading-relaxed opacity-95">
              {isClosed ? (
                <div className="flex flex-col items-center justify-center h-full">
                  <div className="text-xs font-bold mb-1">Details</div>
                  <div className="text-xs opacity-80">Tap to expand</div>
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
