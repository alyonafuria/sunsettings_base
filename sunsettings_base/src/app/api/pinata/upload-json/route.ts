import { NextResponse } from "next/server"

export const runtime = "nodejs"

export async function POST(req: Request) {
  try {
    const PINATA_JWT = process.env.PINATA_JWT
    if (!PINATA_JWT) return NextResponse.json({ error: "Missing PINATA_JWT" }, { status: 500 })

    const body = (await req.json()) as {
      data: unknown
      name?: string
    }

    if (!body || typeof body !== "object" || body.data === undefined) {
      return NextResponse.json({ error: "Missing JSON 'data'" }, { status: 400 })
    }

    const res = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PINATA_JWT}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        pinataContent: body.data,
        pinataMetadata: body.name ? { name: body.name } : undefined,
      }),
    })

    if (!res.ok) {
      const text = await res.text()
      return NextResponse.json({ error: `Pinata JSON upload failed: ${res.status} ${text}` }, { status: 502 })
    }

    const data = await res.json()
    return NextResponse.json({ ok: true, cid: data.IpfsHash, pinata: data })
  } catch (e) {
    return NextResponse.json({ error: (e as Error)?.message || "Unknown error" }, { status: 500 })
  }
}
