export function getMapboxToken(): string | null {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
  return typeof token === "string" && token.trim() ? token : null
}

export const MAPBOX_TOKEN_MISSING_MSG =
  "Missing NEXT_PUBLIC_MAPBOX_TOKEN. Create a .env.local with NEXT_PUBLIC_MAPBOX_TOKEN=your_token";

export function getMapboxStyle(): string | null {
  const style = process.env.NEXT_PUBLIC_MAPBOX_STYLE
  return typeof style === "string" && style.trim() ? style : null
}
