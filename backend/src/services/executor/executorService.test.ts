import { describe, it, expect, vi, beforeEach } from 'vitest';
import { executeQuery } from './executorService';
import * as validationService from '../validator/validationService';
import * as impactService from '../impact/impactService';
import * as db from '../../db';

vi.mock('../../config/env', () => ({
  config: {
    MYSQL_HOST: 'localhost',
    MYSQL_DATABASE: 'test',
    MYSQL_READER_USER: 'reader',
    MYSQL_READER_PASSWORD: 'password',
    MYSQL_WRITER_USER: 'writer',
    MYSQL_WRITER_PASSWORD: 'password',
    POSTGRES_HOST: 'localhost',
    POSTGRES_DATABASE: 'test',
    POSTGRES_READER_USER: 'reader',
    POSTGRES_READER_PASSWORD: 'password',
    POSTGRES_WRITER_USER: 'writer',
    POSTGRES_WRITER_PASSWORD: 'password',
    GROQ_API_KEY: 'test',
    GROQ_MODEL: 'test'
  }
}));

vi.mock('../validator/validationService');
vi.mock('../impact/impactService');
vi.mock('../../db');

describe('Executor Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects blocked query with 403', async () => {
    vi.mocked(validationService.validateSQL).mockResolvedValue({
      valid: false,
      errors: ['DROP statements are blocked for safety.'],
      warnings: [],
      operation: 'DROP',
      riskLevel: 'blocked',
    });

    await expect(executeQuery({ sql: 'DROP TABLE users;', dialect: 'mysql' }))
      .rejects.toThrow(/Execution blocked: DROP statements are blocked for safety./);
  });

  it('rejects high-risk query without confirmed:true', async () => {
    vi.mocked(validationService.validateSQL).mockResolvedValue({
      valid: true,
      errors: [],
      warnings: [],
      operation: 'UPDATE',
      riskLevel: 'high',
    });

    vi.mocked(impactService.analyzeImpact).mockResolvedValue({
      operation: 'UPDATE',
      riskLevel: 'high',
      warnings: ['Estimated rows exceed 50%'],
      confirmationRequired: true,
      estimatedRows: 1000,
      method: 'count',
    });

    await expect(executeQuery({ sql: 'UPDATE users SET status = 1 WHERE id > 0;', dialect: 'mysql' }))
      .rejects.toThrow(/High risk query requires confirmation./);
  });

  it('succeeds high-risk query with confirmed:true', async () => {
    vi.mocked(validationService.validateSQL).mockResolvedValue({
      valid: true,
      errors: [],
      warnings: [],
      operation: 'UPDATE',
      riskLevel: 'high',
    });

    vi.mocked(impactService.analyzeImpact).mockResolvedValue({
      operation: 'UPDATE',
      riskLevel: 'high',
      warnings: ['Estimated rows exceed 50%'],
      confirmationRequired: true,
      estimatedRows: 1000,
      method: 'count',
    });

    const mockConn = {
      beginTransaction: vi.fn(),
      query: vi.fn().mockResolvedValue([{ affectedRows: 1000 }]),
      commit: vi.fn(),
      rollback: vi.fn(),
      release: vi.fn(),
    };
    
    vi.mocked(db.getWriterConnection).mockReturnValue({
      query: vi.fn(),
      getRawPool: () => ({
        getConnection: vi.fn().mockResolvedValue(mockConn),
      } as any),
    });

    const res = await executeQuery({ sql: 'UPDATE users SET status = 1 WHERE id > 0;', dialect: 'mysql', confirmed: true });
    
    expect(res.success).toBe(true);
    expect(res.affectedRows).toBe(1000);
    expect(mockConn.beginTransaction).toHaveBeenCalled();
    expect(mockConn.commit).toHaveBeenCalled();
  });

  it('enforces SELECT row cap', async () => {
    vi.mocked(validationService.validateSQL).mockResolvedValue({
      valid: true,
      errors: [],
      warnings: [],
      operation: 'SELECT',
      riskLevel: 'low',
    });

    vi.mocked(impactService.analyzeImpact).mockResolvedValue({
      operation: 'SELECT',
      riskLevel: 'low',
      warnings: [],
      confirmationRequired: false,
    });

    const mockQuery = vi.fn().mockResolvedValue([
      [{ id: 1 }], 
      [{ name: 'id' }]
    ]);

    vi.mocked(db.getReaderConnection).mockReturnValue({
      query: vi.fn(),
      getRawPool: () => ({
        query: mockQuery,
      } as any),
    });

    const res = await executeQuery({ sql: 'SELECT * FROM users', dialect: 'mysql' });
    
    expect(res.success).toBe(true);
    expect(mockQuery).toHaveBeenCalledWith(expect.objectContaining({
      sql: 'SELECT * FROM (SELECT * FROM users) AS _capped_query LIMIT 500'
    }));
  });

  it('rolls back on mismatch safety check', async () => {
    vi.mocked(validationService.validateSQL).mockResolvedValue({
      valid: true,
      errors: [],
      warnings: [],
      operation: 'UPDATE',
      riskLevel: 'medium',
    });

    vi.mocked(impactService.analyzeImpact).mockResolvedValue({
      operation: 'UPDATE',
      riskLevel: 'medium',
      warnings: [],
      confirmationRequired: false,
      estimatedRows: 10,
      method: 'count',
    });

    const mockConn = {
      beginTransaction: vi.fn(),
      // Actual affected is 25, which is > 2 * 10
      query: vi.fn().mockResolvedValue([{ affectedRows: 25 }]),
      commit: vi.fn(),
      rollback: vi.fn(),
      release: vi.fn(),
    };
    
    vi.mocked(db.getWriterConnection).mockReturnValue({
      query: vi.fn(),
      getRawPool: () => ({
        getConnection: vi.fn().mockResolvedValue(mockConn),
      } as any),
    });

    await expect(executeQuery({ sql: 'UPDATE users SET status = 1 WHERE role = "user";', dialect: 'mysql' }))
      .rejects.toThrow(/Mismatch in estimated impact/);

    expect(mockConn.rollback).toHaveBeenCalled();
    expect(mockConn.commit).not.toHaveBeenCalled();
  });
});
