import { describe, it, expect, vi } from 'vitest';
import { explainQuery } from './explainerService';

vi.mock('../groq/groqClient', () => {
  return {
    callGroq: vi.fn().mockResolvedValue('Mocked explanation.')
  };
});

describe('explainerService', () => {
  it('extracts tables, columns, and generates a narrative', async () => {
    const sql = 'SELECT a, SUM(b) FROM t1 JOIN t2 ON t1.id = t2.id WHERE c = 1 GROUP BY a ORDER BY a DESC LIMIT 10';
    const result = await explainQuery(sql, 'mysql');
    
    expect(result.narrative).toBe('Mocked explanation.');
    expect(result.structure.tables).toEqual(expect.arrayContaining(['t1', 't2']));
    expect(result.structure.columns).toContain('a');
    expect(result.structure.columns).toContain('b');
    expect(result.structure.aggregations).toContain('SUM');
    expect(result.structure.joins).toContain('INNER JOIN');
    expect(result.structure.filters).toEqual(expect.arrayContaining(['WHERE clause present']));
    expect(result.structure.orderBy).toEqual(expect.arrayContaining(['a DESC']));
    expect(result.structure.limit).toBe('10');
  });

  it('handles parsing errors gracefully', async () => {
    const sql = 'SELECT * FROM t1 WHERE id = ';
    const result = await explainQuery(sql, 'mysql');
    
    expect(result.narrative).toContain('Unable to parse');
    expect(result.structure.tables.length).toBe(0);
  });
});
