import { Router } from 'express';
import { getHistoryHandler, getHistoryByIdHandler } from '../services/history/historyController';

const router = Router();

// GET /api/history?limit=...&offset=...&execution_status=...&database_type=...
router.get('/', getHistoryHandler);

// GET /api/history/:id
router.get('/:id', getHistoryByIdHandler);

export default router;
