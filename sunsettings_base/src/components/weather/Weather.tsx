"use client";

import * as React from "react";

// Removed unused BrightSky direct fetch helper to reduce bundle and lint warnings

export default function Weather({
  lat,
  lon,
}: {
  lat?: number | null;
  lon?: number | null;
}) {
  const [summary, setSummary] = React.useState<string>("");
  const [loading, setLoading] = React.useState(false);
  const [raw, setRaw] = React.useState<unknown>(null);
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    let alive = true;
    async function run() {
      if (typeof lat === "number" && typeof lon === "number") {
        setLoading(true);
        setRaw(null);
        let s = "";
        try {
          const res = await fetch(
            `/api/weather?lat=${encodeURIComponent(
              lat
            )}&lon=${encodeURIComponent(lon)}`,
            { cache: "no-store" }
          );
          if (res.ok) {
            const data = await res.json().catch(() => null);
            s =
              typeof data?.weatherSummary === "string"
                ? data.weatherSummary
                : "";
          } else {
            s = "";
          }
        } catch {
          s = "";
        }
        if (alive) {
          setSummary(s);
          setLoading(false);
        }
      } else {
        setSummary("");
        setRaw(null);
      }
    }
    run();
    return () => {
      alive = false;
    };
  }, [lat, lon]);

  if (typeof lat !== "number" || typeof lon !== "number") {
    return (
      <div className="text-xs opacity-80 w-full max-w-[90vw] md:max-w-xl">
        Pick or detect a location to fetch weather.
      </div>
    );
  }

  return (
    <div className="text-xs opacity-80 w-full max-w-[90vw] md:max-w-xl">
      <div className="mb-1">
        lat: {lat.toFixed(6)}, lon: {lon.toFixed(6)}
      </div>
      <div className="mb-2">
        {loading ? "Fetching weather…" : summary || "No weather data."}
      </div>
      <button
        type="button"
        className="underline text-foreground/80 hover:text-foreground"
        onClick={async () => {
          setOpen((v) => !v);
          const next = !open;
          if (
            next &&
            raw === null &&
            typeof lat === "number" &&
            typeof lon === "number"
          ) {
            try {
              const today = new Date();
              const dateParam = today.toISOString().slice(0, 10);
              const url = `https://api.brightsky.dev/weather?date=${dateParam}&lat=${lat}&lon=${lon}&tz=UTC&units=dwd`;
              const res = await fetch(url);
              const json: unknown = res.ok
                ? await res.json()
                : { error: `HTTP ${res.status}` };
              setRaw(json);
            } catch {
              setRaw({ error: "fetch failed" });
            }
          }
        }}
      >
        {open ? "Hide raw JSON" : "Show raw JSON"}
      </button>
      {open && (
        <pre className="mt-2 max-h-64 overflow-auto rounded-base border-2 border-border bg-secondary-background p-2 whitespace-pre-wrap break-all">
          {raw ? JSON.stringify(raw, null, 2) : "(no data)"}
        </pre>
      )}
    </div>
  );
}
