import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from './app.js';
import { createDb } from './db.js';

const ALICE = 'u_alice';
const BOB = 'u_bob';
const CAROL = 'u_carol';

let app;
beforeEach(() => {
  app = createApp(createDb(':memory:')); // fresh database for every test
});

async function makeDoc(user = ALICE) {
  const res = await request(app).post('/api/documents').set('x-user-id', user).send({ title: 'Plan' });
  return res.body.id;
}

// Returns the request itself (not a promise), so tests can chain .expect().
function share(docId, email, role) {
  return request(app)
    .post(`/api/documents/${docId}/shares`)
    .set('x-user-id', ALICE)
    .send({ email, role });
}

describe('sharing and access control', () => {
  it('owner can open their document and sees role "owner"', async () => {
    const id = await makeDoc();
    const res = await request(app).get(`/api/documents/${id}`).set('x-user-id', ALICE);
    expect(res.status).toBe(200);
    expect(res.body.role).toBe('owner');
  });

  it('a stranger gets 404, not 403, so document existence is not leaked', async () => {
    const id = await makeDoc();
    const res = await request(app).get(`/api/documents/${id}`).set('x-user-id', CAROL);
    expect(res.status).toBe(404);
  });

  it('a viewer can read but cannot edit', async () => {
    const id = await makeDoc();
    await share(id, 'bob@demo.test', 'viewer').expect(201);

    const read = await request(app).get(`/api/documents/${id}`).set('x-user-id', BOB);
    expect(read.status).toBe(200);
    expect(read.body.role).toBe('viewer');

    const write = await request(app)
      .put(`/api/documents/${id}`)
      .set('x-user-id', BOB)
      .send({ title: 'Hacked' });
    expect(write.status).toBe(403);
  });

  it('an editor can edit but cannot share', async () => {
    const id = await makeDoc();
    await share(id, 'bob@demo.test', 'editor').expect(201);

    const write = await request(app)
      .put(`/api/documents/${id}`)
      .set('x-user-id', BOB)
      .send({ title: 'Bob was here' });
    expect(write.status).toBe(200);

    const shareAttempt = await request(app)
      .post(`/api/documents/${id}/shares`)
      .set('x-user-id', BOB)
      .send({ email: 'carol@demo.test', role: 'viewer' });
    expect(shareAttempt.status).toBe(403);
  });

  it('revoking access removes it immediately', async () => {
    const id = await makeDoc();
    await share(id, 'bob@demo.test', 'viewer').expect(201);
    await request(app).delete(`/api/documents/${id}/shares/u_bob`).set('x-user-id', ALICE).expect(204);

    const res = await request(app).get(`/api/documents/${id}`).set('x-user-id', BOB);
    expect(res.status).toBe(404);
  });
});