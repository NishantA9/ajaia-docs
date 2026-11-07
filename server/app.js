import express from 'express';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { createDb } from './db.js';
import { getRole, can } from './access.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const MAX_CONTENT_CHARS = 500_000;

const emptyDoc = () => ({ type: 'doc', content: [{ type: 'paragraph' }] });

function checkTitle(raw) {
  if (raw === undefined) return { value: 'Untitled document' };
  if (typeof raw !== 'string' || !raw.trim()) return { error: 'Title cannot be empty.' };
  if (raw.trim().length > 120) return { error: 'Title must be 120 characters or fewer.' };
  return { value: raw.trim() };
}

function checkContent(content) {
  if (!content || typeof content !== 'object' || content.type !== 'doc') {
    return 'Content must be a document.';
  }
  if (JSON.stringify(content).length > MAX_CONTENT_CHARS) return 'Document is too large.';
  return null;
}

export function createApp(db = createDb()) {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  // Public: demo users for the login screen.
  app.get('/api/users', (req, res) => {
    res.json(db.prepare('SELECT id, name, email FROM users ORDER BY name').all());
  });

  // Mock auth: every other API call must send the x-user-id header.
  app.use('/api', (req, res, next) => {
    const user = db
      .prepare('SELECT id, name, email FROM users WHERE id = ?')
      .get(req.get('x-user-id') || '');
    if (!user) return res.status(401).json({ error: 'Please log in.' });
    req.user = user;
    next();
  });

  // Returns the caller's role if they may do `need`; otherwise sends an error and returns null.
  // No access at all -> 404 (don't reveal the document exists). Access but not allowed -> 403.
  function requireRole(req, res, need) {
    const role = getRole(db, req.params.id, req.user.id);
    if (!role) {
      res.status(404).json({ error: 'Document not found.' });
      return null;
    }
    if (!can[need](role)) {
      res.status(403).json({ error: 'You do not have permission for that.' });
      return null;
    }
    return role;
  }

  // List my documents: owned, and shared with me.
  app.get('/api/documents', (req, res) => {
    const owned = db
      .prepare('SELECT id, title, updated_at FROM documents WHERE owner_id = ? ORDER BY updated_at DESC')
      .all(req.user.id)
      .map((d) => ({ ...d, role: 'owner' }));

    const shared = db
      .prepare(`
        SELECT d.id, d.title, d.updated_at, s.role, u.name AS owner_name
        FROM document_shares s
        JOIN documents d ON d.id = s.doc_id
        JOIN users u ON u.id = d.owner_id
        WHERE s.user_id = ?
        ORDER BY d.updated_at DESC`)
      .all(req.user.id);

    res.json({ owned, shared });
  });

  // Create a document (optionally with content, used by file upload).
  app.post('/api/documents', (req, res) => {
    const title = checkTitle(req.body?.title);
    if (title.error) return res.status(400).json({ error: title.error });

    const content = req.body?.content ?? emptyDoc();
    const contentError = checkContent(content);
    if (contentError) return res.status(400).json({ error: contentError });

    const id = randomUUID();
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO documents (id, owner_id, title, content_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)`)
      .run(id, req.user.id, title.value, JSON.stringify(content), now, now);

    res.status(201).json({ id, title: title.value, role: 'owner' });
  });

  // Open one document.
  app.get('/api/documents/:id', (req, res) => {
    const role = requireRole(req, res, 'read');
    if (!role) return;

    const doc = db
      .prepare('SELECT id, title, content_json, updated_at FROM documents WHERE id = ?')
      .get(req.params.id);

    res.json({
      id: doc.id,
      title: doc.title,
      content: JSON.parse(doc.content_json),
      updated_at: doc.updated_at,
      role,
    });
  });

  // Save content and/or rename. Owners and editors only.
  app.put('/api/documents/:id', (req, res) => {
    if (!requireRole(req, res, 'write')) return;

    const updates = {};
    if (req.body?.title !== undefined) {
      const title = checkTitle(req.body.title);
      if (title.error) return res.status(400).json({ error: title.error });
      updates.title = title.value;
    }
    if (req.body?.content !== undefined) {
      const contentError = checkContent(req.body.content);
      if (contentError) return res.status(400).json({ error: contentError });
      updates.content_json = JSON.stringify(req.body.content);
    }
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'Nothing to update.' });
    }

    // Column names come from the code above, never from the user, so this is safe.
    const sets = Object.keys(updates).map((col) => `${col} = ?`).join(', ');
    const now = new Date().toISOString();
    db.prepare(`UPDATE documents SET ${sets}, updated_at = ? WHERE id = ?`)
      .run(...Object.values(updates), now, req.params.id);

    res.json({ ok: true, updated_at: now });
  });

  // Delete a document. Owner only.
  app.delete('/api/documents/:id', (req, res) => {
    if (!requireRole(req, res, 'manage')) return;
    db.prepare('DELETE FROM documents WHERE id = ?').run(req.params.id);
    res.status(204).end();
  });

  // List who a document is shared with. Owner only.
  app.get('/api/documents/:id/shares', (req, res) => {
    if (!requireRole(req, res, 'manage')) return;
    res.json(
      db.prepare(`
        SELECT u.id, u.name, u.email, s.role
        FROM document_shares s
        JOIN users u ON u.id = s.user_id
        WHERE s.doc_id = ?`)
        .all(req.params.id)
    );
  });

  // Share with a user by email. Owner only.
  app.post('/api/documents/:id/shares', (req, res) => {
    if (!requireRole(req, res, 'manage')) return;

    const email = String(req.body?.email || '').trim().toLowerCase();
    const role = req.body?.role;
    if (!['viewer', 'editor'].includes(role)) {
      return res.status(400).json({ error: 'Role must be viewer or editor.' });
    }

    const target = db.prepare('SELECT id, name FROM users WHERE email = ?').get(email);
    if (!target) return res.status(404).json({ error: 'No user with that email.' });
    if (target.id === req.user.id) {
      return res.status(400).json({ error: 'You already own this document.' });
    }

    db.prepare(`
      INSERT INTO document_shares (doc_id, user_id, role) VALUES (?, ?, ?)
      ON CONFLICT(doc_id, user_id) DO UPDATE SET role = excluded.role`)
      .run(req.params.id, target.id, role);

    res.status(201).json({ ok: true, name: target.name, role });
  });

  // Remove someone's access. Owner only.
  app.delete('/api/documents/:id/shares/:userId', (req, res) => {
    if (!requireRole(req, res, 'manage')) return;
    db.prepare('DELETE FROM document_shares WHERE doc_id = ? AND user_id = ?')
      .run(req.params.id, req.params.userId);
    res.status(204).end();
  });

  // Serve the built React app (created by `npm run build`).
  const dist = path.join(here, '..', 'dist');
  app.use(express.static(dist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(dist, 'index.html'), (err) => err && next());
  });

  // Turns internal errors into clean JSON messages.
  app.use((err, req, res, next) => {
    if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON.' });
    if (err.type === 'entity.too.large') return res.status(413).json({ error: 'Request too large.' });
    console.error(err);
    res.status(500).json({ error: 'Something went wrong.' });
  });

  return app;
}