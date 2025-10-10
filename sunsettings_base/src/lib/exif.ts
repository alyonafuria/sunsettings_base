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
    const latRaw: any = data?.latitude ?? data?.Latitude ?? data?.GPSLatitude ?? data?.gps?.latitude ?? data?.gps?.Latitude
    const lonRaw: any = data?.longitude ?? data?.Longitude ?? data?.GPSLongitude ?? data?.gps?.longitude ?? data?.gps?.Longitude
    const latRef: string | undefined = (data?.GPSLatitudeRef || data?.gps?.GPSLatitudeRef) as any
    const lonRef: string | undefined = (data?.GPSLongitudeRef || data?.gps?.GPSLongitudeRef) as any

    // Convert array [deg, min, sec] to decimal
    const dmsToDec = (v: any, ref?: string | null): number | null => {
      if (typeof v === 'number') return v
      if (Array.isArray(v)) {
        // Some vendors encode DMS as strings inside the array
        const nums = v.map((x) => (typeof x === 'number' ? x : Number(x))).filter((x) => Number.isFinite(x))
        if (nums.length >= 3) {
          const [d, m, s] = nums as number[]
          let val = (Math.abs(d) + (m || 0) / 60 + (s || 0) / 3600) * (d < 0 ? -1 : 1)
          if (ref && /^(S|W)$/i.test(ref)) val = -Math.abs(val)
          return val
        }
      }
      if (typeof v === 'string') {
        // Accept plain decimal or DMS like "52,31,12.34 N" or degree symbols. Handle N/S/E/W suffix or ref.
        const trimmed = v.trim()
        const suffix = /([NSEW])$/i.exec(trimmed)?.[1]?.toUpperCase() || null
        const core = suffix ? trimmed.replace(/([NSEW])$/i, '').trim() : trimmed
        const parts = core.split(/[^0-9.+-]+/).filter(Boolean).map(Number)
        if (parts.length === 1 && Number.isFinite(parts[0])) {
          let val = parts[0]
          const signRef = suffix || ref || null
          if (signRef && /^(S|W)$/i.test(signRef)) val = -Math.abs(val)
          return val
        }
        if (parts.length >= 3 && parts.every((n) => Number.isFinite(n))) {
          const [d, m, s] = parts
          let val = (Math.abs(d) + (m || 0) / 60 + (s || 0) / 3600) * (d < 0 ? -1 : 1)
          const signRef = suffix || ref || null
          if (signRef && /^(S|W)$/i.test(signRef)) val = -Math.abs(val)
          return val
        }
        const num = Number(core)
        if (Number.isFinite(num)) {
          let val = num
          const signRef = suffix || ref || null
          if (signRef && /^(S|W)$/i.test(signRef)) val = -Math.abs(val)
          return val
        }
        return null
      }
      return null
    }

    // Try standard fields (+ refs) first
    let latNum = dmsToDec(latRaw, latRef || null)
    let lonNum = dmsToDec(lonRaw, lonRef || null)
    // Some Android/Samsung paths store values in XMP strings under data.xmp
    if ((typeof latNum !== 'number' || !Number.isFinite(latNum)) && typeof (data as any)?.xmp?.GPSLatitude === 'string') {
      latNum = dmsToDec((data as any).xmp.GPSLatitude, null)
    }
    if ((typeof lonNum !== 'number' || !Number.isFinite(lonNum)) && typeof (data as any)?.xmp?.GPSLongitude === 'string') {
      lonNum = dmsToDec((data as any).xmp.GPSLongitude, null)
    }
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
    try { console.debug('[exif] GPS missing/invalid', { hasData: !!data, mime: (file as any)?.type, keys: Object.keys(data || {}) }) } catch {}
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
