import { Router } from 'express';
import { generateQuery } from '../services/groq/generateQueryService';

const router = Router();

// POST /api/query/generate
router.post('/generate', generateQuery);

export default router;
