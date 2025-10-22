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

    const form = await req.formData();
    const file = form.get("file") as File | null;
    const name = (form.get("name") as string) || undefined;
    // Tamper-proof extras
    const deviceId = (form.get("deviceId") as string) || undefined;
    const captureTimestamp =
      (form.get("captureTimestamp") as string) || undefined;
    const prehashSha256 = (form.get("prehashSha256") as string) || undefined;

    if (!file)
      return NextResponse.json({ error: "No file provided" }, { status: 400 });

    // Build upstream multipart form
    const upstream = new FormData();
    upstream.append("file", file, file.name || "upload.jpg");
    if (name || deviceId || captureTimestamp || prehashSha256) {
      // Pinata expects this as a plain string field containing JSON
      const keyvalues: Record<string, string> = {};
      const addKv = (key: string, value: string | undefined) => {
        if (!value) return;
        if (Object.keys(keyvalues).length >= 10) return;
        keyvalues[key] = value;
      };

      // Keep only minimal debug fields on the FILE pin; all discovery fields live on the JSON metadata pin
      addKv("deviceId", deviceId);
      addKv("photoCreatedAt", captureTimestamp);
      addKv("prehashSha256", prehashSha256);
      type PinataMetadata = {
        name?: string;
        keyvalues?: Record<string, string>;
      };
      // Enforce a consistent 'sunsettings_photo_*' prefix for the FILE pin name
      const ts = new Date().toISOString().replace(/[:.]/g, "-");
      const rawName =
        typeof name === "string" && name.trim().length
          ? name.trim()
          : file.name || "";
      const extMatch = /\.([a-z0-9]{2,5})$/i.exec(rawName);
      const ext = extMatch ? `.${extMatch[1].toLowerCase()}` : ".jpg";
      const finalName = rawName.startsWith("sunsettings_photo")
        ? rawName
        : `sunsettings_photo_${ts}${ext}`;
      const meta: PinataMetadata = { name: finalName };
      if (Object.keys(keyvalues).length) meta.keyvalues = keyvalues;
      upstream.append("pinataMetadata", JSON.stringify(meta));
    }

    const res = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PINATA_JWT}`,
      },
      body: upstream,
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("[pinata:upload-file] Upstream error", {
        status: res.status,
        statusText: res.statusText,
        body: text?.slice(0, 500),
      });
      return NextResponse.json(
        {
          error: `Pinata file upload failed: ${res.status} ${res.statusText}`,
          pinataStatus: res.status,
          pinataText: text,
        },
        { status: 502 }
      );
    }

    const data = await res.json();
    // Pinata returns { IpfsHash, PinSize, Timestamp }
    return NextResponse.json({ ok: true, cid: data.IpfsHash, pinata: data });
  } catch (e) {
    console.error("[pinata:upload-file] Handler error", e);
    return NextResponse.json(
      { error: (e as Error)?.message || "Unknown error" },
      { status: 500 }
    );
  }
}
