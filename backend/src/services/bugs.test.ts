import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateSQL } from './validator/validationService';
import { analyzeImpact } from './impact/impactService';
import { SchemaIntrospectionService } from './schema/introspectionService';
import * as db from '../db';

const { fakeSchema } = vi.hoisted(() => ({
  fakeSchema: {
    tables: [
      {
        name: 'employee',
        columns: [
          { name: 'empid', type: 'int', nullable: false },
          { name: 'salary', type: 'int', nullable: false },
          { name: 'age', type: 'int', nullable: false }
        ],
        primaryKeys: ['empid'],
        foreignKeys: [],
      }
    ],
  },
}));

vi.mock('./schema/introspectionService', () => ({
  SchemaIntrospectionService: {
    getSchema: vi.fn().mockResolvedValue(fakeSchema),
  },
}));

const mockQuery = vi.fn();
vi.mock('../db', () => ({
  getReaderConnection: vi.fn(() => ({
    query: mockQuery
  })),
  getWriterConnection: vi.fn(),
}));

describe('Bug fixes and comprehensive validation/impact tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockQuery.mockResolvedValue([[{ cnt: 5, count: 5, rows: 5 }]]); // generic fallback for mocked db count
  });

  it('1. SELECT * (no filter) - should allow wildcard without column checking', async () => {
    const result = await validateSQL('SELECT * FROM Employee', 'mysql');
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    
    // Impact analysis
    mockQuery.mockImplementation(async (query: string) => {
      if (query.toUpperCase().startsWith('EXPLAIN')) return [[{ rows: 100 }]];
      if (query.toUpperCase().includes('COUNT(*)')) return [[{ cnt: 100 }]];
      return [[{}]];
    });
    
    const impact = await analyzeImpact('SELECT * FROM Employee', 'mysql');
    expect(impact.operation).toBe('SELECT');
    expect(impact.estimatedRows).toBe(100);
  });

  it('2. SELECT with WHERE column = value', async () => {
    const sql = 'SELECT * FROM Employee WHERE EmpID = 1';
    const result = await validateSQL(sql, 'mysql');
    expect(result.valid).toBe(true);
    
    mockQuery.mockImplementation(async (query: string) => {
      if (query.toUpperCase().startsWith('EXPLAIN')) return [[{ rows: 1 }]];
      if (query.toUpperCase().includes('COUNT(*)')) return [[{ cnt: 100 }]];
      return [[{}]];
    });
    const impact = await analyzeImpact(sql, 'mysql');
    expect(impact.operation).toBe('SELECT');
  });

  it('3. UPDATE with WHERE column = value', async () => {
    const sql = 'UPDATE Employee SET Salary = Salary * 1.10 WHERE EmpID = 1';
    const result = await validateSQL(sql, 'mysql');
    expect(result.valid).toBe(true);
    
    mockQuery.mockImplementation(async (query: string) => {
      if (query.toUpperCase().includes('COUNT(*) AS `CNT` FROM `EMPLOYEE` WHERE `EMPID` = 1')) return [[{ cnt: 1 }]];
      if (query.toUpperCase().includes('COUNT(*)')) return [[{ cnt: 100 }]];
      return [[{}]];
    });
    const impact = await analyzeImpact(sql, 'mysql');
    expect(impact.operation).toBe('UPDATE');
    // It should have executed the COUNT(*) dummy query
    expect(mockQuery).toHaveBeenCalled();
    const countCallArgs = mockQuery.mock.calls.find(c => String(c[0]).includes('cnt'));
    expect(countCallArgs).toBeTruthy();
    expect(String(countCallArgs![0]).toUpperCase()).toContain('WHERE `EMPID` = 1');
  });

  it('4. UPDATE with WHERE column > value', async () => {
    const sql = 'UPDATE Employee SET Salary = 1000 WHERE age > 20';
    const result = await validateSQL(sql, 'mysql');
    expect(result.valid).toBe(true);
    
    await analyzeImpact(sql, 'mysql');
    const countCallArgs = mockQuery.mock.calls.find(c => String(c[0]).includes('cnt'));
    expect(countCallArgs).toBeTruthy();
    expect(String(countCallArgs![0]).toUpperCase()).toContain('WHERE `AGE` > 20');
  });

  it('5. UPDATE with WHERE containing AND/OR', async () => {
    const sql = 'UPDATE Employee SET Salary = 1000 WHERE age > 20 AND EmpID = 1 OR Salary < 50000';
    const result = await validateSQL(sql, 'mysql');
    expect(result.valid).toBe(true);
    
    await analyzeImpact(sql, 'mysql');
    const countCallArgs = mockQuery.mock.calls.find(c => String(c[0]).includes('cnt'));
    expect(countCallArgs).toBeTruthy();
    expect(String(countCallArgs![0]).toUpperCase()).toContain('AND `EMPID` = 1');
    expect(String(countCallArgs![0]).toUpperCase()).toContain('OR `SALARY` < 50000');
  });

  it('6. Subquery case (Phase 6 bug)', async () => {
    const sql = 'UPDATE Employee SET Salary = Salary * 1.10 WHERE EmpID IN (SELECT EmpID FROM Employee WHERE Salary < 50000)';
    const result = await validateSQL(sql, 'mysql');
    expect(result.valid).toBe(true);
    
    await analyzeImpact(sql, 'mysql');
    const countCallArgs = mockQuery.mock.calls.find(c => String(c[0]).includes('cnt'));
    expect(countCallArgs).toBeTruthy();
    const queryStr = String(countCallArgs![0]);
    // Node sql parser adds backticks around names
    expect(queryStr.toUpperCase()).toContain('WHERE `EMPID` IN (SELECT `EMPID` FROM `EMPLOYEE` WHERE `SALARY` < 50000)');
  });
});
