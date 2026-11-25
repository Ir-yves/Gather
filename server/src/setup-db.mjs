import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';

dotenv.config({ path: fileURLToPath(new URL('../.env', import.meta.url)) });

const database = process.env.MYSQL_DATABASE;
const password = process.env.MYSQL_PASSWORD;
const ca = process.env.MYSQL_SSL_CA;
if (database !== 'streamline') {
  throw new Error('MYSQL_DATABASE must be set to "streamline" to match server/schema.sql.');
}
if (!password) {
  throw new Error('Set MYSQL_PASSWORD in server/.env before setting up the cloud database.');
}
if (!ca?.trim()) {
  throw new Error('Set MYSQL_SSL_CA to the Aiven CA certificate contents in server/.env before connecting.');
}

const schemaPath = fileURLToPath(new URL('../schema.sql', import.meta.url));
const migrationsPath = fileURLToPath(new URL('../migrations/', import.meta.url));
const connection = await mysql.createConnection({
  host: process.env.MYSQL_HOST,
  port: Number(process.env.MYSQL_PORT || 3306),
  user: process.env.MYSQL_USER,
  password,
  ssl: { ca },
  multipleStatements: true
});

try {
  await connection.query(await readFile(schemaPath, 'utf8'));
  await connection.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name VARCHAR(255) PRIMARY KEY,
      applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  const [appliedRows] = await connection.query('SELECT name FROM schema_migrations');
  const applied = new Set(appliedRows.map((row) => String(row.name)));
  const migrationFiles = (await readdir(migrationsPath))
    .filter((name) => /^\d+_.+\.sql$/.test(name))
    .sort((left, right) => left.localeCompare(right));

  for (const name of migrationFiles) {
    if (applied.has(name)) continue;
    await connection.query(await readFile(join(migrationsPath, name), 'utf8'));
    await connection.execute('INSERT INTO schema_migrations (name) VALUES (?)', [name]);
    console.info(`Applied ${name}`);
  }

  console.info(`Cloud database setup complete (${migrationFiles.length} migrations checked).`);
} finally {
  await connection.end();
}
