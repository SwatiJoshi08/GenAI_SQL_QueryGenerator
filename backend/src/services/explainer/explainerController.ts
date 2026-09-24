import { Request, Response } from 'express';
import { explainQuery } from './explainerService';

export async function explain(req: Request, res: Response) {
  try {
    const { sql, dialect } = req.body;
    if (!sql || !dialect) {
      return res.status(400).json({ message: 'Missing required fields: sql, dialect' });
    }

    const result = await explainQuery(sql, dialect);
    return res.json(result);
  } catch (error: any) {
    console.error('explain error:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
}
