export type ResolvedCoords = { lat: number; lon: number } | null

// Resolve coordinates from LocationCombobox value
// - nomi_<place_id>: fetch from Nominatim lookup
// - others: return null
export async function resolveCoordsFromValue(value: string): Promise<ResolvedCoords> {
  if (!value) return null
  if (!value.startsWith("nomi_")) return null
  const placeId = parseInt(value.slice("nomi_".length), 10)
  if (!Number.isFinite(placeId)) return null
  const acceptLang = typeof document !== "undefined" ? document.documentElement.lang || "en" : "en"
  const url = `https://nominatim.openstreetmap.org/lookup?format=jsonv2&place_ids=${placeId}&accept-language=${encodeURIComponent(
    acceptLang,
  )}`
  const headers: Record<string, string> = {
    "Accept-Language": acceptLang,
    "User-Agent": "sunsettings.app/1.0 (contact: demo)",
  }
  if (typeof window !== "undefined" && window.location?.origin) headers["Referer"] = window.location.origin
  const res = await fetch(url, { headers })
  if (!res.ok) return null
  const arr = (await res.json()) as Array<{ lat?: string; lon?: string }>
  if (!Array.isArray(arr) || arr.length === 0) return null
  const it = arr[0]
  const lat = it.lat ? parseFloat(it.lat) : NaN
  const lon = it.lon ? parseFloat(it.lon) : NaN
  if (Number.isFinite(lat) && Number.isFinite(lon)) return { lat, lon }
  return null
}

// Resolve coordinates by a freeform label (default list item or custom input)
export async function resolveCoordsByLabel(label: string): Promise<ResolvedCoords> {
  const q = label?.trim()
  if (!q) return null
  const acceptLang = typeof document !== "undefined" ? document.documentElement.lang || "en" : "en"
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(
    q,
  )}&limit=1&addressdetails=0&accept-language=${encodeURIComponent(acceptLang)}`
  const headers: Record<string, string> = {
    "Accept-Language": acceptLang,
    "User-Agent": "sunsettings.app/1.0 (contact: demo)",
  }
  if (typeof window !== "undefined" && window.location?.origin) headers["Referer"] = window.location.origin
  const res = await fetch(url, { headers })
  if (!res.ok) return null
  const arr = (await res.json()) as Array<{ lat?: string; lon?: string }>
  if (!Array.isArray(arr) || arr.length === 0) return null
  const it = arr[0]
  const lat = it.lat ? parseFloat(it.lat) : NaN
  const lon = it.lon ? parseFloat(it.lon) : NaN
  if (Number.isFinite(lat) && Number.isFinite(lon)) return { lat, lon }
  return null
}
