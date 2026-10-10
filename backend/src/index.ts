// Load environment variables early
import './config/loadEnv';

import express from 'express';
import './config/env'; // validates environment variables
import requestLogger from './middleware/requestLogger';
import queryRouter from './routes/query';
import { errorHandler } from './middleware/errorHandler';
import schemaRouter from './routes/schema';

const app = express();
const PORT = Number(process.env.PORT);
if (isNaN(PORT)) {
  console.error('❌ Invalid or missing PORT environment variable');
  process.exit(1);
}

app.use(requestLogger);
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});
app.use(express.json());

app.use('/api/schema', schemaRouter);
import historyRouter from './routes/history';

app.use('/api/query', queryRouter);
app.use('/api/history', historyRouter);

app.get('/health', (_, res) => {
  res.json({ status: 'ok' });
});

// error handling middleware (must be after routes)
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Backend server listening on http://localhost:${PORT}`);
});
