import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { getPool } from './connection';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.development') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

async function runMigrations(): Promise<void> {
  const pool = getPool();
  
  // Create migrations tracking table if not exists
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      executed_at TIMESTAMP DEFAULT NOW()
    )
  `);
  
  // Get already executed migrations
  const { rows: executed } = await pool.query<{ name: string }>(
    'SELECT name FROM schema_migrations'
  );
  const executedNames = new Set(executed.map(r => r.name));
  
  // Get migration files
  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort();
  
  for (const file of files) {
    if (executedNames.has(file)) {
      console.log(`Skipping migration: ${file}`);
      continue;
    }
    
    console.log(`Running migration: ${file}`);
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf-8');
    
    // Split by semicolon and execute each statement
    const statements = sql.split(';').filter(s => s.trim());
    for (const stmt of statements) {
      await pool.query(stmt);
    }
    
    await pool.query(
      'INSERT INTO schema_migrations (name) VALUES ($1)',
      [file]
    );
    
    console.log(`Completed migration: ${file}`);
  }
  
  console.log('All migrations complete');
}

if (require.main === module) {
  runMigrations()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Migration failed:', err);
      process.exit(1);
    });
}

export { runMigrations };
