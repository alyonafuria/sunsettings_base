import { latLngToCell, cellToLatLng } from 'h3-js'

export const DEFAULT_H3_RES = 8 // ~0.74 km² per cell

export function toH3(lat: number, lon: number, res: number = DEFAULT_H3_RES): string {
  return latLngToCell(lat, lon, res)
}

export function centerOf(h3Index: string): { lat: number; lon: number } {
  const [lat, lon] = cellToLatLng(h3Index)
  return { lat, lon }
}
