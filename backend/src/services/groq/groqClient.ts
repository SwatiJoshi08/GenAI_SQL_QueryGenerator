import Groq from 'groq-sdk';

// Initialize Groq client using the API key from environment
const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

/**
 * Calls the Groq chat completion endpoint.
 * Returns the assistant message content.
 * Throws custom errors for rate‑limit (429) and timeout.
 */
export async function callGroq(systemPrompt: string, userPrompt: string): Promise<string> {
  const timeoutMs = 20000; // 20 seconds
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await client.chat.completions.create(
      {
        model: process.env.GROQ_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0,
      },
      { signal: controller.signal }
    );
    const content = response.choices?.[0]?.message?.content;
    return content ?? '';
  } catch (err: any) {
    if (err.name === 'AbortError') {
      const e = new Error('The request timed out');
      (e as any).name = 'TimeoutError';
      throw e;
    }
    if (err.status === 429) {
      const e = new Error('Rate limit exceeded');
      (e as any).name = 'RateLimitError';
      throw e;
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}
