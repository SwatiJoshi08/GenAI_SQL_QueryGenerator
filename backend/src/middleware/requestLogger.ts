// backend/src/middleware/requestLogger.ts
import morgan from 'morgan';

// Use combined format with color output for development
const logger = morgan(':method :url :status :response-time ms - :res[content-length]', {
  // you can customize skip or stream if needed
});

export default logger;
