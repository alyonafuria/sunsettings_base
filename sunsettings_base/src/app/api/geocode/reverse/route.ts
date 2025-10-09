import { NextResponse } from "next/server"

export const runtime = "nodejs"

const CACHE = new Map<string, { label: string; ts: number }>()
const TTL_MS = 1000 * 60 * 60 // 1 hour

function cacheKey(lat: number, lon: number): string {
  return `${lat.toFixed(6)},${lon.toFixed(6)}`
}

function pruneCache() {
  const now = Date.now()
  for (const [k, v] of CACHE) {
    if (now - v.ts > TTL_MS) CACHE.delete(k)
  }
}

type NominatimAddress = {
  neighbourhood?: string
  suburb?: string
  city_district?: string
  borough?: string
  county?: string
  city?: string
  town?: string
  village?: string
  state?: string
  country?: string
}

type NominatimReverse = {
  display_name?: string
  address?: NominatimAddress
}

function isNominatimReverse(x: unknown): x is NominatimReverse {
  return typeof x === 'object' && x !== null
}

function formatLabel(json: unknown): string | null {
  if (!isNominatimReverse(json)) return null
  const addr = json.address
  if (!addr) return null
  // Build concise label: neighbourhood/suburb, city_district, city/town/village
  const neighbourhood = addr.neighbourhood
  const district = addr.city_district || addr.suburb || addr.borough || addr.county
  const city = addr.city || addr.town || addr.village
  const rawParts = [neighbourhood, district, city]
  const parts: string[] = []
  const seen = new Set<string>()
  for (const p of rawParts) {
    if (typeof p === 'string' && p.length && !seen.has(p)) {
      parts.push(p)
      seen.add(p)
    }
  }
  return parts.length ? parts.join(", ") : null
}

export async function POST(req: Request) {
  try {
    const { lat, lon } = (await req.json()) as { lat?: number; lon?: number }
    if (typeof lat !== "number" || typeof lon !== "number") {
      return NextResponse.json({ error: "lat/lon required" }, { status: 400 })
    }

    pruneCache()
    const key = cacheKey(lat, lon)
    const cached = CACHE.get(key)
    if (cached && Date.now() - cached.ts <= TTL_MS) {
      return NextResponse.json({ label: cached.label, cached: true })
    }

    const email = process.env.NOMINATIM_EMAIL
    const params = new URLSearchParams({ format: "jsonv2", lat: String(lat), lon: String(lon) })
    if (email) params.set("email", email)

    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?${params.toString()}`,
      {
        headers: {
          "User-Agent": "sunsettings/1.0 (+https://example.com)",
        },
      }
    )
    if (!res.ok) {
      const text = await res.text()
      return NextResponse.json({ error: `nominatim ${res.status}`, text }, { status: 502 })
    }
    const json = await res.json()
    const label = formatLabel(json) ?? null
    if (!label) return NextResponse.json({ label: null })
    CACHE.set(key, { label, ts: Date.now() })
    return NextResponse.json({ label })
  } catch (e) {
    return NextResponse.json({ error: (e as Error)?.message || "error" }, { status: 500 })
  }
}
