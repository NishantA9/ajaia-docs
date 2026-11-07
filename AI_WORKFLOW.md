# AI Workflow

## Tools used

- **Claude** for scoping, architecture planning, writing the initial code, debugging errors, and drafting these notes.
- **Git and GitHub** for version control and deployment (not AI, but part of the workflow).
- **Render** for hosting. The app deploys from the GitHub repository.
- **Vitest and Supertest** for tests, with Claude helping write the first version.

## How I used AI

I used AI in three stages:

1. **Scoping.** I described the brief and asked for a realistic slice. The AI proposed cutting `.docx` import and real-time collaboration, and I agreed with those cuts. I checked the timeline against the 4 to 6 hour limit before starting.
2. **Building.** The AI produced the first version of the files, which I copied into the project. I read the access logic before testing it, since permission code needs review.
3. **Debugging.** I pasted each error message and the terminal output, then asked for an explanation before accepting a fix.

## Where AI materially sped up the work

- **Environment setup.** The Node version conflict (nvm reporting v20 while the system still ran v26) would have taken a long time to diagnose alone. The AI explained that nvm's `.nodejs` link was stuck on the old version, and gave a workaround for the session.
- **Scaffolding.** Writing the Express routes, the SQLite schema, and the React components from a spec was much faster than writing each file from scratch.
- **Deployment.** The Render build settings, and the `NODE_VERSION` setting needed to avoid the `better-sqlite3` build error, were quicker to find than searching documentation.

## What I changed or rejected

- **Test file error.** The first version of `server/access.test.js` called `.expect()` on a plain promise, which fails at runtime. I rewrote the helper to return a supertest request so chaining works. I verified it by running `npm test` and getting 5 passing tests.
- **Read-only save error.** A viewer opening a document triggered a save on load, which the server correctly rejected with 403. The red error looked like a bug to a user. I added a check so the client does not send saves when the user cannot edit, and I retested as Bob in a private window. The server-side check remains in place.
- **Node version.** I did not accept the suggestion to uninstall Node 26. I used a PATH setting for the session, since the nvm link was stuck and I did not want to remove other tools.
- **Project location.** I moved the project out of OneDrive after `node_modules` files were locked during install, which caused permission errors.

## How I verified the work

- **Automated tests:** `npm test` runs 5 tests on access rules: owner access, stranger 404, viewer restrictions, editor restrictions, and revoking access. All pass.
- **Manual checks in two browser windows:** I logged in as Alice in one window and Bob in a private window. I checked formatting, autosave after a refresh, upload, sharing, read-only view, removing access, and the stranger view. Screenshots are in the `screenshots` folder.
- **Production check:** I tested the live Render URL with the same flow.
- **Code review:** I read `access.js` and each route's permission check, since a mistake there is the main risk in this app.

## What I would do differently

- Write the access tests before building the routes, so the rules are fixed first.
- Check the read-only path earlier. I should have tested the viewer flow before the editor flow.