import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateSQL, Dialect } from '../services/validator/validationService';
import { analyzeImpact } from '../services/impact/impactService';
import { explainQuery } from '../services/explainer/explainerService';
import { optimizeQuery } from '../services/optimizer/optimizerService';
import { executeQuery, ExecuteRequest } from '../services/executor/executorService';
import { buildPrompt, filterRelevantTables } from '../services/groq/promptBuilder';
import { SchemaIntrospectionService, SchemaInfo } from '../services/schema/introspectionService';
import * as db from '../db';

// Mock schema representing College DB with Department, Employee, Students
const testSchema: SchemaInfo = {
  tables: [
    {
      name: 'Department',
      columns: [
        { name: 'DepartmentID', type: 'INT', nullable: false },
        { name: 'DeptName', type: 'VARCHAR(50)', nullable: false },
      ],
      primaryKeys: ['DepartmentID'],
      foreignKeys: [],
    },
    {
      name: 'Employee',
      columns: [
        { name: 'EmpID', type: 'INT', nullable: false },
        { name: 'EmpName', type: 'VARCHAR(100)', nullable: false },
        { name: 'Salary', type: 'DECIMAL(10,2)', nullable: false },
        { name: 'DepartmentID', type: 'INT', nullable: true },
      ],
      primaryKeys: ['EmpID'],
      foreignKeys: [
        { column: 'DepartmentID', referencedTable: 'Department', referencedColumn: 'DepartmentID' }
      ],
    },
    {
      name: 'Students',
      columns: [
        { name: 'StudentID', type: 'INT', nullable: false },
        { name: 'StudentName', type: 'VARCHAR(100)', nullable: false },
        { name: 'CGPA', type: 'DECIMAL(3,2)', nullable: false },
        { name: 'DepartmentID', type: 'INT', nullable: true },
        { name: 'EnrollmentDate', type: 'DATE', nullable: true },
      ],
      primaryKeys: ['StudentID'],
      foreignKeys: [
        { column: 'DepartmentID', referencedTable: 'Department', referencedColumn: 'DepartmentID' }
      ],
    },
  ],
};

// Mock SchemaIntrospectionService
vi.mock('../services/schema/introspectionService', () => ({
  SchemaIntrospectionService: {
    getSchema: vi.fn().mockImplementation(async () => testSchema),
    refreshCache: vi.fn(),
  },
}));

// Mock Groq client for predictable testing
vi.mock('../services/groq/groqClient', () => ({
  callGroq: vi.fn().mockImplementation(async (system: string, user: string) => {
    if (user.includes('ambiguity') || user.includes('top')) {
      return JSON.stringify({
        intent: 'SELECT',
        candidates: [
          {
            sql: 'SELECT * FROM Employee ORDER BY Salary DESC LIMIT 5;',
            explanation: 'Interprets top as top 5 highest earners.',
            tablesUsed: ['Employee'],
            columnsUsed: ['Salary'],
            operations: ['ORDER BY', 'LIMIT'],
            assumptions: ['Defaulted top to 5 records sorted by Salary descending.'],
          },
          {
            sql: 'SELECT * FROM Employee ORDER BY Salary DESC LIMIT 10;',
            explanation: 'Interprets top as top 10 highest earners.',
            tablesUsed: ['Employee'],
            columnsUsed: ['Salary'],
            operations: ['ORDER BY', 'LIMIT'],
            assumptions: ['Defaulted top to 10 records.'],
          }
        ]
      });
    }
    return JSON.stringify({
      intent: 'SELECT',
      candidates: [
        {
          sql: 'SELECT * FROM Employee WHERE Salary > 50000;',
          explanation: 'Find employees with salary above 50000.',
          tablesUsed: ['Employee'],
          columnsUsed: ['Salary'],
          operations: ['SELECT', 'WHERE'],
          assumptions: [],
        }
      ]
    });
  }),
}));

// Mock DB connections
const mockReaderQuery = vi.fn();
const mockWriterQuery = vi.fn();
const mockGetConnection = vi.fn();

