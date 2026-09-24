import { Request, Response } from 'express';
import { optimizeQuery } from './optimizerService';

export async function optimize(req: Request, res: Response) {
  try {
    const { sql, dialect, askGroqForRewrite } = req.body;
    if (!sql || !dialect) {
      return res.status(400).json({ message: 'Missing required fields: sql, dialect' });
    }

    const result = await optimizeQuery(sql, dialect, askGroqForRewrite);
    return res.json(result);
  } catch (error: any) {
    console.error('optimize error:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
}
