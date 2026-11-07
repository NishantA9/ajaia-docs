# Submission

## Links

- **Live product:** https://ajaia-docs-h1cs.onrender.com/
- **Source code:** https://github.com/NishantA9/ajaia-docs
- **Walkthrough video:** https://youtu.be/PHAexQSQj5E
- **Google Drive folder:** https://drive.google.com/drive/folders/1SmrGjoGV_RMMK4mSthTck-kcrNnNY3no?usp=drive_link

## Demo accounts

| Name  | Email            | Use                                              |
|-------|------------------|--------------------------------------------------|
| Alice | alice@demo.test  | Owner. Has "Project Plan" and can share it.      |
| Bob   | bob@demo.test    | Share recipient. Test view-only access.          |
| Carol | carol@demo.test  | No access to Alice's documents. Test 404 case.   |

No password is needed. Choose the user on the login screen.

## Files included

- `server/` : Express API, database setup, access rules, and tests
- `client/` : React frontend, editor, and dashboard
- `README.md` : setup, features, and limitations
- `ARCHITECTURE.md` : design decisions and tradeoffs
- `AI_WORKFLOW.md` : how AI was used and how the work was verified
- `SUBMISSION.md` : this file
- `screenshots/` : screenshots of the main flows
- `package.json`, `vite.config.js`, `vitest.config.js` : project configuration

## Test result

`npm test`: 5 of 5 tests passing (sharing and access control).

## What works

- Create, rename, edit, and autosave documents
- Bold, italic, underline, H1/H2, bulleted and numbered lists, with formatting preserved after reload
- Upload `.txt` and `.md` files (max 200 KB) as new documents
- Share by email as Can view or Can edit, and remove access
- Owned and shared document lists
- Read-only view for viewers
- Stranger access returns 404

## What is partial or incomplete

- Login is mocked and not secure
- Documents on the free Render instance can be lost on restart
- Only `.txt` and `.md` upload is supported

## Not built

- `.docx` import
- Real-time collaboration, comments, version history
- Attachments and export

## What I would build next (2 to 4 hours)

- `.docx` import using `mammoth`
- Real authentication
- Postgres with a persistent volume
- Viewing the list of people who can access a document, from the shared list