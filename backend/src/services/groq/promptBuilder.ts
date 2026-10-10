import { SchemaInfo, TableInfo } from '../../services/schema/introspectionService';

/**
 * Simple relevance filter: keep a table if any keyword from the user prompt
 * appears in the table name or any of its column names.
 * If the schema has 5 or fewer tables, or no matches, return all tables.
 */
export function filterRelevantTables(schema: SchemaInfo, userPrompt: string): TableInfo[] {
  const keywords = userPrompt.toLowerCase().split(/\s+/).filter(Boolean);
  const relevant = schema.tables.filter(t =>
    keywords.some(k =>
      t.name.toLowerCase().includes(k) ||
      t.columns.some(c => c.name.toLowerCase().includes(k))
    )
  );
  if (schema.tables.length <= 5 || relevant.length === 0) return schema.tables;
  return relevant;
}

/**
 * Build system and user messages for the Groq model.
 * The system message enforces the safety rules.
 */
export function buildPrompt(dialect: string, schema: SchemaInfo, userPrompt: string): { system: string; user: string } {
  const tables = filterRelevantTables(schema, userPrompt);
  const schemaText = tables.map(t => {
    const cols = t.columns.map(c => `${c.name} (${c.type}${c.nullable ? '' : ' NOT NULL'})`).join(', ');
    return `Table ${t.name}: ${cols}`;
  }).join('\n');

  const pgRule = dialect === 'postgres' ? '\n- For PostgreSQL, enclose table and column names in double quotes (e.g. "Department", "Employee", "Students", "EmpName", "Salary") to preserve exact casing.' : '';
  const system = `You are an expert SQL generator. Follow these rules strictly:\n- Use ONLY the supplied schema (case-sensitive) shown below.\n- Follow the requested dialect: ${dialect}.${pgRule}\n- NEVER invent tables or columns.\n- LIST any assumptions you make.\n- NEVER claim to execute the SQL; only generate it.\n- Return a SINGLE JSON object matching the backend schema.\n- The JSON must have the shape:\n{\n  "candidates": [\n    {\n      "sql": "...",\n      "explanation": "...",\n      "tablesUsed": ["..."],\n      "columnsUsed": ["..."],\n      "operations": ["..."],\n      "assumptions": ["..."]\n    }\n  ],\n  "intent": "SELECT" | "INSERT" | "UPDATE" | "DELETE"\n}\nDo not wrap the JSON in markdown code fences or include any extra text. Provide exactly this structure even if there is only one candidate.`;

  const user = `Schema (case-sensitive):\n${schemaText}\n\nUser request:\n${userPrompt}`;

  return { system, user };
}
