import { latLngToCell, cellToLatLng, gridDisk, cellToParent } from "h3-js";

export const DEFAULT_H3_RES = 8; // ~0.74 km² per cell

export function toH3(
  lat: number,
  lon: number,
  res: number = DEFAULT_H3_RES
): string {
  return latLngToCell(lat, lon, res);
}

export function centerOf(h3Index: string): { lat: number; lon: number } {
  const [lat, lon] = cellToLatLng(h3Index);
  return { lat, lon };
}

// Returns true if two lat/lon points fall into the same coarse H3 area,
// allowing a small tolerance: same cell at `res`, any immediate neighbor cell,
// or the same parent at (res-1). Helpful to treat "approximately the same" locations as equal.
export function roughlySameAtCoarse(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
  res: number = 4
): boolean {
  try {
    const a = latLngToCell(lat1, lon1, res);
    const b = latLngToCell(lat2, lon2, res);
    if (a === b) return true;
    try {
      const ring = gridDisk(a, 1);
      if (Array.isArray(ring) && ring.includes(b)) return true;
    } catch {}
    try {
      const pa = cellToParent(a, Math.max(0, res - 1));
      const pb = cellToParent(b, Math.max(0, res - 1));
      if (pa && pb && pa === pb) return true;
    } catch {}
    return false;
  } catch {
    return false;
  }
}
