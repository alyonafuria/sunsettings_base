export type NominatimItem = {
  place_id: number
  display_name: string
  name?: string
  address?: Record<string, any>
}

export type SuggestOption = { value: string; label: string }

export function buildAcceptLanguage(): string {
  const nav = typeof navigator !== "undefined" ? (navigator as any) : undefined
  const docLang = typeof document !== "undefined" ? document.documentElement.lang : ""
  const langs = nav?.languages && nav.languages.length ? nav.languages.join(",") : nav?.language || "en"
  return (docLang || langs || "en").toString()
}

export async function searchPlaces(query: string, opts?: { limit?: number; signal?: AbortSignal; lang?: string }): Promise<SuggestOption[]> {
  const q = query.trim()
  if (!q) return []
  const limit = opts?.limit ?? 8
  const lang = opts?.lang ?? buildAcceptLanguage()
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(q)}&addressdetails=1&limit=${limit}&accept-language=${encodeURIComponent(lang)}`
  const headers: Record<string, string> = {
    "Accept-Language": lang,
    "User-Agent": "sunsettings.app/1.0 (contact: demo)",
  }
  if (typeof window !== "undefined" && window.location?.origin) headers["Referer"] = window.location.origin
  const res = await fetch(url, { headers, signal: opts?.signal })
  if (!res.ok) throw new Error(`Suggest failed: ${res.status}`)
  const data = (await res.json()) as NominatimItem[]
  return data.map((it) => {
    const addr = it.address || {}
    const city = it.name || addr.city || addr.town || addr.village || addr.hamlet || it.display_name?.split(",")[0] || "Unknown"
    const country = addr.country || (addr.country_code ? String(addr.country_code).toUpperCase() : "") || ""
    const label = country ? `${city}, ${country}` : city
    const value = `nomi_${it.place_id}`
    return { value, label }
  })
}
