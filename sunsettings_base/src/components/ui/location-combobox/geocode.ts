export type ReverseGeocode = { label: string; value: string }

export async function reverseGeocode(
  latitude: number,
  longitude: number,
  signal?: AbortSignal,
  acceptLanguage: string = "en",
): Promise<ReverseGeocode> {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`
  const res = await fetch(url, {
    headers: {
      "Accept-Language": acceptLanguage,
    },
    signal,
  })
  if (!res.ok) throw new Error(`Reverse geocoding failed: ${res.status}`)
  const data = await res.json()
  const addr = data?.address || {}
  const city = addr.city || addr.town || addr.village || addr.hamlet || addr.suburb || addr.county || "Unknown"
  const country = addr.country || addr.country_code?.toUpperCase() || ""
  const label = country ? `${city}, ${country}` : city
  const value = `detected_${String(city).toLowerCase().replace(/\s+/g, "_")}`
  return { label, value }
}
