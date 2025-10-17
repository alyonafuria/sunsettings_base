"use client"

import * as React from "react"

type BrightSkyRecord = {
  timestamp?: string
  cloud_cover?: number
  relative_humidity?: number
  temperature?: number
  precipitation_probability?: number
  precipitation?: number
}

async function fetchHourlyWeather(lat: number, lon: number): Promise<string> {
  try {
    const today = new Date()
    const dateParam = today.toISOString().slice(0, 10)
    const url = `https://api.brightsky.dev/weather?date=${dateParam}&lat=${lat}&lon=${lon}&tz=UTC&units=dwd`
    const res = await fetch(url)
    if (!res.ok) throw new Error(`Weather HTTP ${res.status}`)
    const json = await res.json()
    const records: BrightSkyRecord[] = (json.weather as BrightSkyRecord[]) || []
    if (!records.length) return "No weather data."

    const sameDay = records.filter((r) => r.timestamp?.startsWith(dateParam))
    const sample = sameDay.length ? sameDay : records

    const sunsetWindow = sample.filter((r) => {
      const hour = parseInt(r.timestamp?.substring(11, 13) || "0", 10)
      return hour >= 15 && hour <= 22
    })
    const targetSet = sunsetWindow.length ? sunsetWindow : sample.slice(-6)

    const avg = (arr: number[]) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null)

    const cloudsArr = targetSet
      .map((r) => (typeof r.cloud_cover === "number" ? r.cloud_cover : null))
      .filter((n) => n !== null) as number[]
    const humidArr = targetSet
      .map((r) => (typeof r.relative_humidity === "number" ? r.relative_humidity : null))
      .filter((n) => n !== null) as number[]
    const tempArr = targetSet
      .map((r) => (typeof r.temperature === "number" ? r.temperature : null))
      .filter((n) => n !== null) as number[]
    const precipProbArr = targetSet
      .map((r) => (typeof r.precipitation_probability === "number" ? r.precipitation_probability : null))
      .filter((n) => n !== null) as number[]
    const precipArr = targetSet.map((r) => (typeof r.precipitation === "number" ? r.precipitation : 0))

    const cloudAvg = avg(cloudsArr)
    const humidAvg = avg(humidArr)
    const tempAvg = avg(tempArr)
    const precipMax = precipProbArr.length ? Math.max(...precipProbArr) : null
    const precipSum = precipArr.reduce((a, b) => a + (b || 0), 0)

    const parts: string[] = []
    if (cloudAvg !== null) parts.push(`avg_cloud:${cloudAvg.toFixed(0)}%`)
    if (humidAvg !== null) parts.push(`avg_humidity:${humidAvg.toFixed(0)}%`)
    if (tempAvg !== null) parts.push(`avg_temp:${tempAvg.toFixed(1)}C`)
    if (precipMax !== null) parts.push(`precip_prob_max:${precipMax}%`)
    if (precipSum > 0) parts.push(`precip_total:${precipSum.toFixed(1)}mm`)
    parts.push(`hours_analyzed:${targetSet.length}`)

    return parts.join("; ")
  } catch {
    return "Weather fetch failed"
  }
}

export default function Weather({ lat, lon }: { lat?: number | null; lon?: number | null }) {
  const [summary, setSummary] = React.useState<string>("")
  const [loading, setLoading] = React.useState(false)
  const [raw, setRaw] = React.useState<unknown>(null)
  const [open, setOpen] = React.useState(false)

  React.useEffect(() => {
    let alive = true
    async function run() {
      if (typeof lat === "number" && typeof lon === "number") {
        setLoading(true)
        setRaw(null)
        let s = ""
        try {
          const res = await fetch(`/api/weather?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`, { cache: "no-store" })
          if (res.ok) {
            const data = await res.json().catch(() => null)
            s = typeof data?.weatherSummary === "string" ? data.weatherSummary : ""
          } else {
            s = ""
          }
        } catch {
          s = ""
        }
        if (alive) {
          setSummary(s)
          setLoading(false)
        }
      } else {
        setSummary("")
        setRaw(null)
      }
    }
    run()
    return () => {
      alive = false
    }
  }, [lat, lon])

  if (typeof lat !== "number" || typeof lon !== "number") {
    return (
      <div className="text-xs opacity-80 w-full max-w-[90vw] md:max-w-xl">
        Pick or detect a location to fetch weather.
      </div>
    )
  }

  return (
    <div className="text-xs opacity-80 w-full max-w-[90vw] md:max-w-xl">
      <div className="mb-1">lat: {lat.toFixed(6)}, lon: {lon.toFixed(6)}</div>
      <div className="mb-2">{loading ? "Fetching weather…" : summary || "No weather data."}</div>
      <button
        type="button"
        className="underline text-foreground/80 hover:text-foreground"
        onClick={async () => {
          setOpen((v) => !v)
          const next = !open
          if (next && raw === null && typeof lat === "number" && typeof lon === "number") {
            try {
              const today = new Date()
              const dateParam = today.toISOString().slice(0, 10)
              const url = `https://api.brightsky.dev/weather?date=${dateParam}&lat=${lat}&lon=${lon}&tz=UTC&units=dwd`
              const res = await fetch(url)
              const json: unknown = res.ok ? await res.json() : { error: `HTTP ${res.status}` }
              setRaw(json)
            } catch {
              setRaw({ error: "fetch failed" })
            }
          }
        }}
      >
        {open ? "Hide raw JSON" : "Show raw JSON"}
      </button>
      {open && (
        <pre className="mt-2 max-h-64 overflow-auto rounded-base border-2 border-border bg-secondary-background p-2 whitespace-pre-wrap break-all">
          {raw ? JSON.stringify(raw, null, 2) : "(no data)"}
        </pre>
      )}
    </div>
  )
}
