import {
  Dialect,
  SchemaInfo,
  ValidationResult,
  ImpactResult,
  ExplainResponse,
  OptimizerResponse,
  GenerateResponse,
  ExecuteRequest,
  ExecuteResponse,
  HistoryResponse,
  HistoryRecord,
} from '../types';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

class ApiError extends Error {
  statusCode?: number;
  details?: any;

  constructor(message: string, statusCode?: number, details?: any) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  try {
    const res = await fetch(url, {
      ...options,
      headers,
    });

    const contentType = res.headers.get('content-type') || '';
    let data: any = null;

    if (contentType.includes('application/json')) {
      data = await res.json();
    } else {
      const text = await res.text();
      try {
        data = JSON.parse(text);
      } catch {
        data = { message: text };
      }
    }

    if (!res.ok) {
      const errorMessage =
        data?.message || data?.error || data?.details || `HTTP error ${res.status}: ${res.statusText}`;
      throw new ApiError(errorMessage, res.status, data);
    }

    return data as T;
  } catch (err: any) {
    if (err instanceof ApiError) {
      throw err;
    }
    throw new ApiError(err.message || 'Network error occurred. Please check backend connection.', 0);
  }
}

export const api = {
  getBaseUrl(): string {
    return BASE_URL;
  },

  /**
   * Check backend health
   */
  async checkHealth(): Promise<{ status: string }> {
    return request<{ status: string }>('/health');
  },

  /**
   * Introspect database schema
   */
  async getSchema(dialect: Dialect): Promise<SchemaInfo> {
    return request<SchemaInfo>(`/api/schema?dialect=${dialect}`);
  },

  /**
   * Generate SQL queries from natural language request
   */
  async generateQueries(dialect: Dialect, prompt: string): Promise<GenerateResponse> {
    return request<GenerateResponse>('/api/query/generate', {
      method: 'POST',
      body: JSON.stringify({ dialect, request: prompt }),
    });
  },

  /**
   * Validate SQL query syntax, AST, safety, and schema reference
   */
  async validateQuery(sql: string, dialect: Dialect): Promise<ValidationResult> {
    return request<ValidationResult>('/api/query/validate', {
      method: 'POST',
      body: JSON.stringify({ sql, dialect }),
    });
  },

  /**
   * Analyze impact of query without mutating DB
   */
  async analyzeImpact(sql: string, dialect: Dialect): Promise<ImpactResult> {
    return request<ImpactResult>('/api/query/impact', {
      method: 'POST',
      body: JSON.stringify({ sql, dialect }),
    });
  },

  /**
   * Explain SQL query in natural language & extract structural elements
   */
  async explainQuery(sql: string, dialect: Dialect): Promise<ExplainResponse> {
    return request<ExplainResponse>('/api/query/explain', {
      method: 'POST',
      body: JSON.stringify({ sql, dialect }),
    });
  },

  /**
   * Analyze query optimization suggestions and optional rewritten SQL
   */
  async optimizeQuery(
    sql: string,
    dialect: Dialect,
    askGroqForRewrite: boolean = false
  ): Promise<OptimizerResponse> {
    return request<OptimizerResponse>('/api/query/optimize', {
      method: 'POST',
      body: JSON.stringify({ sql, dialect, askGroqForRewrite }),
    });
  },

  /**
   * Execute SQL query on target dialect database
   */
  async executeQuery(payload: ExecuteRequest): Promise<ExecuteResponse> {
    return request<ExecuteResponse>('/api/query/execute', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /**
   * Retrieve query history
   */
  async getHistory(params?: {
    limit?: number;
    offset?: number;
    execution_status?: string;
    database_type?: string;
  }): Promise<HistoryResponse> {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.offset) searchParams.set('offset', params.offset.toString());
    if (params?.execution_status) searchParams.set('execution_status', params.execution_status);
    if (params?.database_type) searchParams.set('database_type', params.database_type);

    const qs = searchParams.toString();
    const endpoint = `/api/history${qs ? `?${qs}` : ''}`;
    return request<HistoryResponse>(endpoint);
  },

  /**
   * Get single history item by ID
   */
  async getHistoryById(id: number): Promise<HistoryRecord> {
    return request<HistoryRecord>(`/api/history/${id}`);
  },
};
