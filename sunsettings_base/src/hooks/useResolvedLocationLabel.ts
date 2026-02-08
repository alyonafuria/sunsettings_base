import * as React from "react";

export type ResolvedLocation = {
  label: string;
  value: string;
} | null;

/**
 * Hook to resolve coordinates to location labels using reverse geocoding
 * @param lat - Latitude
 * @param lon - Longitude
 * @param shouldResolve - Whether to resolve (e.g., only if label looks like coordinates)
 * @returns Resolved location with label and value, or null if resolution failed
 */
export function useResolvedLocation(
  lat: number | null | undefined,
  lon: number | null | undefined,
  shouldResolve: boolean = true
): ResolvedLocation {
  const [resolved, setResolved] = React.useState<ResolvedLocation>(null);

  React.useEffect(() => {
    const controller = new AbortController();

    async function resolveLocation() {
      if (lat == null || lon == null || !shouldResolve) {
        setResolved(null);
        return;
      }

      try {
        const { reverseGeocode } = await import("@/components/ui/location-combobox/geocode");
        const lang = typeof navigator !== "undefined" && navigator.language ? navigator.language : "en";
        const result = await reverseGeocode(lat, lon, controller.signal, lang);
        setResolved(result);
      } catch {
        setResolved(null);
      }
    }

    resolveLocation();
    return () => controller.abort();
  }, [lat, lon, shouldResolve]);

  return resolved;
}

/**
 * Hook to resolve coordinate-like location labels to proper city names
 * Convenience wrapper around useResolvedLocation for simple label-only use cases
 */
export function useResolvedLocationLabel(
  lat: number | null | undefined,
  lon: number | null | undefined,
  label: string | null | undefined
): string | null {
  // Check if label looks like coordinates (e.g., "52.582, 13.397")
  const currentLabel = label || "";
  const looksLikeCoords = /^-?\d+\.?\d*,\s*-?\d+\.?\d*$/.test(currentLabel.trim());
  
  const resolved = useResolvedLocation(lat, lon, looksLikeCoords);
  return resolved?.label ?? null;
}
