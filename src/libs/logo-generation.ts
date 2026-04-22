/**
 * Logo generation pipeline helper.
 * Calls the Supabase Edge Function to generate logos via Recraft V4.
 *
 * Environment variables required:
 *   NEXT_PUBLIC_SUPABASE_URL — Supabase project URL
 *   LOGO_API_SECRET          — Shared secret (must match Supabase secret of same name)
 */

export interface FeedbackContext {
  feedbackRound?: number
  nextRound?: number
  previous_feedback?: Array<{
    assetId: string
    overallRating?: string | null
    notes?: string | null
  }>
  /** Per-logo targeted modifications for liked logos with notes */
  modifications?: Array<{
    originalPrompt: string
    variant: string
    notes: string
  }>
  /** Which variants need fresh replacements (from disliked logos) */
  replacementVariants?: string[]
}

export interface LogoGenerationResult {
  success: boolean
  generated: number
  assets: Array<{ id: string; url: string; variant: string }>
}

/**
 * Triggers logo generation via the Supabase Edge Function.
 * This is a fire-and-forget call — the Edge Function runs asynchronously
 * and updates generated_assets records when complete.
 *
 * The caller should create 'generating' placeholder records before calling this,
 * so the UI can show a loading state while polling.
 */
export function triggerLogoGeneration(
  businessId: string,
  feedbackContext?: FeedbackContext
): void {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  const secret = process.env.LOGO_API_SECRET

  const url = `${siteUrl}/api/internal/generate-logos`

  // Fire and forget — don't await
  fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(secret ? { Authorization: `Bearer ${secret}` } : {}),
    },
    body: JSON.stringify({ businessId, feedbackContext }),
  })
    .then(async (res) => {
      if (!res.ok) {
        const text = await res.text().catch(() => '(no body)')
        console.error(`[logo-generation] Edge function returned ${res.status}:`, text)
      }
    })
    .catch((err) => {
      console.error('[logo-generation] Edge function call failed:', err)
    })
}

/**
 * Calls the Edge Function and waits for the result.
 * Use for synchronous flows where you need to know when generation is done.
 */
export async function generateLogosSync(
  businessId: string,
  feedbackContext?: FeedbackContext
): Promise<LogoGenerationResult> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  const secret = process.env.LOGO_API_SECRET

  const url = `${siteUrl}/api/internal/generate-logos`

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(secret ? { Authorization: `Bearer ${secret}` } : {}),
    },
    body: JSON.stringify({ businessId, feedbackContext }),
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '(no body)')
    throw new Error(`Logo generation failed (${response.status}): ${text}`)
  }

  return response.json() as Promise<LogoGenerationResult>
}