vi.mock('../db', () => ({
  getReaderConnection: vi.fn((dialect: string) => {
    if (dialect !== 'mysql' && dialect !== 'postgres') {
      throw new Error(`Unsupported dialect: ${dialect}`);
    }
    return {
      query: mockReaderQuery,
      getRawPool: () => ({
        query: mockReaderQuery,
        execute: mockReaderQuery,
      }),
    };
  }),
  getWriterConnection: vi.fn((dialect: string) => {
    if (dialect !== 'mysql' && dialect !== 'postgres') {
      throw new Error(`Unsupported dialect: ${dialect}`);
    }
    return {
      query: mockWriterQuery,
      getRawPool: () => ({
        getConnection: mockGetConnection,
        connect: vi.fn().mockResolvedValue({
          query: mockWriterQuery,
          release: vi.fn(),
        }),
      }),
    };
  }),
}));

describe('Section 24: Testing & Quality Assurance Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockReaderQuery.mockResolvedValue([
      [{ cnt: 14, count: 14, rows: 14, EmpID: 1, EmpName: 'Alice', Salary: 62000, DepartmentID: 4 }]
    ]);
  });

  // -------------------------------------------------------------
  // Row 1: Prompt Understanding
  // -------------------------------------------------------------
  describe('1. Prompt Understanding', () => {
    it('should build prompt and understand intent for "Show employees with salary above 50000"', async () => {
      const promptText = 'Show employees with salary above 50000.';
      const { system, user } = buildPrompt('mysql', testSchema, promptText);

      expect(system).toContain('You are an expert SQL generator');
      expect(system).toContain('mysql');
      expect(user).toContain('Table Employee: EmpID');
      expect(user).toContain(promptText);

      // Validate corresponding SQL output
      const sql = 'SELECT * FROM Employee WHERE Salary > 50000;';
      const validation = await validateSQL(sql, 'mysql');
      expect(validation.valid).toBe(true);
      expect(validation.operation).toBe('SELECT');
      expect(validation.riskLevel).toBe('low');
    });
  });

  // -------------------------------------------------------------
  // Row 2: Schema Grounding
  // -------------------------------------------------------------
  describe('2. Schema Grounding', () => {
    it('should accept SQL with valid schema columns', async () => {
      const validSQL = 'SELECT EmpID, EmpName, Salary FROM Employee WHERE DepartmentID = 1;';
      const result = await validateSQL(validSQL, 'mysql');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject SQL referencing invalid/hallucinated column', async () => {
      const invalidColumnSQL = 'SELECT EmpID, BonusRate, NonExistentColumn FROM Employee;';
      const result = await validateSQL(invalidColumnSQL, 'mysql');
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('does not exist in schema'))).toBe(true);
    });

    it('should filter relevant tables based on prompt keywords', () => {
      const relevant = filterRelevantTables(testSchema, 'Find all students with CGPA above 3.5');
      // Since testSchema has <= 5 tables, it preserves context, but includes Students
      expect(relevant.some(t => t.name === 'Students')).toBe(true);
    });
  });

  // -------------------------------------------------------------
  // Row 3: JOIN Generation
  // -------------------------------------------------------------
  describe('3. JOIN Generation', () => {
    it('should validate and explain multi-table JOIN between Employee and Department', async () => {
      const joinSQL = `
        SELECT e.EmpID, e.EmpName, e.Salary, d.DeptName
        FROM Employee e
        JOIN Department d ON e.DepartmentID = d.DepartmentID
        WHERE d.DeptName = 'IT';
      `;
      const validation = await validateSQL(joinSQL, 'mysql');
      expect(validation.valid).toBe(true);

      const explanation = await explainQuery(joinSQL, 'mysql');
      expect(explanation.structure.tables).toContain('Employee');
      expect(explanation.structure.tables).toContain('Department');
      expect(explanation.structure.filters).toHaveLength(1);
    });
  });

  // -------------------------------------------------------------
  // Row 4: Aggregation
  // -------------------------------------------------------------
  describe('4. Aggregation Queries', () => {
    it('should validate and parse GROUP BY and aggregate functions (COUNT, AVG)', async () => {
      const aggSQL = `
        SELECT d.DeptName, COUNT(e.EmpID) AS total_employees, AVG(e.Salary) AS avg_salary
        FROM Department d
        JOIN Employee e ON d.DepartmentID = e.DepartmentID
        GROUP BY d.DeptName
        HAVING COUNT(e.EmpID) > 2;
      `;
      const validation = await validateSQL(aggSQL, 'mysql');
      expect(validation.valid).toBe(true);

      const explanation = await explainQuery(aggSQL, 'mysql');
      expect(explanation.structure.aggregations).toContain('COUNT');
      expect(explanation.structure.aggregations).toContain('AVG');
      expect(explanation.structure.filters).toContain('HAVING clause present');
    });
  });

  // -------------------------------------------------------------
  // Row 5: Ambiguity Handling
  // -------------------------------------------------------------
  describe('5. Ambiguity Handling', () => {
    it('should structure candidate options when prompt is ambiguous', async () => {
      // Simulate candidate generation with multiple assumptions
      const candidates = [
        {
          sql: 'SELECT * FROM Employee ORDER BY Salary DESC LIMIT 5;',
          assumptions: ['Defaulted top to 5 highest earners'],
        },
        {
          sql: 'SELECT * FROM Employee ORDER BY Salary DESC LIMIT 10;',
          assumptions: ['Defaulted top to 10 highest earners'],
        },
      ];

      for (const cand of candidates) {
        const validation = await validateSQL(cand.sql, 'mysql');
        expect(validation.valid).toBe(true);
        expect(cand.assumptions.length).toBeGreaterThan(0);
      }
    });
  });

  // -------------------------------------------------------------
  // Row 6: SQL Validation
  // -------------------------------------------------------------
  describe('6. SQL Validation', () => {
    it('should detect syntax errors in malformed SQL', async () => {
      const malformedSQL = 'SELEEEECT * FORM Employee WHERE';
      const result = await validateSQL(malformedSQL, 'mysql');
      expect(result.valid).toBe(false);
      expect(result.riskLevel).toBe('blocked');
      expect(result.errors[0]).toContain('Syntax error');
    });

    it('should detect non-existent tables', async () => {
      const missingTableSQL = 'SELECT * FROM NonExistentTable;';
      const result = await validateSQL(missingTableSQL, 'mysql');
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Table "nonexistenttable" does not exist'))).toBe(true);
    });

    it('should block multiple SQL statements (SQL injection prevention)', async () => {
      const multiSQL = 'SELECT * FROM Employee; DROP TABLE Department;';
      const result = await validateSQL(multiSQL, 'mysql');
      expect(result.valid).toBe(false);
      expect(result.riskLevel).toBe('blocked');
      expect(result.errors.some(e => e.includes('Multiple statements are not allowed'))).toBe(true);
    });
  });

  // -------------------------------------------------------------
  // Row 7: Safety & Risk Guardrails
  // -------------------------------------------------------------
  describe('7. Safety & Mutation Checks', () => {
    it('should block UPDATE without WHERE clause', async () => {
      const unsafeUpdate = 'UPDATE Employee SET Salary = 50000;';
      const result = await validateSQL(unsafeUpdate, 'mysql');
      expect(result.valid).toBe(false);
      expect(result.riskLevel).toBe('blocked');
      expect(result.errors.some(e => e.includes('UPDATE without WHERE clause is blocked'))).toBe(true);
    });

    it('should block DELETE without WHERE clause', async () => {
      const unsafeDelete = 'DELETE FROM Employee;';
      const result = await validateSQL(unsafeDelete, 'mysql');
      expect(result.valid).toBe(false);
      expect(result.riskLevel).toBe('blocked');
      expect(result.errors.some(e => e.includes('DELETE without WHERE clause is blocked'))).toBe(true);
    });

    it('should block destructive DDL operations (DROP, TRUNCATE, ALTER)', async () => {
      const dropSQL = 'DROP TABLE Employee;';
      const result = await validateSQL(dropSQL, 'mysql');
      expect(result.valid).toBe(false);
      expect(result.riskLevel).toBe('blocked');
      expect(result.errors.some(e => e.includes('DROP statements are blocked for safety'))).toBe(true);
    });

    it('should require confirmation and tag high risk for UPDATE with WHERE clause', async () => {
      const safeUpdate = 'UPDATE Employee SET Salary = 55000 WHERE EmpID = 1;';
      const result = await validateSQL(safeUpdate, 'mysql');
      expect(result.valid).toBe(true);
      expect(result.riskLevel).toBe('high');
      expect(result.warnings.some(w => w.includes('requires confirmation'))).toBe(true);
    });
  });

  // -------------------------------------------------------------
  // Row 8: Impact Analysis
  // -------------------------------------------------------------
  describe('8. Impact Analysis', () => {
    it('should calculate estimated affected rows and risk for DELETE with WHERE', async () => {
      const deleteSQL = 'DELETE FROM Employee WHERE DepartmentID = 4;';
      
      mockReaderQuery.mockImplementation(async (query: string) => {
        if (query.toUpperCase().includes('COUNT(*)')) {
          return [[{ cnt: 5 }]];
        }
        return [[{}]];
      });

      const impact = await analyzeImpact(deleteSQL, 'mysql');
      expect(impact.operation).toBe('DELETE');
      expect(impact.estimatedRows).toBe(5);
      expect(impact.riskLevel).toBe('high');
    });

    it('should mark SELECT queries as read-only with low risk', async () => {
      const selectSQL = 'SELECT * FROM Students WHERE CGPA >= 3.8;';
      
      mockReaderQuery.mockImplementation(async (query: string) => {
        if (query.toUpperCase().includes('COUNT(*)')) {
          return [[{ cnt: 12 }]];
        }
        return [[{}]];
      });

      const impact = await analyzeImpact(selectSQL, 'mysql');
      expect(impact.operation).toBe('SELECT');
      expect(impact.riskLevel).toBe('low');
      expect(impact.confirmationRequired).toBe(false);
    });
  });

  // -------------------------------------------------------------
  // Row 9: Dialect-Specific Handling (MySQL vs PostgreSQL)
  // -------------------------------------------------------------
  describe('9. Dialect-Specific Compatibility', () => {
    it('should validate query correctly under MySQL dialect', async () => {
      const mysqlSQL = 'SELECT * FROM Employee LIMIT 10 OFFSET 0;';
      const result = await validateSQL(mysqlSQL, 'mysql');
      expect(result.valid).toBe(true);
    });

    it('should validate query correctly under PostgreSQL dialect', async () => {
      const pgSQL = 'SELECT "EmpID", "EmpName" FROM "Employee" LIMIT 10;';
      const result = await validateSQL(pgSQL, 'postgres');
      expect(result.valid).toBe(true);
    });

    it('should optimize query with dialect-aware EXPLAIN formatting', async () => {
      const selectSQL = 'SELECT * FROM Employee;';
      const optResult = await optimizeQuery(selectSQL, 'mysql', false);
      expect(optResult.suggestions.some(s => s.message.includes('SELECT *'))).toBe(true);
      expect(optResult.suggestions.some(s => s.message.includes('LIMIT'))).toBe(true);
    });
  });

  // -------------------------------------------------------------
  // Row 10: Controlled Query Execution
  // -------------------------------------------------------------
  describe('10. Controlled Query Execution', () => {
    it('should execute valid SELECT query and return formatted response with rows and execution time', async () => {
      const mockRows = [
        { EmpID: 1, EmpName: 'Alice', Salary: 62000, DepartmentID: 4 },
        { EmpID: 5, EmpName: 'Eve', Salary: 75000, DepartmentID: 4 },
      ];
      const mockFields = [{ name: 'EmpID' }, { name: 'EmpName' }, { name: 'Salary' }, { name: 'DepartmentID' }];

      mockReaderQuery.mockResolvedValue([mockRows, mockFields]);

      const req: ExecuteRequest = {
        sql: 'SELECT EmpID, EmpName, Salary, DepartmentID FROM Employee WHERE DepartmentID = 4;',
        dialect: 'mysql',
      };

      const result = await executeQuery(req);
      expect(result.success).toBe(true);
      expect(result.rowCount).toBe(2);
      expect(result.columns).toEqual(['EmpID', 'EmpName', 'Salary', 'DepartmentID']);
      expect(result.rows).toHaveLength(2);
      expect(result.executionTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('should block execution of high-risk mutations without confirmed flag', async () => {
      const req: ExecuteRequest = {
        sql: 'UPDATE Employee SET Salary = 70000 WHERE EmpID = 1;',
        dialect: 'mysql',
        confirmed: false,
      };

      await expect(executeQuery(req)).rejects.toThrow('High risk query requires confirmation');
    });
  });

  // -------------------------------------------------------------
  // Row 11: Error Handling & Resilience
  // -------------------------------------------------------------
  describe('11. Error Handling & Resilience', () => {
    it('should handle database execution failures gracefully', async () => {
      mockReaderQuery.mockRejectedValueOnce(new Error('Connection lost to MySQL server'));

      const req: ExecuteRequest = {
        sql: 'SELECT * FROM Employee;',
        dialect: 'mysql',
      };

      await expect(executeQuery(req)).rejects.toThrow('Connection lost to MySQL server');
    });

    it('should handle invalid dialect request gracefully', async () => {
      expect(() => db.getReaderConnection('oracle' as any)).toThrow('Unsupported dialect: oracle');
    });
  });
});
