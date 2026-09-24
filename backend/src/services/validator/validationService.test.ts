// backend/src/services/validator/validationService.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateSQL } from './validationService';
import { SchemaIntrospectionService } from '../schema/introspectionService';

// Mock schema for tests
const { fakeSchema } = vi.hoisted(() => ({
  fakeSchema: {
    tables: [
      {
        name: 'employee',
        columns: [
          { name: 'empid', type: 'int', nullable: false },
          { name: 'salary', type: 'int', nullable: false },
        ],
        primaryKeys: ['empid'],
        foreignKeys: [],
      },
      {
        name: 'students',
        columns: [
          { name: 'id', type: 'int', nullable: false },
          { name: 'name', type: 'varchar', nullable: false },
        ],
        primaryKeys: ['id'],
        foreignKeys: [],
      },
    ],
  },
}));

vi.mock('../schema/introspectionService', () => {
  return {
    SchemaIntrospectionService: {
      getSchema: vi.fn().mockResolvedValue(fakeSchema),
    },
  };
});

describe('validateSQL', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('blocks DELETE without WHERE', async () => {
    const result = await validateSQL('DELETE FROM Employee', 'mysql');
    expect(result.valid).toBe(false);
    expect(result.riskLevel).toBe('blocked');
    expect(result.errors).toContain('DELETE without WHERE clause is blocked.');
  });

  it('rejects stacked statements', async () => {
    const result = await validateSQL('SELECT * FROM Employee; DROP TABLE Employee', 'mysql');
    expect(result.valid).toBe(false);
    expect(result.riskLevel).toBe('blocked');
    expect(result.errors).toContain('Multiple statements are not allowed.');
  });

  it('flags nonexistent column', async () => {
    const result = await validateSQL('SELECT Bloodgroup FROM Students', 'mysql');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Column "bloodgroup" does not exist in schema.');
    expect(result.operation).toBe('SELECT');
    expect(result.riskLevel).toBe('low');
  });

  it('allows UPDATE with WHERE and marks high risk', async () => {
    const result = await validateSQL('UPDATE Employee SET Salary=1 WHERE EmpID=1', 'mysql');
    expect(result.valid).toBe(true);
    expect(result.riskLevel).toBe('high');
    expect(result.warnings).toContain('UPDATE with WHERE clause requires confirmation.');
    expect(result.operation).toBe('UPDATE');
  });
});
