import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const PINATA_JWT = process.env.PINATA_JWT;
    if (!PINATA_JWT)
      return NextResponse.json(
        { error: "Missing PINATA_JWT" },
        { status: 500 }
      );

    const body = (await req.json()) as {
      data: unknown;
      name?: string;
    };

    if (!body || typeof body !== "object" || body.data === undefined) {
      return NextResponse.json(
        { error: "Missing JSON 'data'" },
        { status: 400 }
      );
    }

    // Phase 1: write a minimal set of keyvalues for new metadata pins
    // This does NOT alter the read path. Older pins remain unchanged.
    type MetaProperties = {
      photoCellCenterLat?: number;
      photoCellCenterLon?: number;
      photoLocationLabel?: string;
      photoCreatedAt?: string;
      takenAt?: string;
      lat?: number;
      lon?: number;
    };
    type MetaBody = {
      photoCellCenterLat?: number;
      photoCellCenterLon?: number;
      lat?: number;
      lon?: number;
      image?: string;
      photoCid?: string;
      photoLocationLabel?: string;
      photoCreatedAt?: string;
      takenAt?: string;
      properties?: MetaProperties;
    };

    const dataObj: MetaBody =
      body.data && typeof body.data === "object" ? (body.data as MetaBody) : {};
    const props: MetaProperties =
      typeof dataObj.properties === "object" && dataObj.properties
        ? (dataObj.properties as MetaProperties)
        : {};
    const kv: Record<string, string> = {};
    const asNum = (v: unknown) =>
      typeof v === "number" && Number.isFinite(v) ? String(v) : undefined;
    const asStr = (v: unknown) =>
      typeof v === "string" && v.trim().length > 0 ? v.trim() : undefined;
    const latStr = asNum(
      dataObj.photoCellCenterLat ??
        dataObj.lat ??
        props.photoCellCenterLat ??
        props.lat
    );
    const lonStr = asNum(
      dataObj.photoCellCenterLon ??
        dataObj.lon ??
        props.photoCellCenterLon ??
        props.lon
    );
    let photoCidStr = asStr(dataObj.photoCid);
    if (
      !photoCidStr &&
      typeof dataObj.image === "string" &&
      dataObj.image.startsWith("ipfs://")
    ) {
      photoCidStr = dataObj.image.slice(7);
    }
    const labelStr = asStr(
      dataObj.photoLocationLabel ?? props.photoLocationLabel
    );
    const createdAtStr = asStr(
      dataObj.photoCreatedAt ??
        dataObj.takenAt ??
        props.photoCreatedAt ??
        props.takenAt
    );
    if (photoCidStr) kv.photoCid = photoCidStr;
    if (latStr) kv.photoCellCenterLat = latStr;
    if (lonStr) kv.photoCellCenterLon = lonStr;
    if (labelStr !== undefined) kv.photoLocationLabel = labelStr;
    if (createdAtStr) kv.photoCreatedAt = createdAtStr;

    const res = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PINATA_JWT}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        pinataContent: body.data,
        pinataMetadata: {
          ...(body.name ? { name: body.name } : {}),
          ...(Object.keys(kv).length ? { keyvalues: kv } : {}),
        },
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: `Pinata JSON upload failed: ${res.status} ${text}` },
        { status: 502 }
      );
    }

    const data = await res.json();
    return NextResponse.json({ ok: true, cid: data.IpfsHash, pinata: data });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error)?.message || "Unknown error" },
      { status: 500 }
    );
  }
}
