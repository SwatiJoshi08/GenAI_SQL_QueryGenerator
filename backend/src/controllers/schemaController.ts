// backend/src/controllers/schemaController.ts
import { Request, Response, NextFunction } from 'express';
import { SchemaIntrospectionService } from '../services/schema/introspectionService';

export async function getSchemaHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const dialect = req.query.dialect as 'mysql' | 'postgres';
    if (!dialect || (dialect !== 'mysql' && dialect !== 'postgres')) {
      return res.status(400).json({ error: 'Invalid or missing dialect query parameter. Use mysql or postgres.' });
    }
    const schema = await SchemaIntrospectionService.getSchema(dialect);
    res.json(schema);
  } catch (err) {
    next(err);
  }
}
