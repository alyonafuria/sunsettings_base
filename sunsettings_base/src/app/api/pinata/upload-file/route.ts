import { NextResponse } from "next/server"

export const runtime = "nodejs"

export async function POST(req: Request) {
  try {
    const PINATA_JWT = process.env.PINATA_JWT
    if (!PINATA_JWT) return NextResponse.json({ error: "Missing PINATA_JWT" }, { status: 500 })

    const form = await req.formData()
    const file = form.get("file") as File | null
    const name = (form.get("name") as string) || undefined
    const scorePercentStr = (form.get("scorePercent") as string) || undefined
    const scoreLabel = (form.get("scoreLabel") as string) || undefined
    const locationLabel = (form.get("locationLabel") as string) || undefined
    const userScorePercentStr = (form.get("userScorePercent") as string) || undefined
    // Tamper-proof extras
    const deviceId = (form.get("deviceId") as string) || undefined
    const gpsLat = (form.get("gpsLat") as string) || undefined
    const gpsLon = (form.get("gpsLon") as string) || undefined
    const gpsAccuracy = (form.get("gpsAccuracy") as string) || undefined
    const gpsFixAtIso = (form.get("gpsFixAtIso") as string) || undefined
    const captureTimestamp = (form.get("captureTimestamp") as string) || undefined
    const prehashSha256 = (form.get("prehashSha256") as string) || undefined

    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 })

    // Build upstream multipart form
    const upstream = new FormData()
    upstream.append("file", file, file.name || "upload.jpg")
    if (
      name || scorePercentStr || scoreLabel || locationLabel || userScorePercentStr ||
      deviceId || gpsLat || gpsLon || gpsAccuracy || gpsFixAtIso || captureTimestamp || prehashSha256
    ) {
      // Pinata expects this as a plain string field containing JSON
      const keyvalues: Record<string, string> = {}
      if (scorePercentStr) keyvalues.sunsetScorePercent = scorePercentStr
      if (scoreLabel) keyvalues.sunsetScoreLabel = scoreLabel
      if (locationLabel) keyvalues.locationLabel = locationLabel
      if (userScorePercentStr) keyvalues.userSunsetScorePercent = userScorePercentStr
      if (deviceId) keyvalues.deviceId = deviceId
      if (gpsLat) keyvalues.gpsLat = gpsLat
      if (gpsLon) keyvalues.gpsLon = gpsLon
      if (gpsAccuracy) keyvalues.gpsAccuracy = gpsAccuracy
      if (gpsFixAtIso) keyvalues.gpsFixAtIso = gpsFixAtIso
      if (captureTimestamp) keyvalues.captureTimestamp = captureTimestamp
      if (prehashSha256) keyvalues.prehashSha256 = prehashSha256
      type PinataMetadata = { name?: string; keyvalues?: Record<string, string> }
      const meta: PinataMetadata = { name }
      if (Object.keys(keyvalues).length) meta.keyvalues = keyvalues
      upstream.append("pinataMetadata", JSON.stringify(meta))
    }

    const res = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PINATA_JWT}`,
      },
      body: upstream,
    })

    if (!res.ok) {
      const text = await res.text()
      console.error("[pinata:upload-file] Upstream error", {
        status: res.status,
        statusText: res.statusText,
        body: text?.slice(0, 500),
      })
      return NextResponse.json(
        {
          error: `Pinata file upload failed: ${res.status} ${res.statusText}`,
          pinataStatus: res.status,
          pinataText: text,
        },
        { status: 502 }
      )
    }

    const data = await res.json()
    // Pinata returns { IpfsHash, PinSize, Timestamp }
    return NextResponse.json({ ok: true, cid: data.IpfsHash, pinata: data })
  } catch (e) {
    console.error("[pinata:upload-file] Handler error", e)
    return NextResponse.json({ error: (e as Error)?.message || "Unknown error" }, { status: 500 })
  }
}
