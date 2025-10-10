export type WeatherSummaryString = string

// Returns a semicolon-delimited key=value string with keys expected by the AI prompt.
// Keys:
// - cloud_total_pct
// - humidity_pct
// - precip_prob_max_pct
// - precip_total_mm
// - avg_cloud (legacy)
// - avg_humidity (legacy)
// - avg_temp (legacy)
// - precip_prob_max (legacy)
// - precip_total (legacy)
// - hours_analyzed
export async function getWeatherSummary(lat: number, lon: number, date: Date = new Date()): Promise<WeatherSummaryString> {
  const dateParam = date.toISOString().slice(0, 10)

  // Try BrightSky first
  const bright = await getFromBrightSky(lat, lon, dateParam).catch(() => null)
  if (bright && bright.trim().length > 0) return bright

  // Fallback to Open-Meteo
  const open = await getFromOpenMeteo(lat, lon, dateParam).catch(() => null)
  return open || ""
}

async function getFromBrightSky(lat: number, lon: number, dateParam: string): Promise<string> {
  const url = `https://api.brightsky.dev/weather?date=${dateParam}&lat=${lat}&lon=${lon}&tz=UTC&units=dwd`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Weather HTTP ${res.status}`)
  const json = await res.json()
  type Rec = { timestamp?: string; cloud_cover?: number; relative_humidity?: number; temperature?: number; precipitation_probability?: number; precipitation?: number }
  const records: Rec[] = (json.weather as Rec[]) || []
  try { console.log('[weather] BrightSky fetched', { lat, lon, date: dateParam, count: records.length }) } catch {}
  return summarizeRecords({
    dateParam,
    extract: (r) => ({
      iso: typeof r.timestamp === "string" ? r.timestamp : null,
      cloud: typeof r.cloud_cover === "number" ? r.cloud_cover : null,
      humidity: typeof r.relative_humidity === "number" ? r.relative_humidity : null,
      temp: typeof r.temperature === "number" ? r.temperature : null,
      precipProb: typeof r.precipitation_probability === "number" ? r.precipitation_probability : null,
      precip: typeof r.precipitation === "number" ? r.precipitation : 0,
    }),
    items: records,
  })
}

async function getFromOpenMeteo(lat: number, lon: number, dateParam: string): Promise<string> {
  // Request hourly data similar to BrightSky
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&hourly=cloudcover,relativehumidity_2m,precipitation_probability,precipitation,temperature_2m` +
    `&timezone=UTC&start_date=${dateParam}&end_date=${dateParam}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`OpenMeteo HTTP ${res.status}`)
  const json = await res.json()
  type Hourly = {
    time?: string[]
    cloudcover?: number[]
    relativehumidity_2m?: number[]
    precipitation_probability?: number[]
    precipitation?: number[]
    temperature_2m?: number[]
  }
  const h: Hourly = (json?.hourly ?? {}) as Hourly
  const times = Array.isArray(h.time) ? h.time : []
  const N = times.length
  if (!N) return ""

  const items = times.map((t, i) => ({
    timestamp: t ?? null,
    cloudcover: typeof h.cloudcover?.[i] === "number" ? h.cloudcover![i] : null,
    humidity: typeof h.relativehumidity_2m?.[i] === "number" ? h.relativehumidity_2m![i] : null,
    precipProb: typeof h.precipitation_probability?.[i] === "number" ? h.precipitation_probability![i] : null,
    precipitation: typeof h.precipitation?.[i] === "number" ? h.precipitation![i] : 0,
    temp: typeof h.temperature_2m?.[i] === "number" ? h.temperature_2m![i] : null,
  }))

  try { console.log('[weather] OpenMeteo fetched', { lat, lon, date: dateParam, count: items.length }) } catch {}

  return summarizeRecords({
    dateParam,
    extract: (r) => ({
      iso: typeof r.timestamp === "string" ? r.timestamp : null,
      cloud: typeof r.cloudcover === "number" ? r.cloudcover : null,
      humidity: typeof r.humidity === "number" ? r.humidity : null,
      temp: typeof r.temp === "number" ? r.temp : null,
      precipProb: typeof r.precipProb === "number" ? r.precipProb : null,
      precip: typeof r.precipitation === "number" ? r.precipitation : 0,
    }),
    items,
  })
}

function summarizeRecords<T>({ dateParam, extract, items }: {
  dateParam: string
  extract: (r: T) => { iso: string | null; cloud: number | null; humidity: number | null; temp: number | null; precipProb: number | null; precip: number }
  items: T[]
}): string {
  if (!items?.length) return ""
  const sameDay = items.filter((r) => (extract(r).iso || "").startsWith(dateParam))
  const sample = sameDay.length ? sameDay : items
  const subset = sample.filter((r) => {
    const ts = extract(r).iso
    const hour = ts ? parseInt(ts.substring(11, 13), 10) : NaN
    return hour >= 15 && hour <= 22
  })
  const target = subset.length ? subset : sample.slice(-6)

  const toAvg = (arr: number[]) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null)
  const clouds = target.map((r) => extract(r).cloud).filter((n): n is number => typeof n === "number")
  const humids = target.map((r) => extract(r).humidity).filter((n): n is number => typeof n === "number")
  const temps = target.map((r) => extract(r).temp).filter((n): n is number => typeof n === "number")
  const probs = target.map((r) => extract(r).precipProb).filter((n): n is number => typeof n === "number")
  const precs = target.map((r) => extract(r).precip)

  const cloud_total_pct = toAvg(clouds)
  const humidity_pct = toAvg(humids)
  const avg_temp = toAvg(temps)
  const precip_prob_max_pct = probs.length ? Math.max(...probs) : null
  const precip_total_mm = precs.reduce((a, b) => a + (b || 0), 0)

  const parts: string[] = []
  if (cloud_total_pct !== null) parts.push(`cloud_total_pct=${Math.round(cloud_total_pct)}`)
  if (humidity_pct !== null) parts.push(`humidity_pct=${Math.round(humidity_pct)}`)
  if (typeof precip_prob_max_pct === "number") parts.push(`precip_prob_max_pct=${Math.round(precip_prob_max_pct)}`)
  parts.push(`precip_total_mm=${precip_total_mm.toFixed(1)}`)
  // legacy keys for backward-compat
  if (cloud_total_pct !== null) parts.push(`avg_cloud=${Math.round(cloud_total_pct)}`)
  if (humidity_pct !== null) parts.push(`avg_humidity=${Math.round(humidity_pct)}`)
  if (typeof avg_temp === "number") parts.push(`avg_temp=${avg_temp.toFixed(1)}`)
  if (typeof precip_prob_max_pct === "number") parts.push(`precip_prob_max=${Math.round(precip_prob_max_pct)}`)
  parts.push(`precip_total=${precip_total_mm.toFixed(1)}`)
  parts.push(`hours_analyzed=${target.length}`)
  return parts.join("; ")
}
