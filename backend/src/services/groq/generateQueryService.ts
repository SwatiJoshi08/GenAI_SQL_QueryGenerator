import { saveGeneratedHistory } from '../history/historyService';
import { buildPrompt } from './promptBuilder';
import { callGroq } from './groqClient';
import { validateResponse, GroqResponse } from './responseValidator';
import { SchemaIntrospectionService } from '../schema/introspectionService';
import { validateSQL } from '../validator/validationService';
import { analyzeImpact } from '../impact/impactService';
import { explainQuery } from '../explainer/explainerService';
import { optimizeQuery } from '../optimizer/optimizerService';

/**
 * Service that generates SQL query candidates using Groq.
 * 
 * Steps:
 * 1. Retrieve the database schema information.
 * 2. Build the system and user prompts using the dialect and the user's request.
 * 3. Call the Groq LLM.
 * 4. Validate the JSON response.
 * 5. Return the parsed object to the caller.
 */
export async function generateQuery(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { dialect, request: userRequest } = req.body;
    if (!dialect || !userRequest) {
      return res.status(400).json({ message: 'Missing required fields: dialect, request' });
    }

    const schemaInfo = await SchemaIntrospectionService.getSchema(dialect);

    // 2. Build prompts
    const { system, user } = buildPrompt(dialect, schemaInfo, userRequest);

    // 3. Call Groq LLM
    const rawResponse = await callGroq(system, user);
    console.log('Groq raw response:', rawResponse);

    // 4. Strip any markdown fences and validate/parse response with retry
    const stripFences = (str: string) =>
      str.replace(/```json\s*([\s\S]*?)```/g, '$1')
         .replace(/```[\s]*([\s\S]*?)```/g, '$1')
         .trim();

    let cleaned = stripFences(rawResponse);
    let parsed: GroqResponse;
    try {
      parsed = validateResponse(cleaned);
    } catch (e: any) {
      if (e.name === 'ZodError') {
        // Retry asking Groq to reformat
        const retryUser = `Please reformat your previous response to match exactly the required JSON schema without any markdown formatting.`;
        const retryRaw = await callGroq(system, retryUser);
        console.log('Groq retry raw response:', retryRaw);
        cleaned = stripFences(retryRaw);
        parsed = validateResponse(cleaned);
      } else {
        throw e;
      }
    }

    // 5. Save generated history
    const historyId = await saveGeneratedHistory({
      user_id: 1,
      prompt: userRequest,
      database_type: dialect,
      generated_query: parsed.candidates,
    });

    // 6. Validate each candidate
    const validatedCandidates = await Promise.all(
      parsed.candidates.map(async (candidate) => {
        const validation = await validateSQL(candidate.sql, dialect as any);
        let impact, explain, optimize;
        if (validation.valid) {
          impact = await analyzeImpact(candidate.sql, dialect as any);
          explain = await explainQuery(candidate.sql, dialect as any);
          optimize = await optimizeQuery(candidate.sql, dialect as any);
        }
        return { ...candidate, validation, impact, explain, optimize };
      })
    );

    // 7. Return response with history ID
    return res.json({ ...parsed, candidates: validatedCandidates, historyId });


  } catch (err: any) {
    // Map known errors to appropriate HTTP statuses
    if (err.name === 'TimeoutError') {
      return res.status(504).json({ message: 'Groq request timed out' });
    }
    if (err.name === 'RateLimitError') {
      return res.status(429).json({ message: 'Groq rate limit exceeded, please retry later' });
    }
    if (err.name === 'ZodError') {
      return res.status(502).json({ message: 'Invalid response format from Groq', details: err.errors });
    }
    console.error('generateQuery error:', err);
    return res.status(500).json({ message: 'Internal server error', error: err.message });
  }
}
