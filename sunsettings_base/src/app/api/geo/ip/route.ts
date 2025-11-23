// Simple IP-based geolocation using ipapi.co (no API key required for coarse free tier)
// Returns: { lat, lon, label }
export async function GET() {
  try {
    const resp = await fetch("https://ipapi.co/json/", { cache: "no-store" });
    if (!resp.ok) {
      return new Response(
        JSON.stringify({ error: `ipapi request failed: ${resp.status}` }),
        { status: 502, headers: { "Content-Type": "application/json" } }
      );
    }
    const data = await resp.json();
    const lat = typeof data?.latitude === "number" ? data.latitude : null;
    const lon = typeof data?.longitude === "number" ? data.longitude : null;
    const city = typeof data?.city === "string" ? data.city : null;
    const region = typeof data?.region === "string" ? data.region : null;
    const country = typeof data?.country_name === "string" ? data.country_name : null;
    if (lat == null || lon == null) {
      return new Response(JSON.stringify({ error: "Missing location" }), {
        status: 502,
        headers: { "Content-Type": "application/json" },
      });
    }
    const parts = [city, region, country].filter((x) => !!x);
    const label = parts.join(", ") || `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
    return new Response(
      JSON.stringify({ lat, lon, label }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: (e as Error)?.message || "IP geolocation failed" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
