import OpenAI from 'openai'

export function getOpenAI() {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY not configured. Add it to /app/.env')
  }
  return new OpenAI({
    apiKey,
    baseURL: process.env.OPENAI_BASE_URL || undefined,
  })
}

export const AI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o'
