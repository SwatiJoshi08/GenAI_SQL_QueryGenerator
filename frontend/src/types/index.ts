export type Dialect = 'mysql' | 'postgres';

export interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
}

export interface ForeignKeyInfo {
  column: string;
  referencedTable: string;
  referencedColumn: string;
}

export interface TableInfo {
  name: string;
  columns: ColumnInfo[];
  primaryKeys: string[];
  foreignKeys: ForeignKeyInfo[];
}

export interface SchemaInfo {
  tables: TableInfo[];
}

export type RiskLevel = 'low' | 'medium' | 'high' | 'blocked';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  operation?: string;
  riskLevel?: RiskLevel;
}

export interface ImpactResult {
  operation: string;
  estimatedRows?: number;
  method?: 'explain' | 'count';
  riskLevel: 'low' | 'medium' | 'high';
  warnings: string[];
  confirmationRequired: boolean;
}

export interface ExplainStructure {
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
  structure: ExplainStructure;
}

export interface OptimizationSuggestion {
  type: string;
  message: string;
}

export interface OptimizerResponse {
  suggestions: OptimizationSuggestion[];
  rewrittenQuery?: string;
}

export interface QueryCandidate {
  title?: string;
  sql: string;
  explanation: string;
  confidence?: number;
  complexity?: 'simple' | 'medium' | 'complex' | string;
  tables?: string[];
  columns?: string[];
  validation?: ValidationResult;
  impact?: ImpactResult;
  explain?: ExplainResponse;
  optimize?: OptimizerResponse;
}

export interface GenerateResponse {
  candidates: QueryCandidate[];
  historyId?: number;
  message?: string;
  error?: string;
}

export interface ExecuteRequest {
  sql: string;
  dialect: Dialect;
  confirmed?: boolean;
  historyId?: number;
  prompt?: string;
}

export interface ExecuteResponse {
  success: boolean;
  rows?: Record<string, any>[];
  columns?: string[];
  rowCount?: number;
  affectedRows?: number;
  executionTimeMs: number;
  error?: string;
}

export interface HistoryRecord {
  id: number;
  user_id: number;
  prompt: string;
  database_type: Dialect;
  generated_query?: any;
  selected_query?: string;
  execution_status: 'pending' | 'success' | 'failed';
  execution_time_ms: number;
  error_message?: string;
  created_at: string;
  updated_at?: string;
}

export interface HistoryResponse {
  results: HistoryRecord[];
}

export interface DialectHealth {
  dialect: Dialect;
  connected: boolean;
  tableCount: number;
  latencyMs?: number;
  error?: string;
}
