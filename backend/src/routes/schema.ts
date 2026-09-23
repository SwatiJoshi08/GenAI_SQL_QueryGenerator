// backend/src/routes/schema.ts
import { Router } from 'express';
import { getSchemaHandler } from '../controllers/schemaController';

const router = Router();

router.get('/', getSchemaHandler);

export default router;
