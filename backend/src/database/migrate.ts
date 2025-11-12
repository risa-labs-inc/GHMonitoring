import { readFileSync } from 'fs';
import { join } from 'path';
import { getPool, closePool, testConnection } from './connection';

/**
 * Run database migrations
 */
async function migrate() {
  console.log('Starting database migration...');

  // Test connection first
  const connected = await testConnection();
  if (!connected) {
    console.error('Failed to connect to database. Exiting.');
    process.exit(1);
  }

  try {
    // Read schema file
    const schemaPath = join(__dirname, 'schema.sql');
    const schema = readFileSync(schemaPath, 'utf-8');

    // Execute schema
    const pool = getPool();
    await pool.query(schema);

    console.log('✓ Database schema created successfully');
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
  migrate().catch((error) => {
    console.error('Fatal error during migration:', error);
    process.exit(1);
  });
}

export { migrate };
