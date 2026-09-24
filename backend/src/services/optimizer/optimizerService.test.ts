import { describe, it, expect, vi, beforeEach } from 'vitest';
import { optimizeQuery } from './optimizerService';

vi.mock('../../db', () => {
  return {
    getReaderConnection: vi.fn().mockReturnValue({
      query: vi.fn().mockResolvedValue([
        [{ EXPLAIN: JSON.stringify({ access_type: "ALL" }) }]
      ])
    })
  };
});

vi.mock('../groq/groqClient', () => {
  return {
    callGroq: vi.fn().mockResolvedValue('SELECT specific_col FROM t1 LIMIT 10;')
  };
});

describe('optimizerService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('detects SELECT *', async () => {
    const sql = 'SELECT * FROM t1';
    const result = await optimizeQuery(sql, 'mysql', false);
    expect(result.suggestions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'rule', message: expect.stringContaining('Avoid using SELECT *') })
      ])
    );
  });

  it('detects missing LIMIT on large tables', async () => {
    const sql = 'SELECT col1 FROM t1';
    const result = await optimizeQuery(sql, 'mysql', false);
    expect(result.suggestions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'rule', message: expect.stringContaining('Missing LIMIT clause') })
      ])
    );
  });

  it('detects functions in WHERE clause', async () => {
    const sql = 'SELECT col1 FROM t1 WHERE LOWER(col1) = "abc" LIMIT 10';
    const result = await optimizeQuery(sql, 'mysql', false);
    expect(result.suggestions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'rule', message: expect.stringContaining('Applying functions to columns') })
      ])
    );
  });

  it('returns explain plan warnings for full table scan', async () => {
    const sql = 'SELECT col1 FROM t1 LIMIT 10';
    const result = await optimizeQuery(sql, 'mysql', false);
    expect(result.suggestions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'explain', message: expect.stringContaining('full table scan') })
      ])
    );
  });

  it('calls Groq for rewrite if requested', async () => {
    const sql = 'SELECT * FROM t1';
    const result = await optimizeQuery(sql, 'mysql', true);
    expect(result.rewrittenQuery).toBe('SELECT specific_col FROM t1 LIMIT 10;');
  });
});
