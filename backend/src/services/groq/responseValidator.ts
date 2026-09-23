import { z } from 'zod';

// Define the shape of a single candidate
export const CandidateSchema = z.object({
  sql: z.string(),
  explanation: z.string(),
  tablesUsed: z.array(z.string()),
  columnsUsed: z.array(z.string()),
  operations: z.array(z.string()),
  assumptions: z.array(z.string()),
});

// Define the overall response schema
export const GroqResponseSchema = z.object({
  candidates: z.array(CandidateSchema),
  intent: z.string(),
});

export type GroqResponse = z.infer<typeof GroqResponseSchema>;

/**
 * Validates the raw JSON string returned by Groq.
 * Returns the parsed object if valid, otherwise throws a ZodError.
 */
export function validateResponse(jsonString: string): GroqResponse {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonString);
  } catch (e) {
    throw new Error('Invalid JSON returned from Groq');
  }
  return GroqResponseSchema.parse(parsed);
}
