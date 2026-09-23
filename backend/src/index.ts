// Load environment variables early
import './config/loadEnv';

import express from 'express';
import './config/env'; // validates environment variables
import requestLogger from './middleware/requestLogger';
import queryRouter from './routes/query';
import { errorHandler } from './middleware/errorHandler';
import schemaRouter from './routes/schema';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(requestLogger);
app.use(express.json());

app.use('/api/schema', schemaRouter);
app.use('/api/query', queryRouter);

app.get('/health', (_, res) => {
  res.json({ status: 'ok' });
});

// error handling middleware (must be after routes)
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Backend server listening on http://localhost:${PORT}`);
});
