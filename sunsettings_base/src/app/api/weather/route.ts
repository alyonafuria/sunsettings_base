import { NextResponse } from "next/server"
import { getWeatherSummary } from "@/lib/weather/getWeatherSummary"

export const runtime = "nodejs"

// Simple in-memory TTL cache for server-side
// Key by rounded lat/lon (0.05°) + date (YYYY-MM-DD)
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes
const memCache = new Map<string, { value: string; expires: number }>()

function roundCoord(x: number, step = 0.05): number {
  return Math.round(x / step) * step
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const latStr = url.searchParams.get("lat")
    const lonStr = url.searchParams.get("lon") || url.searchParams.get("lng")
    const dateStr = url.searchParams.get("date") // optional YYYY-MM-DD

    if (!latStr || !lonStr) {
      return NextResponse.json({ error: "Missing lat/lon" }, { status: 400 })
    }
    const lat = Number(latStr)
    const lon = Number(lonStr)
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      return NextResponse.json({ error: "Invalid lat/lon" }, { status: 400 })
    }

    const date = dateStr ? new Date(dateStr) : new Date()
    const ymd = date.toISOString().slice(0, 10)

    const rLat = roundCoord(lat)
    const rLon = roundCoord(lon)
    const cacheKey = `${rLat},${rLon}:${ymd}`

    const now = Date.now()
    const cached = memCache.get(cacheKey)
    if (cached && cached.expires > now) {
      return NextResponse.json({ ok: true, weatherSummary: cached.value, cached: true })
    }

    const summary = await getWeatherSummary(lat, lon, date)

    memCache.set(cacheKey, { value: summary, expires: now + CACHE_TTL_MS })

    return NextResponse.json({ ok: true, weatherSummary: summary, cached: false })
  } catch (e) {
    return NextResponse.json({ error: (e as Error)?.message || "Unknown error" }, { status: 500 })
  }
}
