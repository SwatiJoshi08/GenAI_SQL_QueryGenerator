import { Router } from 'express';
import { generateQuery } from '../services/groq/generateQueryService';
import { validateQuery } from '../services/validator/validationController';
import { impactAnalysis } from '../services/impact/impactController';

const router = Router();

// POST /api/query/generate
router.post('/generate', generateQuery);

// POST /api/query/validate
router.post('/validate', validateQuery);

// POST /api/query/impact
router.post('/impact', impactAnalysis);

export default router;
