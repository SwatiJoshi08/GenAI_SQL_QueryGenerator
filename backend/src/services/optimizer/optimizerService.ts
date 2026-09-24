import { Parser } from 'node-sql-parser';
import { getReaderConnection } from '../../db';
import { callGroq } from '../groq/groqClient';

export interface OptimizationSuggestion {
  type: string;
  message: string;
}

export interface OptimizerResponse {
  suggestions: OptimizationSuggestion[];
  rewrittenQuery?: string;
}

export async function optimizeQuery(sql: string, dialect: 'mysql' | 'postgres', askGroqForRewrite: boolean = false): Promise<OptimizerResponse> {
  const suggestions: OptimizationSuggestion[] = [];
  const parser = new Parser();
  let ast: any;
  try {
    ast = parser.astify(sql, { database: dialect === 'postgres' ? 'PostgreSQL' : 'MySQL' });
  } catch (e) {
    return { suggestions: [{ type: 'parse_error', message: 'Could not parse SQL for rule-based optimization.' }] };
  }

  if (Array.isArray(ast)) ast = ast[0];

  // 1. SELECT *
  if (ast.columns === '*' || (Array.isArray(ast.columns) && ast.columns.some((c: any) => c.expr?.type === 'column_ref' && c.expr?.column === '*'))) {
    suggestions.push({ type: 'rule', message: 'Avoid using SELECT *. Specify columns explicitly to reduce data transfer and memory usage.' });
  }

  // 2. Missing LIMIT
  if (!ast.limit && ast.from && ast.from.length > 0) {
    suggestions.push({ type: 'rule', message: 'Missing LIMIT clause. On large tables, this might return too many rows.' });
  }

  // 3. Function calls in WHERE
  function checkWhereForFunctions(node: any) {
    if (!node || typeof node !== 'object') return;
    if (node.type === 'function' || node.type === 'aggr_func') {
      suggestions.push({ type: 'rule', message: 'Applying functions to columns in WHERE/JOIN clauses can prevent index usage (non-sargable).' });
      return;
    }
    if (Array.isArray(node)) {
      node.forEach(checkWhereForFunctions);
    } else {
      Object.keys(node).forEach(k => checkWhereForFunctions(node[k]));
    }
  }
  checkWhereForFunctions(ast.where);

  // 4. EXPLAIN analysis
  try {
    const conn = getReaderConnection(dialect);
    const explainSql = dialect === 'postgres' ? `EXPLAIN (FORMAT JSON) ${sql}` : `EXPLAIN FORMAT=JSON ${sql}`;
    const [explainRes] = await conn.query(explainSql);
    
    if (dialect === 'postgres') {
      const planJson = (explainRes as any)[0]?.['QUERY PLAN']?.[0];
      if (planJson) {
        const planStr = JSON.stringify(planJson).toLowerCase();
        if (planStr.includes('seq scan')) {
          suggestions.push({ type: 'explain', message: 'EXPLAIN indicates a sequential scan (full table scan). Consider adding an index.' });
        }
      }
    } else {
      const firstRow = (explainRes as any)[0];
      const explainData = typeof firstRow?.EXPLAIN === 'string' ? JSON.parse(firstRow.EXPLAIN) : firstRow;
      const planStr = JSON.stringify(explainData).toLowerCase();
      if (planStr.includes('"access_type":"all"')) {
        suggestions.push({ type: 'explain', message: 'EXPLAIN indicates a full table scan (type: ALL). Consider adding an index.' });
      }
    }
  } catch (e) {
    // ignore EXPLAIN errors (e.g. table not found)
  }

  let rewrittenQuery: string | undefined;
  if (askGroqForRewrite) {
    const sys = 'You are a database optimization expert. You rewrite SQL queries to be more optimal based on standard best practices. Only return the rewritten SQL query in plain text, with no markdown, no explanation, no backticks.';
    const usr = `Dialect: ${dialect}\nSQL: ${sql}\nSuggestions found: ${suggestions.map(s => s.message).join(', ')}\nRewrite the query to address these suggestions if possible.`;
    try {
      const rewritten = await callGroq(sys, usr);
      rewrittenQuery = rewritten.trim();
    } catch(e) {
      rewrittenQuery = undefined;
    }
  }

  return { suggestions, rewrittenQuery };
}
