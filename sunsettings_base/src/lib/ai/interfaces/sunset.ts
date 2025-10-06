export interface SunsetServiceConfig {
  apiKey: string
  model: string
  temperature?: number
  maxTokens?: number
}

export interface SunsetAnalysisParams {
  location: string
  weatherSummary: string
  seed: number
}

export interface SunsetAnalysisResult {
  probability: number | null
  description: string
}
