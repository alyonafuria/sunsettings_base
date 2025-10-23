import { NextRequest, NextResponse } from "next/server";

const PINATA_JWT = process.env.PINATA_JWT;
const RAW_GATEWAY =
  process.env.PINATA_GATEWAY ||
  process.env.NEXT_PUBLIC_PINATA_GATEWAY ||
  "https://tan-mad-gorilla-689.mypinata.cloud";
const PINATA_GATEWAY = (
  /^https?:\/\//.test(RAW_GATEWAY) ? RAW_GATEWAY : `https://${RAW_GATEWAY}`
).replace(/\/$/, "");

const PAGE_LIMIT = 25;
const MAX_PAGES = 4;

interface PinListRow {
  ipfs_pin_hash?: string;
  metadata?: {
    name?: string;
    keyvalues?: Record<string, string>;
  };
}

interface PhotoMetadata {
  metadataCid: string;
  photoCid: string;
  lat: number;
  lon: number;
  locationLabel: string | null;
  takenAtIso: string | null;
  scorePercent?: number | null;
  scoreLabel?: string | null;
  userScorePercent?: number | null;
  userScoreLabel?: string | null;
}

// Parse a numeric string into number or null
function parseNumStr(v?: string): number | null {
  if (typeof v !== "string") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

// Build PhotoMetadata from Pinata keyvalues if present
function fromKeyvalues(row: PinListRow): PhotoMetadata | null {
  const cid = typeof row.ipfs_pin_hash === "string" ? row.ipfs_pin_hash : null;
  const kv: Record<string, string> = row.metadata?.keyvalues || {};
  const lat = parseNumStr(kv.photoCellCenterLat ?? kv.lat);
  const lon = parseNumStr(kv.photoCellCenterLon ?? kv.lon);
  const photoCid =
    typeof kv.photoCid === "string" && kv.photoCid.trim().length > 0
      ? kv.photoCid.trim()
      : null;
  if (!cid || lat == null || lon == null || !photoCid) return null;
  return {
    metadataCid: cid,
    photoCid,
    lat,
    lon,
    locationLabel:
      typeof kv.photoLocationLabel === "string" ? kv.photoLocationLabel : null,
    takenAtIso:
      typeof kv.photoCreatedAt === "string"
        ? kv.photoCreatedAt
        : typeof kv.takenAt === "string"
        ? kv.takenAt
        : null,
    scorePercent: parseNumStr(kv.scorePercent ?? kv.sunsetScorePercent),
    scoreLabel:
      typeof kv.scoreLabel === "string"
        ? kv.scoreLabel
        : typeof kv.sunsetScoreLabel === "string"
        ? kv.sunsetScoreLabel
        : null,
    userScorePercent: parseNumStr(
      kv.userScorePercent ?? kv.userSunsetScorePercent
    ),
    userScoreLabel:
      typeof kv.userScoreLabel === "string"
        ? kv.userScoreLabel
        : typeof kv.userSunsetScoreLabel === "string"
        ? kv.userSunsetScoreLabel
        : null,
  };
}

type MetaProperties = {
  photoCellCenterLat?: number;
  photoCellCenterLon?: number;
  photoLocationLabel?: string;
  photoCreatedAt?: string;
};

type MetaJson = {
  // legacy fields
  photoCellCenterLat?: number;
  photoCellCenterLon?: number;
  lat?: number;
  lon?: number;
  photoCid?: string;
  photo?: { cid?: string };
  photoLocationLabel?: string;
  photoCreatedAt?: string;
  takenAt?: string;
  sunsetScorePercent?: number;
  sunsetScoreLabel?: string;
  userSunsetScorePercent?: number;
  userSunsetScoreLabel?: string;
  // erc-721 fields
  image?: string;
  attributes?: Array<{ trait_type?: string; value?: number | string | null }>;
  properties?: MetaProperties;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

async function fetchPinList(
  pageOffset: number,
  limit: number
): Promise<PinListRow[]> {
  const url = new URL("https://api.pinata.cloud/data/pinList");
  url.searchParams.set("status", "pinned");
  url.searchParams.set("pageLimit", limit.toString());
  url.searchParams.set("pageOffset", pageOffset.toString());
  url.searchParams.set("includeCount", "false");
  url.searchParams.set("includeMetadata", "true");
  url.searchParams.set("metadata[nameContains]", "sunsettings_meta");

  const res = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${PINATA_JWT}`,
    },
  });

  if (!res.ok) {
    throw new Error(`Pinata pinList failed with status ${res.status}`);
  }

  const payload = await res.json().catch(() => null);
  const rows = Array.isArray(payload?.rows) ? payload.rows : [];
  return rows;
}

async function resolveMetadata(cid: string): Promise<PhotoMetadata | null> {
  const res = await fetch(`${PINATA_GATEWAY}/ipfs/${cid}`);
  if (!res.ok) return null;

  const raw = (await res.json().catch(() => null)) as unknown;
  if (!isRecord(raw)) return null;
  const data = raw as MetaJson;

  // latitude / longitude from legacy or properties
  const lat =
    typeof data.photoCellCenterLat === "number"
      ? data.photoCellCenterLat
      : typeof data.lat === "number"
      ? data.lat
      : typeof data.properties?.photoCellCenterLat === "number"
      ? data.properties.photoCellCenterLat
      : null;
  const lon =
    typeof data.photoCellCenterLon === "number"
      ? data.photoCellCenterLon
      : typeof data.lon === "number"
      ? data.lon
      : typeof data.properties?.photoCellCenterLon === "number"
      ? data.properties.photoCellCenterLon
      : null;
  // photo CID from legacy photoCid/photo.cid or from image ipfs://
  let photoCid =
    typeof data.photoCid === "string"
      ? data.photoCid
      : typeof data.photo?.cid === "string"
      ? data.photo.cid
      : null;
  if (
    !photoCid &&
    typeof data.image === "string" &&
    data.image.startsWith("ipfs://")
  ) {
    photoCid = data.image.slice(7);
  }

  if (lat == null || lon == null || photoCid == null) return null;

  return {
    metadataCid: cid,
    photoCid,
    lat,
    lon,
    locationLabel:
      typeof data.photoLocationLabel === "string"
        ? data.photoLocationLabel
        : typeof data.properties?.photoLocationLabel === "string"
        ? data.properties.photoLocationLabel
        : null,
    takenAtIso:
      typeof data.photoCreatedAt === "string"
        ? data.photoCreatedAt
        : typeof data.takenAt === "string"
        ? data.takenAt
        : typeof data.properties?.photoCreatedAt === "string"
        ? data.properties.photoCreatedAt
        : null,
    scorePercent:
      typeof data.sunsetScorePercent === "number"
        ? data.sunsetScorePercent
        : Array.isArray(data.attributes)
        ? (data.attributes.find((a) => a.trait_type === "sunsettings_score")
            ?.value as number | undefined) ?? null
        : null,
    scoreLabel:
      typeof data.sunsetScoreLabel === "string" ? data.sunsetScoreLabel : null,
    userScorePercent:
      typeof data.userSunsetScorePercent === "number"
        ? data.userSunsetScorePercent
        : Array.isArray(data.attributes)
        ? (data.attributes.find((a) => a.trait_type === "user_score")?.value as
            | number
            | undefined) ?? null
        : null,
    userScoreLabel:
      typeof data.userSunsetScoreLabel === "string"
        ? data.userSunsetScoreLabel
        : null,
  };
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const targetPhotoCid = url.searchParams.get("photoCid")?.trim() || null;
  const targetMetadataCid = url.searchParams.get("metadataCid")?.trim() || null;
  const effectivePageLimit = Math.max(
    1,
    Math.min(100, Number(url.searchParams.get("pageLimit")) || PAGE_LIMIT)
  );
  const effectiveMaxPages = Math.max(
    1,
    Math.min(200, Number(url.searchParams.get("maxPages")) || MAX_PAGES)
  );

  if (!PINATA_JWT) {
    return NextResponse.json(
      { error: "PINATA_JWT not configured" },
      { status: 500 }
    );
  }

  // Direct resolve path: if a specific metadata CID is provided, resolve just that one
  if (targetMetadataCid) {
    try {
      const meta = await resolveMetadata(targetMetadataCid);
      return NextResponse.json(
        { items: meta ? [meta] : [] },
        {
          status: 200,
          headers: {
            "Cache-Control": "public, s-maxage=30, stale-while-revalidate=300",
          },
        }
      );
    } catch (e) {
      return NextResponse.json(
        { items: [], error: (e as Error)?.message },
        { status: 200 }
      );
    }
  }

  const items: PhotoMetadata[] = [];
  let foundTarget = false;

  for (let page = 0; page < effectiveMaxPages; page += 1) {
    const pageOffset = page * effectivePageLimit;
    let rows: PinListRow[] = [];
    try {
      rows = await fetchPinList(pageOffset, effectivePageLimit);
    } catch (err) {
      return NextResponse.json(
        { error: (err as Error).message },
        { status: 502 }
      );
    }

    if (rows.length === 0) break;

    if (process.env.NODE_ENV !== "production") {
      try {
        console.log("[photos] page", page, "rows", rows.length, {
          sample: rows.slice(0, 3).map((r) => ({
            cid: r?.ipfs_pin_hash,
            name: r?.metadata?.name,
            kvKeys: r?.metadata?.keyvalues
              ? Object.keys(r.metadata.keyvalues).slice(0, 5)
              : [],
          })),
        });
      } catch {}
    }

    // Phase 2: prefer keyvalues (fast path), fallback to gateway for a small number per page
    const FALLBACK_PER_PAGE = effectivePageLimit;

    // First, try to read from keyvalues
    for (const row of rows) {
      const meta = fromKeyvalues(row);
      if (!meta) continue;
      if (targetPhotoCid) {
        if (meta.photoCid === targetPhotoCid) {
          items.push(meta);
          foundTarget = true;
          break;
        }
      } else {
        items.push(meta);
      }
    }

    // If target not found (or we need more items), fallback for rows that lacked keyvalues
    if (!foundTarget) {
      const toFetch: string[] = [];
      for (const row of rows) {
        if (fromKeyvalues(row)) continue;
        const cid =
          typeof row?.ipfs_pin_hash === "string" ? row.ipfs_pin_hash : null;
        if (!cid) continue;
        toFetch.push(cid);
        if (toFetch.length >= FALLBACK_PER_PAGE) break;
      }
      if (toFetch.length) {
        const resolved = await Promise.all(
          toFetch.map(async (cid) => {
            try {
              return await resolveMetadata(cid);
            } catch {
              return null;
            }
          })
        );
        for (const meta of resolved) {
          if (!meta) continue;
          if (targetPhotoCid) {
            if (meta.photoCid === targetPhotoCid) {
              items.push(meta);
              foundTarget = true;
              break;
            }
          } else {
            items.push(meta);
          }
        }
        if (process.env.NODE_ENV !== "production") {
          try {
            console.log(
              "[photos] page",
              page,
              "resolved from gateway",
              resolved.filter(Boolean).length
            );
          } catch {}
        }
      }
    }

    if (foundTarget) break;
    if (rows.length < effectivePageLimit) break;
  }

  if (process.env.NODE_ENV !== "production") {
    try {
      console.log("[photos] total items returned", items.length, {
        sample: items.slice(0, 5).map((i) => ({
          metadataCid: i.metadataCid,
          photoCid: i.photoCid,
          lat: i.lat,
          lon: i.lon,
          hasScores: !!(i.scorePercent != null || i.userScorePercent != null),
        })),
      });
    } catch {}
  }

  return NextResponse.json(
    { items },
    {
      status: 200,
      headers: {
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=300",
      },
    }
  );
}
