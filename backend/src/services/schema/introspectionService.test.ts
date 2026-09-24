// backend/src/services/schema/introspectionService.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SchemaIntrospectionService } from './introspectionService';

// Mock DB connection
vi.mock('../../db', () => {
  const tablesRows = [{ TABLE_NAME: 'employee' }, { TABLE_NAME: 'students' }];
  const colsRows = {
    employee: [
      { COLUMN_NAME: 'empid', COLUMN_TYPE: 'int', IS_NULLABLE: 'NO' },
      { COLUMN_NAME: 'salary', COLUMN_TYPE: 'int', IS_NULLABLE: 'NO' },
    ],
    students: [
      { COLUMN_NAME: 'id', COLUMN_TYPE: 'int', IS_NULLABLE: 'NO' },
      { COLUMN_NAME: 'name', COLUMN_TYPE: 'varchar', IS_NULLABLE: 'NO' },
    ],
  };
  const pkRows = {
    employee: [{ COLUMN_NAME: 'empid' }],
    students: [{ COLUMN_NAME: 'id' }],
  };
  const fkRows = { employee: [], students: [] };

  return {
    getReaderConnection: vi.fn().mockImplementation((dialect: string) => {
      return {
        query: async (sql: string, params?: any[]) => {
          if (sql.includes('information_schema.TABLES')) {
            return [tablesRows];
          }
          if (sql.includes('information_schema.COLUMNS')) {
            const table = params?.[1] as keyof typeof colsRows;
            return [colsRows[table] || []];
          }
          if (sql.includes('KEY_COLUMN_USAGE') && sql.includes('CONSTRAINT_NAME = \'PRIMARY\'')) {
            const table = params?.[1] as keyof typeof pkRows;
            return [pkRows[table] || []];
          }
          if (sql.includes('KEY_COLUMN_USAGE') && sql.includes('REFERENCED_TABLE_NAME IS NOT NULL')) {
            const table = params?.[1] as keyof typeof fkRows;
            return [fkRows[table] || []];
          }
          return [[]];
        },
      };
    }),
  };
});

describe('SchemaIntrospectionService.getSchema (MySQL)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns tables with columns and primary keys', async () => {
    const schema = await SchemaIntrospectionService.getSchema('mysql');
    expect(schema.tables).toHaveLength(2);
    const employee = schema.tables.find(t => t.name === 'employee');
    expect(employee).toBeDefined();
    expect(employee?.columns).toHaveLength(2);
    expect(employee?.primaryKeys).toEqual(['empid']);
  });
});
