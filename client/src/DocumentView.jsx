import { useEffect, useRef, useState } from 'react';
import { api } from './api.js';
import Editor from './Editor.jsx';

export default function DocumentView({ userId, docId, onBack }) {
  const [doc, setDoc] = useState(null);
  const [title, setTitle] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [shares, setShares] = useState([]);
  const [shareEmail, setShareEmail] = useState('');
  const [shareRole, setShareRole] = useState('viewer');
  const saveTimer = useRef(null);
  const pending = useRef(null); // latest edits not yet saved

  useEffect(() => {
    api(`/documents/${docId}`, { userId })
      .then((d) => {
        setDoc(d);
        setTitle(d.title);
      })
      .catch((e) => setError(e.message));
  }, [docId, userId]);

  useEffect(() => {
    if (doc?.role === 'owner') loadShares();
  }, [doc?.role]);

  // If the user leaves while a save is pending, save it before closing.
  useEffect(() => {
    return () => {
      clearTimeout(saveTimer.current);
      if (pending.current) {
        api(`/documents/${docId}`, { method: 'PUT', userId, body: { content: pending.current } }).catch(() => {});
      }
    };
  }, [docId, userId]);

  async function loadShares() {
    try {
      setShares(await api(`/documents/${docId}/shares`, { userId }));
    } catch (e) {
      setError(e.message);
    }
  }

  // Autosave: waits 800ms after the last keystroke, then saves.
  function onContentChange(json) {
    if (!canEdit) return; // read-only users never save
    pending.current = json;
    setStatus('Unsaved changes…');
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      const content = pending.current;
      pending.current = null;
      setStatus('Saving…');
      try {
        await api(`/documents/${docId}`, { method: 'PUT', userId, body: { content } });
        setStatus('All changes saved');
        setError('');
      } catch (e) {
        setStatus('');
        setError(e.message);
      }
    }, 800);
  }

  async function rename() {
    const next = title.trim();
    if (!next || next === doc.title) {
      setTitle(doc.title);
      return;
    }
    try {
      await api(`/documents/${docId}`, { method: 'PUT', userId, body: { title: next } });
      setDoc({ ...doc, title: next });
      setError('');
    } catch (e) {
      setError(e.message);
      setTitle(doc.title);
    }
  }

  async function shareDoc(e) {
    e.preventDefault();
    try {
      await api(`/documents/${docId}/shares`, {
        method: 'POST',
        userId,
        body: { email: shareEmail, role: shareRole },
      });
      setShareEmail('');
      setError('');
      loadShares();
    } catch (err) {
      setError(err.message);
    }
  }

  async function revoke(targetId) {
    try {
      await api(`/documents/${docId}/shares/${targetId}`, { method: 'DELETE', userId });
      loadShares();
    } catch (e) {
      setError(e.message);
    }
  }

  async function deleteDoc() {
    if (!confirm('Delete this document for everyone?')) return;
    try {
      await api(`/documents/${docId}`, { method: 'DELETE', userId });
      onBack();
    } catch (e) {
      setError(e.message);
    }
  }

  if (!doc && !error) return <p className="page">Loading…</p>;
  if (!doc) {
    return (
      <div className="page">
        <button onClick={onBack}>← Back</button>
        <div className="error">{error}</div>
      </div>
    );
  }

  const isOwner = doc.role === 'owner';
  const canEdit = isOwner || doc.role === 'editor';

  return (
    <div className="page">
      <div className="topbar">
        <button onClick={onBack}>← Back</button>
        <span className="muted">
          {isOwner ? 'You own this document' : `Shared with you (${doc.role})`}
        </span>
        <span className="muted">{canEdit ? status : 'Read-only'}</span>
      </div>

      <input
        className="title"
        value={title}
        disabled={!canEdit}
        maxLength={120}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={rename}
        onKeyDown={(e) => e.key === 'Enter' && e.target.blur()}
      />

      {error && <div className="error" role="alert">{error}</div>}

      <Editor
        key={docId}
        initialContent={doc.content}
        editable={canEdit}
        onChange={onContentChange}
      />

      {isOwner && (
        <section className="share">
          <h2>Sharing</h2>
          <form onSubmit={shareDoc}>
            <input
              type="email"
              placeholder="alice@demo.test"
              value={shareEmail}
              onChange={(e) => setShareEmail(e.target.value)}
              required
            />
            <select value={shareRole} onChange={(e) => setShareRole(e.target.value)}>
              <option value="viewer">Can view</option>
              <option value="editor">Can edit</option>
            </select>
            <button>Share</button>
          </form>

          {shares.length === 0 && <p className="muted">Not shared with anyone yet.</p>}
          <ul>
            {shares.map((s) => (
              <li key={s.id}>
                {s.name} ({s.email}) · {s.role}{' '}
                <button onClick={() => revoke(s.id)}>Remove</button>
              </li>
            ))}
          </ul>

          <button className="danger" onClick={deleteDoc}>Delete document</button>
        </section>
      )}
    </div>
  );
}