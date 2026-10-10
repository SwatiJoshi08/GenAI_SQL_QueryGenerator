import { Parser } from 'node-sql-parser';
import { SchemaIntrospectionService, SchemaInfo } from '../schema/introspectionService';

export type Dialect = 'mysql' | 'postgres';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  operation?: string;
  riskLevel?: 'low' | 'medium' | 'high' | 'blocked';
}

/**
 * Validate a SQL string against syntax, single‑statement rule, and schema.
 */
export async function validateSQL(sql: string, dialect: Dialect): Promise<ValidationResult> {
  const result: ValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
  };

  const parserDb = dialect === 'postgres' ? 'PostgreSQL' : 'MySQL';
  // 1. Parse SQL
  let ast: any;
  try {
    const parser = new Parser();
    // astify returns a single AST object for a single statement, or an array for multiple.
    ast = parser.astify(sql, { database: parserDb });
  } catch (e: any) {
    result.valid = false;
    result.errors.push(`Syntax error: ${e.message}`);
    result.riskLevel = 'blocked';
    return result;
  }

  // 2. Enforce single statement
  if (Array.isArray(ast) && ast.length > 1) {
    result.valid = false;
    result.errors.push('Multiple statements are not allowed.');
    result.riskLevel = 'blocked';
    return result;
  }
  if (Array.isArray(ast)) {
    ast = ast[0];
  }

  // 3. Determine operation type
  const operation = (ast.type || ast.variant || ast.astType || '').toString().toUpperCase();
  result.operation = operation;

  // 4. Load schema
  const schema: SchemaInfo = await SchemaIntrospectionService.getSchema(dialect);
  const tablesMap: Record<string, any> = {};
  schema.tables.forEach(t => {
    tablesMap[t.name.toLowerCase()] = t;
  });

  // 5. Extract tables & columns using parser helpers
  const parser = new Parser();
  const tableList = parser.tableList(sql, { database: parserDb }); // e.g. "select::null::users"
  const columnList = parser.columnList(sql, { database: parserDb });

  const strip = (s: string) => (s.split('::').pop() || '').replace(/["`]/g, '');
  const usedTables = tableList.map(strip).map(t => t.toLowerCase());
  const usedColumns = columnList.map(strip).map(c => {
    const lowered = c.toLowerCase();
    // columnList may return a regex placeholder like "(.*)" for wildcard selections; replace with '*'
    return lowered === '(.*)' ? '*' : lowered;
  });

  // 6. Validate tables
  for (const tbl of usedTables) {
    if (!tablesMap[tbl]) {
      result.valid = false;
      result.errors.push(`Table "${tbl}" does not exist in schema.`);
    }
  }

  // 7. Validate columns (if any referenced table exists)
  for (const col of usedColumns) {
    if (col === '*') continue;
    const columnFound = Object.values(tablesMap).some((t: any) =>
      t.columns.some((c: any) => c.name.toLowerCase() === col)
    );
    if (!columnFound) {
      result.valid = false;
      result.errors.push(`Column "${col}" does not exist in schema.`);
    }
  }

  // 8. Risk classification
  switch (operation) {
    case 'SELECT':
      result.riskLevel = 'low';
      break;
    case 'INSERT':
      result.riskLevel = 'medium';
      // verify required NOT NULL columns are supplied
      const insertTable = ast?.table?.[0]?.table?.toString()?.toLowerCase();
      if (insertTable && tablesMap[insertTable]) {
        const requiredCols = tablesMap[insertTable].columns
          .filter((c: any) => !c.nullable)
          .map((c: any) => c.name.toLowerCase());
        const insertedCols = (ast?.columns || []).map((c: any) => c.column?.toString()?.toLowerCase());
        const missing = requiredCols.filter((rc: string) => !insertedCols.includes(rc));
        if (missing.length) {
          result.warnings.push(`INSERT is missing required NOT NULL columns: ${missing.join(', ')}`);
        }
      }
      break;
    case 'UPDATE':
    case 'DELETE':
      const hasWhere = !!ast.where;
      if (!hasWhere) {
        result.riskLevel = 'blocked';
        result.errors.push(`${operation} without WHERE clause is blocked.`);
      } else {
        result.riskLevel = 'high';
        result.warnings.push(`${operation} with WHERE clause requires confirmation.`);
      }
      break;
    case 'DROP':
    case 'TRUNCATE':
    case 'ALTER':
    case 'CREATE':
    case 'GRANT':
    case 'REVOKE':
      result.riskLevel = 'blocked';
      result.errors.push(`${operation} statements are blocked for safety.`);
      break;
    default:
      result.riskLevel = 'medium';
  }

  if (result.errors.length > 0) {
    result.valid = false;
  }

  return result;
}
