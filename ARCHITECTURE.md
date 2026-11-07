# Architecture

## Overview

Ajaia Docs is a small full-stack app. A React frontend talks to an Express API, which stores data in SQLite. In production, one Node server serves both the API and the built frontend, so there is only one service to deploy.

Browser (React + Tiptap)
| fetch /api/... (x-user-id header)
v
Express server (server/app.js)
| every permission check goes through
v
access.js ----> SQLite (server/data.db)


## Why SQLite

SQLite needs no separate database server. A reviewer can clone the repo, run `npm install`, and have a working database in seconds. For a demo with a few users and documents, it is simple and reliable. The tradeoff is that it is a single file on disk, so it does not scale to many writers and needs a persistent disk in production. Moving to Postgres is the next step if the app grows.

## Why Tiptap

Tiptap stores the document as structured JSON (headings, lists, bold marks) rather than HTML or raw text. Saving that JSON means formatting survives page reloads and the file import in `textToDoc` maps directly onto the same structure. Tiptap is also built on ProseMirror, a mature editor engine, so the toolbar buttons stay consistent with the stored data.

## Why one access function decides every permission

All permission logic lives in `server/access.js`. The `getRole` function looks up whether a user owns a document, has a share, or has no access. The `can` object maps each action (read, write, manage) to the roles allowed to perform it. Every route calls `requireRole`, which uses these two pieces.

This matters because permission bugs usually happen when each route makes its own check and one is forgotten. Keeping one place to review means one set of rules to test. The five tests in `server/access.test.js` cover those rules directly.

## Why strangers get 404 instead of 403

If a user has no access to a document, the server returns "Document not found" (404). If it returned 403 ("forbidden"), the response would confirm that the document exists, which leaks information. For example, anyone could guess document IDs to learn which documents exist. A 403 is used only when the user already has access but the action is not allowed, such as a viewer trying to edit.

## Why login is mocked

The brief allows a simple login for simulated users. The app shows a list of seeded accounts (Alice, Bob, Carol), and the chosen user's ID is stored in the browser and sent as an `x-user-id` header. Anyone can send any ID, so this is not secure. It is acceptable for a demo of sharing logic, but real use would need signed sessions or an auth provider.

## Save and autosave

The editor saves 800 milliseconds after the last keystroke. Users with view-only access see the editor disabled, and the client skips saving when `canEdit` is false, so read-only users do not trigger write errors. The server still enforces this rule, so the client check is a convenience, not the only protection.

## What I prioritized

1. Correct sharing and access rules, with tests
2. A working editor with the required formatting
3. Upload and validation that a user can see working
4. Deployment that reviewers can open with no setup

## What I deliberately cut

- `.docx` import. `.txt` and `.md` cover the upload requirement, and `mammoth` is the planned next step.
- Real-time collaboration, comments, and version history.
- Real authentication and password handling.
- Persistent storage on the free host. Render's free tier resets the disk on restart, so documents created on the live site can disappear. The demo users are re-seeded on boot. The fix is a persistent disk or Postgres.
- Attachments, export, and a mobile layout.

## Known issues and next steps

- npm reports audit warnings from development dependencies. I did not run `npm audit fix --force` because it can break packages.
- Next, with 2 to 4 hours: import `.docx` with `mammoth`, add real login, move to Postgres with a persistent volume, and add a share-list page for shared users to see who else has access.