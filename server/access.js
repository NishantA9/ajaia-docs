// Returns 'owner', 'editor', 'viewer', or null (no access).
export function getRole(db, docId, userId) {
  const doc = db.prepare('SELECT owner_id FROM documents WHERE id = ?').get(docId);
  if (!doc) return null;
  if (doc.owner_id === userId) return 'owner';
  const share = db
    .prepare('SELECT role FROM document_shares WHERE doc_id = ? AND user_id = ?')
    .get(docId, userId);
  return share ? share.role : null;
}

// What each action requires.
export const can = {
  read: (role) => ['owner', 'editor', 'viewer'].includes(role),
  write: (role) => ['owner', 'editor'].includes(role),
  manage: (role) => role === 'owner', // share, revoke, delete
};