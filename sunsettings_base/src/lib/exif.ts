/* eslint-disable @typescript-eslint/no-explicit-any */
// Note: exifr doesn't export stable TS types for all fields; use loose typing in this thin wrapper.

// Lightweight wrapper to parse GPS from a File using exifr.
// Returns null if EXIF or GPS are not present or parsing fails.
export async function parseGpsFromFile(file: File): Promise<{ lat: number; lon: number } | null> {
  try {
    const mod = await import('exifr')
    const parse: ((blob: Blob, options?: unknown) => Promise<unknown>) | undefined =
      typeof (mod as any)?.parse === 'function'
        ? (mod as any).parse
        : typeof (mod as any)?.default === 'function'
          ? (mod as any).default
          : undefined

    if (!parse) return null

    // Enable more sections to improve compatibility across devices (HEIC/JPEG/XMP)
    const data = await parse(file, { tiff: true, ifd0: true, exif: true, gps: true, xmp: true }) as any

    // Common resolved fields provided by exifr
    const lat: any = data?.latitude ?? data?.Latitude ?? data?.GPSLatitude ?? data?.gps?.latitude ?? data?.gps?.Latitude
    const lon: any = data?.longitude ?? data?.Longitude ?? data?.GPSLongitude ?? data?.gps?.longitude ?? data?.gps?.Longitude

    // Convert array [deg, min, sec] to decimal
    const dmsToDec = (v: any): number | null => {
      if (typeof v === 'number') return v
      if (Array.isArray(v) && v.length >= 3 && v.every((n) => typeof n === 'number')) {
        const [d, m, s] = v as number[]
        const sign = d < 0 ? -1 : 1
        return sign * (Math.abs(d) + (m || 0) / 60 + (s || 0) / 3600)
      }
      if (typeof v === 'string') {
        const num = Number(v)
        return Number.isFinite(num) ? num : null
      }
      return null
    }

    let latNum = dmsToDec(lat)
    let lonNum = dmsToDec(lon)
    if (typeof latNum !== 'number' || !Number.isFinite(latNum) || typeof lonNum !== 'number' || !Number.isFinite(lonNum)) {
      // Fallback: try exifr.gps() helper which normalizes many vendor quirks (esp. HEIC on iOS)
      try {
        const gpsFn: ((blob: Blob) => Promise<any>) | undefined = (mod as any)?.gps
        if (typeof gpsFn === 'function') {
          const g = await gpsFn(file)
          if (g) {
            latNum = typeof g.latitude === 'number' ? g.latitude : latNum
            lonNum = typeof g.longitude === 'number' ? g.longitude : lonNum
            try { console.debug('[exif] gps() fallback used', { lat: latNum, lon: lonNum, mime: (file as any)?.type }) } catch {}
          }
        }
      } catch {}
    }
    if (typeof latNum === 'number' && typeof lonNum === 'number' && Number.isFinite(latNum) && Number.isFinite(lonNum)) {
      try { console.debug('[exif] GPS parsed', { lat: latNum, lon: lonNum, mime: (file as any)?.type }) } catch {}
      return { lat: latNum, lon: lonNum }
    }
    try { console.debug('[exif] GPS missing/invalid', { hasData: !!data, mime: (file as any)?.type }) } catch {}
    return null
  } catch {
    return null
  }
}

// Returns ISO string for when the photo was taken, if available from EXIF.
// Falls back to null if not present or parsing fails.
export async function parseTakenAtFromFile(file: File): Promise<string | null> {
  try {
    const mod = await import('exifr')
    const parse: ((blob: Blob, options?: unknown) => Promise<unknown>) | undefined =
      typeof (mod as any)?.parse === 'function'
        ? (mod as any).parse
        : typeof (mod as any)?.default === 'function'
          ? (mod as any).default
          : undefined

    if (!parse) return null

    const data = await parse(file, { exif: true }) as any
    const dt: Date | undefined = data?.DateTimeOriginal || data?.CreateDate || data?.ModifyDate
    if (dt instanceof Date && !isNaN(dt.getTime())) return dt.toISOString()
    return null
  } catch {
    return null
  }
}
