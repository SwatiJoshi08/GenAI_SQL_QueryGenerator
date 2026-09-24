import { Router } from 'express';
import { generateQuery } from '../services/groq/generateQueryService';
import { validateQuery } from '../services/validator/validationController';
import { impactAnalysis } from '../services/impact/impactController';
import { explain } from '../services/explainer/explainerController';
import { optimize } from '../services/optimizer/optimizerController';
import { execute } from '../services/executor/executorController';

const router = Router();

// POST /api/query/generate
router.post('/generate', generateQuery);

// POST /api/query/validate
router.post('/validate', validateQuery);

// POST /api/query/impact
router.post('/impact', impactAnalysis);

// POST /api/query/explain
router.post('/explain', explain);

// POST /api/query/optimize
router.post('/optimize', optimize);

// POST /api/query/execute
router.post('/execute', execute);

export default router;
