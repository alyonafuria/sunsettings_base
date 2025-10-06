import type { SunsetAnalysisParams, SunsetAnalysisResult, SunsetServiceConfig } from "../interfaces/sunset"
import { SUNSET_ANALYSIS_PROMPT, SYSTEM_MESSAGE } from "../sunsetPrompts"

/**
 * Service for AI-powered sunset quality analysis
 */
export class SunsetAIService {
  private config: SunsetServiceConfig

  constructor(config: SunsetServiceConfig) {
    this.config = {
      temperature: 0.7,
      maxTokens: 200,
      ...config,
    }
  }

  /**
   * Analyzes sunset quality based on weather data using OpenAI API
   */
  async analyzeSunset(params: SunsetAnalysisParams): Promise<SunsetAnalysisResult> {
    const { location, weatherSummary, seed } = params

    const truncatedWxSummary = weatherSummary.length > 220 ? weatherSummary.slice(0, 220) : weatherSummary

    const prompt = SUNSET_ANALYSIS_PROMPT
      .replace("{weatherSummary}", truncatedWxSummary || "avg_cloud:NA; avg_humidity:NA; avg_temp:NA; precip_prob_max:NA; precip_total:NA; hours_analyzed:NA")
      .replace("{location}", location)
      .replace("{timeUTC}", new Date().toISOString())
      .replace("{seed}", String(seed))

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.config.model,
        temperature: this.config.temperature,
        max_tokens: this.config.maxTokens,
        messages: [
          { role: "system", content: SYSTEM_MESSAGE },
          { role: "user", content: prompt },
        ],
      }),
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const data = await response.json()
    const raw = data?.choices?.[0]?.message?.content?.trim() || ""

    // Debug raw response
    // console.debug('[SunsetAI raw]', raw)

    return this.parseResponse(raw)
  }

  /**
   * Parses the AI response and extracts JSON data
   */
  private parseResponse(raw: string): SunsetAnalysisResult {
    let parsed: unknown = null

    try {
      parsed = JSON.parse(raw)
    } catch {
      const match = raw.match(/\{[\s\S]*\}/)
      if (match) {
        try {
          parsed = JSON.parse(match[0])
        } catch {
          // ignore
        }
      }
    }

    if (!parsed || typeof parsed !== "object") {
      throw new Error("Bad JSON response from AI")
    }

    const obj = parsed as { probability?: unknown; description?: unknown }
    return {
      probability: typeof obj.probability === "number" ? obj.probability : null,
      description: typeof obj.description === "string" ? obj.description : "No description",
    }
  }

  normalizeProbability(probability: unknown): number | null {
    if (typeof probability !== "number") return null
    return Math.min(100, Math.max(0, Math.round(probability)))
  }

  generateFallbackProbability(location: string, weatherSummary: string): number {
    const hash = Array.from(location + weatherSummary).reduce((a, c) => (a * 131 + c.charCodeAt(0)) % 1000003, 7)
    const base = 40 + (hash % 50)
    const jitter = Math.floor(Math.random() * 11)
    let synthetic = base + jitter

    if (synthetic < 55 && Math.random() < 0.4) {
      synthetic += 20
    }

    return Math.min(96, synthetic)
  }

  shouldRetry(
    probability: number | null,
    previousResult: { location: string; probability: number | null } | null,
    currentLocation: string,
  ): boolean {
    if (probability === 75) return true
    if (
      previousResult &&
      previousResult.location === currentLocation &&
      typeof previousResult.probability === "number" &&
      previousResult.probability === probability
    ) {
      return true
    }
    return false
  }
}

export const createSunsetAIService = (): SunsetAIService | null => {
  const apiKey = process.env.OPENAI_API_KEY || process.env.NEXT_PRIVATE_OPENAI_API_KEY || process.env.NEXT_OPENAI_API_KEY
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini"
  const temperature = process.env.OPENAI_TEMPERATURE ? Number(process.env.OPENAI_TEMPERATURE) : undefined
  const maxTokens = process.env.OPENAI_MAX_TOKENS ? Number(process.env.OPENAI_MAX_TOKENS) : undefined
  if (!apiKey) return null
  return new SunsetAIService({ apiKey, model, temperature, maxTokens })
}
