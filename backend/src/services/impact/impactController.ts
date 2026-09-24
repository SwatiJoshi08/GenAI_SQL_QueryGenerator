import { Request, Response, NextFunction } from 'express';
import { analyzeImpact } from './impactService';

export async function impactAnalysis(req: Request, res: Response, next: NextFunction) {
  try {
    const { sql, dialect } = req.body;
    if (!sql || !dialect) {
      return res.status(400).json({ message: 'Missing required fields: sql, dialect' });
    }
    const result = await analyzeImpact(sql, dialect);
    return res.json(result);
  } catch (err: any) {
    console.error('impactAnalysis error:', err);
    return res.status(500).json({ message: 'Internal server error', error: err.message });
  }
}
