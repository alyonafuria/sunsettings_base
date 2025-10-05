export type NominatimItem = {
  place_id: number
  display_name: string
  name?: string
  class?: string
  type?: string
  address?: {
    city?: string
    town?: string
    village?: string
    hamlet?: string
    borough?: string
    suburb?: string
    neighbourhood?: string
    district?: string
    quarter?: string
    country?: string
    country_code?: string
    state?: string
    county?: string
    [key: string]: string | undefined
  }
}

export type SuggestOption = { value: string; label: string }

export function buildAcceptLanguage(): string {
  const nav = typeof navigator !== "undefined" ? navigator : undefined
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

  // Filter out obvious POIs when class/type are provided
  const allowedTypes = new Set([
    "city",
    "town",
    "village",
    "borough",
    "suburb",
    "neighbourhood",
    "district",
    "quarter",
    "hamlet",
  ])

  const picked = data.filter((it) => {
    const cls = it.class || ""
    const typ = it.type || ""
    if (!cls || !typ) return true // keep when fields absent
    if (cls === "place" && allowedTypes.has(typ)) return true
    if (cls === "boundary" && allowedTypes.has(typ)) return true
    return false
  })

  const formatLabel = (it: NominatimItem): string => {
    const a = it.address || {}
    const countryCode = (a.country_code ? a.country_code.toUpperCase() : "").trim()
    const primary = it.name || a.city || a.town || a.village || a.borough || a.suburb || a.neighbourhood || a.district || a.quarter || a.hamlet || it.display_name?.split(",")[0] || "Unknown"

    const isNeighbourhood = Boolean(a.borough || a.suburb || a.neighbourhood || a.district || a.quarter || a.hamlet)
    const parentCity = a.city || a.town || a.village || ""
    const region = a.state || a.county || ""

    const tail: string[] = []
    if (isNeighbourhood) {
      if (parentCity) tail.push(parentCity)
      if (countryCode) tail.push(countryCode)
    } else {
      if (region) tail.push(region)
      if (countryCode) tail.push(countryCode)
    }
    return tail.length ? `${primary}, ${tail.join(", ")}` : primary
  }

  const mapped: SuggestOption[] = picked.map((it) => ({ value: `nomi_${it.place_id}`, label: formatLabel(it) }))

  // Dedupe by normalized label
  const seen = new Set<string>()
  const deduped: SuggestOption[] = []
  for (const m of mapped) {
    const norm = m.label.toLowerCase().replace(/\s+/g, " ").trim()
    if (seen.has(norm)) continue
    seen.add(norm)
    deduped.push(m)
  }

  // Sort locale-aware and enforce limit
  const sortLang = opts?.lang ?? buildAcceptLanguage()
  const collator = new Intl.Collator(sortLang, { sensitivity: "base" })
  deduped.sort((a, b) => collator.compare(a.label, b.label))
  return deduped.slice(0, limit)
}
