import path from 'path';
import { config as loadEnv } from 'dotenv';
// Load environment variables from the project root .env file
loadEnv({ path: path.resolve(process.cwd(), '..', '.env') });
