import Anthropic from "@anthropic-ai/sdk";

/**
 * Shared Anthropic client.
 * - maxRetries: 4  — retries 529/529-overloaded up to 4 times with exponential backoff
 * - timeout: 60s   — abort individual requests that stall (prevents >60s hangs)
 */
export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  maxRetries: 4,
  timeout: 60_000,
});
