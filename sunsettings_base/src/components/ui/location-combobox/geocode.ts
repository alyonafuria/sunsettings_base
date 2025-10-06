export type ReverseGeocode = { label: string; value: string }

export async function reverseGeocode(
  latitude: number,
  longitude: number,
  signal?: AbortSignal,
  acceptLanguage: string = "en",
): Promise<ReverseGeocode> {
  // Ask Nominatim for higher-detail feature for neighborhood-level names
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&zoom=15` // ~suburb/city_district detail
  const res = await fetch(url, {
    headers: {
      "Accept-Language": acceptLanguage,
    },
    signal,
  })
  if (!res.ok) throw new Error(`Reverse geocoding failed: ${res.status}`)
  const data = await res.json()
  const addr = data?.address || {}
  // Prefer stable address parts: suburb/city_district first, then neighbourhood/quarter/locality
  const neighborhoodStrict = addr.borough || addr.suburb || addr.city_district || addr.district
  const neighborhoodLoose = addr.quarter || addr.neighbourhood || addr.neighborhood || addr.locality
  let neighborhood = neighborhoodStrict || neighborhoodLoose
  const city = addr.city || addr.town || addr.municipality || addr.village || addr.hamlet || addr.county || "Unknown"
  const country = addr.country || addr.country_code?.toUpperCase() || ""
  // Basic sanity checks: avoid odd tokens (numbers/very long strings)
  const isSane = (s: string) => {
    const t = String(s).trim()
    if (!t) return false
    if (t.length > 40) return false
    if (/\d/.test(t)) return false
    return true
  }
  if (neighborhood && !isSane(neighborhood)) neighborhood = undefined as unknown as string
  const primary = neighborhood && isSane(neighborhood) ? neighborhood : city
  const label = primary !== city ? `${primary}, ${city}` : country ? `${city}, ${country}` : city
  const slug = (s: string) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "")
  const value = `detected_${slug(primary)}_${slug(city)}`
  return { label, value }
}
