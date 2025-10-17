import { NextResponse } from "next/server"
import { getWeatherSummary } from "@/lib/weather/getWeatherSummary"

export const runtime = "nodejs"

// Simple in-memory TTL cache for server-side
// Key by rounded lat/lon (0.05°) + date (YYYY-MM-DD)
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes
type CachedWeather = { summary: string; sunsetUtc: string | null; sunsetLocal: string | null }
const memCache = new Map<string, { value: CachedWeather; expires: number }>()

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
      return NextResponse.json({ ok: true, weatherSummary: cached.value.summary, sunsetUtc: cached.value.sunsetUtc, sunsetLocal: cached.value.sunsetLocal, cached: true })
    }

    const [summary, sunset] = await Promise.all([
      getWeatherSummary(lat, lon, date),
      getSunsetAuto(lat, lon, ymd).catch(() => ({ utc: null as string | null, local: null as string | null })),
    ])

    memCache.set(cacheKey, { value: { summary, sunsetUtc: sunset.utc, sunsetLocal: sunset.local }, expires: now + CACHE_TTL_MS })

    return NextResponse.json({ ok: true, weatherSummary: summary, sunsetUtc: sunset.utc, sunsetLocal: sunset.local, cached: false })
  } catch (e) {
    return NextResponse.json({ error: (e as Error)?.message || "Unknown error" }, { status: 500 })
  }
}

// Returns both UTC ISO and a human local time string for the location
type OpenMeteoSunset = {
  daily?: { sunset?: string[] }
  utc_offset_seconds?: number
}

async function getSunsetAuto(lat: number, lon: number, ymd: string): Promise<{ utc: string | null; local: string | null }> {
  // Ask Open-Meteo to compute daily sunset in the LOCATION's local timezone
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&daily=sunset&timezone=auto&start_date=${ymd}&end_date=${ymd}`
  const res = await fetch(url)
  if (!res.ok) return { utc: null, local: null }
  const json = (await res.json().catch(() => null)) as unknown as OpenMeteoSunset | null
  if (!json) return { utc: null, local: null }
  const times = json.daily?.sunset
  const timeStr = Array.isArray(times) && typeof times[0] === 'string' ? times[0] : null
  const offsetSec = typeof json.utc_offset_seconds === 'number' ? json.utc_offset_seconds : 0
  if (!timeStr) return { utc: null, local: null }
  // Open-Meteo returns local time like 'YYYY-MM-DDTHH:MM'
  // Convert to UTC by subtracting offset
  try {
    // timeStr format: YYYY-MM-DDTHH:MM (local time at location)
    const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(timeStr)
    if (!m) return { utc: null, local: null }
    const y = parseInt(m[1], 10)
    const mo = parseInt(m[2], 10)
    const d = parseInt(m[3], 10)
    const hh = parseInt(m[4], 10)
    const mm = parseInt(m[5], 10)
    // Compute UTC millis: local_time = utc + offset  =>  utc = local - offset
    const localMs = Date.UTC(y, mo - 1, d, hh, mm, 0)
    const utcMs = localMs - (offsetSec * 1000)
    const utcIso = new Date(utcMs).toISOString()
    const hhmm = `${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}`
    return { utc: utcIso, local: hhmm }
  } catch {
    return { utc: null, local: null }
  }
}
