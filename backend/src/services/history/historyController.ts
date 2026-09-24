import { Request, Response } from 'express';
import { getHistory, getHistoryById } from '../history/historyService';

export async function getHistoryHandler(req: Request, res: Response) {
  try {
    const { limit, offset, execution_status, database_type } = req.query;
    const rows = await getHistory({
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
      execution_status: execution_status as string | undefined,
      database_type: database_type as string | undefined,
    });
    return res.json({ results: rows });
  } catch (e: any) {
    console.error('getHistory error:', e);
    return res.status(500).json({ error: e.message });
  }
}

export async function getHistoryByIdHandler(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    const record = await getHistoryById(id);
    if (!record) {
      return res.status(404).json({ error: 'History record not found' });
    }
    return res.json(record);
  } catch (e: any) {
    console.error('getHistoryById error:', e);
    return res.status(500).json({ error: e.message });
  }
}
