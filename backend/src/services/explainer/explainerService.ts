import { Parser } from 'node-sql-parser';
import { callGroq } from '../groq/groqClient';

export interface Structure {
  tables: string[];
  columns: string[];
  joins: string[];
  filters: string[];
  aggregations: string[];
  orderBy: string[];
  limit: string | null;
}

export interface ExplainResponse {
  narrative: string;
  structure: Structure;
}

export async function explainQuery(sql: string, dialect: 'mysql' | 'postgres'): Promise<ExplainResponse> {
  const parser = new Parser();
  let ast: any;
  try {
    ast = parser.astify(sql, { database: dialect === 'postgres' ? 'PostgreSQL' : 'MySQL' });
  } catch (e) {
    return {
      narrative: 'Unable to parse query to provide structural explanation.',
      structure: { tables: [], columns: [], joins: [], filters: [], aggregations: [], orderBy: [], limit: null }
    };
  }

  if (Array.isArray(ast)) {
    ast = ast[0];
  }

  const structure: Structure = {
    tables: [],
    columns: [],
    joins: [],
    filters: [],
    aggregations: [],
    orderBy: [],
    limit: null
  };

  function traverse(node: any) {
    if (!node || typeof node !== 'object') return;
    
    if (node.type === 'column_ref' && node.column) {
      const col = node.table ? `${node.table}.${node.column}` : node.column;
      if (!structure.columns.includes(col)) {
        structure.columns.push(col);
      }
    }
    
    if (node.type === 'aggr_func' && node.name) {
      if (!structure.aggregations.includes(node.name)) {
        structure.aggregations.push(node.name);
      }
    }

    if (Array.isArray(node)) {
      node.forEach(traverse);
    } else {
      Object.keys(node).forEach(k => traverse(node[k]));
    }
  }

  if (ast.from && Array.isArray(ast.from)) {
    ast.from.forEach((f: any) => {
      if (f.table && typeof f.table === 'string') {
        structure.tables.push(f.table);
      }
      if (f.join && typeof f.join === 'string') {
        structure.joins.push(f.join);
      }
    });
  }

  if (ast.where) {
    structure.filters.push('WHERE clause present');
  }
  if (ast.having) {
    structure.filters.push('HAVING clause present');
  }

  if (ast.orderby && Array.isArray(ast.orderby)) {
    ast.orderby.forEach((o: any) => {
      if (o.expr && o.expr.column) {
        structure.orderBy.push(`${o.expr.column} ${o.type}`);
      }
    });
  }

  if (ast.limit && ast.limit.value && ast.limit.value.length > 0) {
    structure.limit = ast.limit.value.map((v: any) => v.value).join(', ');
  }

  traverse(ast.columns);
  traverse(ast.where);
  traverse(ast.having);
  traverse(ast.groupby);
  traverse(ast.orderby);

  const systemPrompt = `You are a helpful database expert. Explain the following SQL query in plain English. Keep it simple and narrative. Do not list out the tables, columns, or structure explicitly unless it's natural in the narrative.`;
  const userPrompt = `Dialect: ${dialect}\nSQL:\n${sql}\n\nPlease provide a plain-English narrative explanation of what this query does.`;

  let narrative = '';
  try {
    narrative = await callGroq(systemPrompt, userPrompt);
  } catch(e) {
    narrative = 'Failed to generate narrative explanation.';
  }

  return {
    narrative,
    structure
  };
}
