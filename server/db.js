import Database from 'better-sqlite3';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const defaultFile = process.env.DB_PATH || path.join(here, 'data.db');

// Creates tables and seeds demo users if the database is empty.
export function createDb(file = defaultFile) {
  const db = new Database(file);
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id    TEXT PRIMARY KEY,
      name  TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL
    );
    CREATE TABLE IF NOT EXISTS documents (
      id           TEXT PRIMARY KEY,
      owner_id     TEXT NOT NULL REFERENCES users(id),
      title        TEXT NOT NULL,
      content_json TEXT NOT NULL,
      created_at   TEXT NOT NULL,
      updated_at   TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS document_shares (
      doc_id  TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role    TEXT NOT NULL CHECK (role IN ('viewer', 'editor')),
      PRIMARY KEY (doc_id, user_id)
    );
  `);

  const { n } = db.prepare('SELECT COUNT(*) AS n FROM users').get();
  if (n === 0) {
    const insert = db.prepare('INSERT INTO users (id, name, email) VALUES (?, ?, ?)');
    insert.run('u_alice', 'Alice', 'alice@demo.test');
    insert.run('u_bob', 'Bob', 'bob@demo.test');
    insert.run('u_carol', 'Carol', 'carol@demo.test');
  }

  return db;
}