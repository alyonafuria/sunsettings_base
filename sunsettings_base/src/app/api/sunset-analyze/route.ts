import { NextResponse } from "next/server"
import { createSunsetAIService } from "@/lib/ai/services/SunsetAIService"

export const runtime = "nodejs"

export async function POST(req: Request) {
  try {
    const { location, weatherSummary, seed } = (await req.json()) as {
      location: string
      weatherSummary: string
      seed?: number
    }

    if (!location) {
      return NextResponse.json({ error: "Missing location" }, { status: 400 })
    }
    const safeSummary = (weatherSummary && weatherSummary.trim().length > 0)
      ? weatherSummary
      : "avg_cloud:NA; avg_humidity:NA; avg_temp:NA; precip_prob_max:NA; precip_total:NA; hours_analyzed:NA"

    const service = createSunsetAIService()
    if (!service) {
      return NextResponse.json({ error: "Missing OpenAI API key" }, { status: 500 })
    }

    const result = await service.analyzeSunset({
      location,
      weatherSummary: safeSummary,
      seed: typeof seed === "number" ? seed : Math.floor(Math.random() * 1000000),
    })

    return NextResponse.json({ ok: true, result })
  } catch (e) {
    return NextResponse.json({ error: (e as Error)?.message || "Unknown error" }, { status: 500 })
  }
}
