import { Parser } from 'node-sql-parser';
import { getReaderConnection } from '../../db';

type DBDialect = 'mysql' | 'postgres';

type ImpactResult = {
  operation: string;
  estimatedRows?: number;
  method?: 'explain' | 'count';
  riskLevel: 'low' | 'medium' | 'high';
  warnings: string[];
  confirmationRequired: boolean;
};

/**
 * Analyze the impact of a SQL statement without executing mutating operations.
 * Returns estimated rows for SELECT via EXPLAIN and exact row count for UPDATE/DELETE
 * by transforming to a SELECT COUNT(*) query.
 */
export async function analyzeImpact(sql: string, dialect: DBDialect): Promise<ImpactResult> {
  const parser = new Parser();
  let ast: any;
  try {
    ast = parser.astify(sql, { database: dialect === 'postgres' ? 'PostgreSQL' : 'MySQL' });
  } catch (e) {
    return {
      operation: 'unknown',
      riskLevel: 'high',
      warnings: ['Unable to parse SQL statement.'],
      confirmationRequired: true,
    } as ImpactResult;
  }

  if (Array.isArray(ast)) ast = ast[0];

  const operation = (ast.type?.toUpperCase && ast.type?.toUpperCase()) || 'UNKNOWN';
  const conn = getReaderConnection(dialect);
  const warnings: string[] = [];
  let estimatedRows: number | undefined;
  let method: 'explain' | 'count' | undefined;

  async function getTableTotalRows(table: string): Promise<number> {
    const [rows] = await conn.query(`SELECT COUNT(*) as cnt FROM ${table}`);
    const cnt = (rows as any)[0]?.cnt ?? (rows as any)[0]?.count ?? 0;
    return Number(cnt);
  }

  function computeRisk(est: number, total: number): { level: 'low' | 'medium' | 'high'; warning?: string } {
    const ratio = total > 0 ? est / total : 0;
    if (ratio > 0.5) {
      return { level: 'high', warning: `Estimated rows (${est}) exceed 50% of total rows (${total}) in the table.` };
    }
    if (est > 1000) return { level: 'high' };
    if (est > 100) return { level: 'medium' };
    return { level: 'low' };
  }

  if (operation === 'SELECT') {
    const explainSql = dialect === 'postgres' ? `EXPLAIN (FORMAT JSON) ${sql}` : `EXPLAIN ${sql}`;
    const [explainRes] = await conn.query(explainSql);
    let est = 0;
    if (dialect === 'postgres') {
      const planJson = (explainRes as any)[0]?.['QUERY PLAN']?.[0];
      if (planJson) {
        const plan = JSON.parse(planJson)[0];
        est = plan['Plan']?.['Plan Rows'] ?? 0;
      }
    } else {
      const firstRow = (explainRes as any)[0];
      est = Number(firstRow?.rows ?? 0);
    }
    estimatedRows = est;
    method = 'explain';
    const totalRows = await getTableTotalRows(ast.from?.[0]?.table);
    const { level, warning } = computeRisk(est, totalRows);
    if (warning) warnings.push(warning);
    return {
      operation: 'SELECT',
      estimatedRows: est,
      method,
      riskLevel: level,
      warnings,
      confirmationRequired: level === 'high',
    };
  }

  if (operation === 'UPDATE' || operation === 'DELETE') {
    let tableName = '';
    if (operation === 'UPDATE') {
      tableName = ast.table?.[0]?.table || '';
    } else {
      tableName = ast.from?.[0]?.table || '';
    }
    // Clone the original AST and replace the SELECT columns with COUNT(*).
    // This preserves the original FROM clause (including any joins/aliases) and the WHERE clause.
    const dummySelect: any = {
      ...ast,
      type: 'select',
      columns: [{ expr: { type: 'aggr_func', name: 'COUNT', args: { expr: { type: 'star', value: '*' } } }, as: 'cnt' }],
      // Remove unnecessary clauses for a clean COUNT query.
      options: null,
      distinct: null,
      groupby: null,
      having: null,
      orderby: null,
      limit: null,
    };
    const countSql = parser.sqlify(dummySelect, { database: dialect === 'postgres' ? 'PostgreSQL' : 'MySQL' });
    const [countRes] = await conn.query(countSql);
    const cnt = Number((countRes as any)[0]?.cnt ?? (countRes as any)[0]?.count ?? 0);
    estimatedRows = cnt;
    method = 'count';
    const totalRows = await getTableTotalRows(tableName);
    const { level, warning } = computeRisk(cnt, totalRows);
    if (warning) warnings.push(warning);
    return {
      operation,
      estimatedRows: cnt,
      method,
      riskLevel: level,
      warnings,
      confirmationRequired: level === 'high',
    };
  }

  if (operation === 'INSERT') {
    return {
      operation: 'INSERT',
      riskLevel: 'low',
      warnings: [],
      confirmationRequired: false,
    };
  }

  return {
    operation,
    riskLevel: 'low',
    warnings: [],
    confirmationRequired: false,
  } as ImpactResult;
}
