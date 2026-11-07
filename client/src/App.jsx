import { useEffect, useState } from 'react';
import { api } from './api.js';
import DocumentView from './DocumentView.jsx';

export default function App() {
  const [userId, setUserId] = useState(localStorage.getItem('userId'));
  const [users, setUsers] = useState([]);
  const [openDocId, setOpenDocId] = useState(null);

  useEffect(() => {
    api('/users').then(setUsers).catch(() => {});
  }, []);

  function login(id) {
    localStorage.setItem('userId', id);
    setUserId(id);
  }

  function logout() {
    localStorage.removeItem('userId');
    setUserId(null);
    setOpenDocId(null);
  }

  if (!userId) {
    return (
      <div className="login">
        <h1>Ajaia Docs</h1>
        <p className="muted">Choose a demo account to continue.</p>
        {users.map((u) => (
          <button key={u.id} onClick={() => login(u.id)}>
            {u.name} ({u.email})
          </button>
        ))}
      </div>
    );
  }

  if (openDocId) {
    return (
      <DocumentView
        userId={userId}
        docId={openDocId}
        onBack={() => setOpenDocId(null)}
        onLogout={logout}
      />
    );
  }

  return <Dashboard userId={userId} onOpen={setOpenDocId} onLogout={logout} />;
}

function Dashboard({ userId, onOpen, onLogout }) {
  const [docs, setDocs] = useState({ owned: [], shared: [] });
  const [error, setError] = useState('');

  async function load() {
    try {
      setDocs(await api('/documents', { userId }));
      setError('');
    } catch (e) {
      if (e.status === 401) return onLogout();
      setError(e.message);
    }
  }

  useEffect(() => {
    load();
  }, [userId]);

  async function createDoc() {
    try {
      const doc = await api('/documents', { method: 'POST', userId, body: { title: 'Untitled document' } });
      onOpen(doc.id);
    } catch (e) {
      setError(e.message);
    }
  }

  async function uploadFile(e) {
    const file = e.target.files[0];
    e.target.value = ''; // lets the same file be chosen again later
    if (!file) return;

    const ext = file.name.toLowerCase().split('.').pop();
    if (!['txt', 'md'].includes(ext)) {
      setError('Only .txt and .md files are supported.');
      return;
    }
    if (file.size > 200 * 1024) {
      setError('File must be 200 KB or smaller.');
      return;
    }

    try {
      const text = await file.text();
      const title = file.name.replace(/\.(txt|md)$/i, '');
      const doc = await api('/documents', {
        method: 'POST',
        userId,
        body: { title, content: textToDoc(text) },
      });
      onOpen(doc.id);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="page">
      <header>
        <h1>Ajaia Docs</h1>
        <button onClick={onLogout}>Log out</button>
      </header>

      <div className="actions">
        <button onClick={createDoc}>+ New document</button>
        <label>
          Upload .txt or .md (max 200 KB){' '}
          <input type="file" accept=".txt,.md" onChange={uploadFile} />
        </label>
      </div>

      {error && <div className="error" role="alert">{error}</div>}

      <DocList title="Owned by me" docs={docs.owned} onOpen={onOpen} />
      <DocList title="Shared with me" docs={docs.shared} onOpen={onOpen} showOwner />
    </div>
  );
}

function DocList({ title, docs, onOpen, showOwner }) {
  return (
    <section>
      <h2>{title}</h2>
      {docs.length === 0 && <p className="muted">Nothing here yet.</p>}
      <ul>
        {docs.map((d) => (
          <li key={d.id}>
            <button className="link" onClick={() => onOpen(d.id)}>{d.title}</button>{' '}
            <span className="muted">
              {showOwner && `from ${d.owner_name} · `}
              {d.role}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

// Converts plain text into the editor's document format.
// "# Title" becomes a big heading, "## Title" a smaller one, everything else a paragraph.
function textToDoc(text) {
  const content = text.split(/\r?\n/).map((line) => {
    const heading = line.match(/^(#{1,2}) (.+)/);
    if (heading && heading[2].trim()) {
      return {
        type: 'heading',
        attrs: { level: heading[1].length },
        content: [{ type: 'text', text: heading[2] }],
      };
    }
    return line.trim()
      ? { type: 'paragraph', content: [{ type: 'text', text: line }] }
      : { type: 'paragraph' };
  });
  return { type: 'doc', content: content.length ? content : [{ type: 'paragraph' }] };
}