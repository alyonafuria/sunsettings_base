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

    const data = await parse(file, { gps: true }) as any
    const latitude = data?.latitude ?? data?.gps?.latitude
    const longitude = data?.longitude ?? data?.gps?.longitude
    if (typeof latitude === 'number' && typeof longitude === 'number') {
      return { lat: latitude, lon: longitude }
    }
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
