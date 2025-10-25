import { sdk } from "@farcaster/miniapp-sdk";

export type PreferredLocation = {
  lat: number;
  lon: number;
  source: "base" | "browser" | "ip";
};

// Narrow error type to mimic GeolocationPositionError shape when possible
type GeoErr = { code?: number; message?: string };

// IP fallback via our API
async function fetchIpLocation(): Promise<PreferredLocation> {
  const res = await fetch("/api/geo/ip", { cache: "no-store" });
  if (!res.ok) throw new Error(`IP geolocation failed: ${res.status}`);
  const j = await res.json();
  const lat = Number(j?.lat);
  const lon = Number(j?.lon);
  if (Number.isFinite(lat) && Number.isFinite(lon)) {
    return { lat, lon, source: "ip" };
  }
  throw new Error("Invalid IP geolocation response");
}

export async function getPreferredLocation(): Promise<PreferredLocation> {
  // 1) Try Base/Farcaster Mini App context if present
  try {
    const anySdk = sdk as unknown as {
      context?: {
        // Try a few likely shapes safely
        isInMiniApp?: () => boolean | Promise<boolean>;
        getLocation?: () => Promise<{ latitude?: number; longitude?: number } | undefined>;
        getDeviceLocation?: () => Promise<{ latitude?: number; longitude?: number } | undefined>;
        location?: { latitude?: number; longitude?: number };
      };
    };
    const inMini = anySdk?.context?.isInMiniApp ? await Promise.resolve(anySdk.context.isInMiniApp()) : false;
    if (inMini) {
      // Prefer explicit methods if available
      const byMethod = (await anySdk.context?.getLocation?.()) || (await anySdk.context?.getDeviceLocation?.());
      const lat = byMethod?.latitude ?? anySdk.context?.location?.latitude;
      const lon = byMethod?.longitude ?? anySdk.context?.location?.longitude;
      if (typeof lat === "number" && typeof lon === "number") {
        return { lat, lon, source: "base" };
      }
      // If in mini app but no coords provided, continue to browser
    }
  } catch {
    // ignore and continue
  }

  // 2) Try browser geolocation
  try {
    const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
      if (!("geolocation" in navigator)) return reject({ message: "Geolocation unsupported" } as GeoErr);
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: false,
        timeout: 15000,
        maximumAge: 30 * 60 * 1000,
      });
    });
    const lat = pos.coords.latitude;
    const lon = pos.coords.longitude;
    return { lat, lon, source: "browser" };
  } catch (e) {
    const code = (e as GeoErr)?.code;
    const msg = (e as GeoErr)?.message ?? "Geolocation failed";
    // If explicitly denied, recordable by caller, but we still fall back to IP
    // 3) IP fallback
    try {
      const ip = await fetchIpLocation();
      return ip;
    } catch {
      const err = new Error(msg) as Error & GeoErr & { code?: number };
      err.code = code;
      throw err;
    }
  }
}
