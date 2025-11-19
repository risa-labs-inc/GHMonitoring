import { readFileSync } from 'fs';
import { join } from 'path';
import { getPool, closePool, testConnection } from './connection';
import logger from '../utils/logger';

/**
 * Run database migrations
 * This creates all necessary tables and indexes
 */
async function migrate() {
  try {
    // Read schema file
    const schemaPath = join(__dirname, 'schema.sql');
    const schema = readFileSync(schemaPath, 'utf-8');

    // Execute schema (using IF NOT EXISTS, so safe to run multiple times)
    const pool = getPool();
    await pool.query(schema);

    logger.info('Database schema created/updated successfully');
  } catch (error) {
    logger.error('Migration failed:', error);
    throw error;
  }
}

/**
 * Standalone migration runner for manual execution
 */
async function runStandalone() {
  console.log('Starting database migration...');

  // Test connection first
  const connected = await testConnection();
  if (!connected) {
    console.error('Failed to connect to database. Exiting.');
    process.exit(1);
  }

  try {
    await migrate();
    console.log('✓ Migration completed');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await closePool();
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  runStandalone().catch((error) => {
    console.error('Fatal error during migration:', error);
    process.exit(1);
  });
}

export { migrate };
