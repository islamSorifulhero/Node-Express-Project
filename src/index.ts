import dotenv from 'dotenv';
dotenv.config(); // Must load env vars before any other import reads them

import app from './app';
import pool from './config/database';

const PORT = parseInt(process.env.PORT ?? '3000', 10);

async function bootstrap(): Promise<void> {
  // Verify database connectivity on startup
  try {
    await pool.query('SELECT 1');
    console.log('✅ PostgreSQL connection pool ready');
  } catch (err) {
    console.error('❌ Failed to connect to PostgreSQL:', (err as Error).message);
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`🚀 DevPulse API running on port ${PORT} [${process.env.NODE_ENV ?? 'development'}]`);
  });
}

bootstrap();
