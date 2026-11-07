# Ajaia Docs

A lightweight collaborative document editor. Users can create, edit, and format documents, upload `.txt` or `.md` files, and share documents with other users as viewers or editors.

Built for the Ajaia Full Stack Product Engineer assessment.

## Live demo

**URL:** https://YOUR-RENDER-URL

Log in with any demo account. No password is needed (see Limitations).

| Name  | Email            | Role in demo                          |
|-------|------------------|---------------------------------------|
| Alice | alice@demo.test  | Owner of the sample "Project Plan"    |
| Bob   | bob@demo.test    | Use with Alice's share (view/edit)    |
| Carol | carol@demo.test  | Stranger: cannot see Alice's documents |

## Features

- **Create and rename documents**, with autosave after you stop typing.
- **Rich text editing:** bold, italic, underline, H1/H2 headings, bulleted and numbered lists.
- **Upload:** `.txt` and `.md` files (max 200 KB) become new editable documents. `# Title` and `## Title` lines become headings.
- **Sharing:** owners can share a document with another user by email, as **Can view** or **Can edit**. Owners can remove access at any time.
- **Owned and shared views:** the dashboard separates "Owned by me" from "Shared with me."
- **Access control:** every permission check runs through one function (`server/access.js`). Users with no access get a 404, so document existence is not revealed.

## Tech stack

- **Frontend:** React, Vite, Tiptap (rich text editor)
- **Backend:** Node.js, Express
- **Database:** SQLite (`better-sqlite3`)
- **Tests:** Vitest, Supertest

## Run locally

You need **Node.js 20** (other versions may fail to install `better-sqlite3`).

```bash
npm install
npm test
```

Then start the app in two terminals:

```bash
# Terminal 1: API server (port 3001)
npm run dev:server

# Terminal 2: frontend (port 5173)
npm run dev:client
```

Open http://localhost:5173.

To run the production build instead:

```bash
npm run build
npm start
```

Open http://localhost:3001.

## Project structure

```
server/
  app.js            API routes and validation
  access.js         Permission rules (owner, editor, viewer)
  db.js             Database setup and demo user seeding
  access.test.js    Access control tests
client/src/
  App.jsx           Login, dashboard, upload
  DocumentView.jsx  Document page, autosave, sharing
  Editor.jsx        Rich text editor and toolbar
```

## Tests

`npm test` runs 5 tests covering sharing and access control: owner access, stranger access (404), viewer restrictions, editor restrictions, and revoking access.

## Limitations

- **Login is mocked.** Choosing a user stores their ID in the browser and sends it as a header. This is for demonstration only and is not secure.
- **Free hosting resets the database** when the server restarts. Demo users are recreated automatically, but documents created on the live site may disappear.
- **Upload supports only `.txt` and `.md`.** `.docx` import is not implemented.
- **No real-time collaboration, comments, or version history.**
- **npm reports audit warnings** on install. They come from dev dependencies and were not fixed for this demo.

## Possible next steps

- Import `.docx` files with the `mammoth` library
- Replace mock login with real authentication
- Move storage to Postgres with a persistent disk
- Add real-time editing and version history