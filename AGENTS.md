# Station Restock Log

## Next step

Sign in personally through Supervisor Login in the local app, then check the live supervisor dashboard, usage history, and inventory using read-only actions. Then plan the security fix for the hardcoded supervisor code and the open Supabase policies, in a dedicated session with a top model.

## Completed fixes

- Nov 18, 2026: Recovered the source from GitHub `main` (`7a7fe1e`), added the launcher, notes and ignore rules, and passed the build and offline browser checks.
- Nov 18, 2026: Set up the Claude Code + Codex team workflow notes.
- Nov 18, 2026: Fixed two Codex review findings. `start.bat` now reinstalls when an earlier install was interrupted, and the setup notes add `/reload-plugins` before `/codex:setup`.
- Nov 18, 2026: Owner lifted the commit pause. Local commits resume. The supervisor code stays unchanged until the security fix (see below).

The crew view records supplies taken from a station. The supervisor view shows restock logs and manages bulk inventory, including below-PAR stock. PAR is the target stock level.

- Working folder `C:\Users\mathi\Projects\restock-app`.
- Double-click `start.bat` or run `npm.cmd run dev -- --host 127.0.0.1 --port 5173 --strictPort`. Open [the local app](http://127.0.0.1:5173/). For a fresh install run `npm.cmd ci`. Use `npm.cmd run build` to check the production build.
- Recovery baseline `7a7fe1e`. The built JavaScript and CSS matched the Netlify deploy byte for byte. Keep the Windows launcher, the loopback binding, and the ignore rules for `.env` files, dependencies, and build output. Setup left the app code and dependency versions as recovered.
- The crew form passed browser checks. The approved offline browser test confirmed one crew submission in the supervisor dashboard and usage history, plus the below-PAR calculation and reorder filter. Supabase confirmed restoration completed, and the local app received HTTP 200 for all four live startup reads. The live supervisor view still needs the owner's app sign-in. Build passed. ESLint reports eight pre-existing errors. [Supabase project dashboard](https://supabase.com/dashboard/project/tbybflqfgixarvkxhndk) · [Live read-only test log](C:/Users/mathi/Projects/_recovery/restock/browser-live-read-only.log)
- Supervisor code decision (Nov 18, 2026): the hardcoded supervisor access code in `src/App.jsx` stays as is for now. The GitHub repository is public, so the value is already visible in its history and in the deployed JavaScript. Changing or removing it only helps as part of the real security fix (server-side check and locked-down Supabase policies), planned as the Next step. Local commits are allowed again. Never put the value in notes, logs, captures, messages, or new commits. Rewriting Git history or making the repository private is the owner's call.

## Checks to preserve

- [x] Crew view opens and shows the date, station, category, item, and Submit controls. Choosing a category populates item choices. Leave Submit untouched during production-backed checks.
- [x] The crew view shows the Supervisor Login control.
- [ ] With the owner entering the live app code, open and inspect Restock Dashboard, history, and bulk inventory using read-only checks.
- [x] The initial log, item, count, and movement requests succeeded against the restored backend using read-only access.
- [x] In the approved offline browser fixture, submit one sample crew entry and confirm it reaches the supervisor dashboard and Usage History. In Freehold Inventory, confirm current stock 6 against PAR 10 shows 4 needed and the reorder-only filter excludes an item at PAR.
- [x] A production build completes using the locked dependencies.

## Editing and handoff

Make targeted edits in this checkout. Keep each change limited to the request. Use one editing agent at a time. Recheck the affected workflows after every change and report checks you could not run. Commit each verified fix locally when safe. Keep secrets out of Git and outputs. **Pushing to `main` on GitHub deploys straight to the live Netlify site** (auto-publish is on). Ask before pushing, deploying, or making any live database write, account, schema, or settings change. The owner signs in to live services personally. Use the approved offline fixture described in the README for submission tests. Ask before creating another isolated test setup.

## Team workflow: Claude Code leads, Codex helps

- **Claude Code is the boss.** It plans and builds in this folder.
- **Codex is the employee**, called from inside Claude Code through OpenAI's official Codex plugin (`openai/codex-plugin-cc`):
  - `/codex:review`: read-only second opinion on uncommitted changes. For work that's already committed (the normal case after a handoff commit), use `/codex:review --base <commit-before-the-work>`. Without `--base` it sees nothing to review.
  - `/codex:rescue`: delegate a task (for example a stuck bug) to Codex.
- One-time setup per PC: install the [official Codex plugin](https://github.com/openai/codex-plugin-cc#install) (`claude plugin marketplace add openai/codex-plugin-cc`, then `claude plugin install codex@openai-codex`). If Claude Code was already open, run `/reload-plugins`, then run `/codex:setup`.
- **One folder, one editor at a time.** Never make a separate copy of this project for either tool. While Codex works on a delegated task, Claude doesn't edit, and the reverse.
- **Commit before every handoff**, so each side starts from a known commit.
- **Commit tags:** every commit message starts with `[Claude]` or `[Codex]`, followed by a plain-English summary of what changed and why.
- Commits use the owner's Git identity (Mathis Quesada, GitHub noreply email).
- Codex only sees the files and the Git history. Keep this file's **Next step** and **Completed fixes** current and write clear commit messages.
- At the end of a task, or before `/clear`: update **Next step** and **Completed fixes** here, commit, and tell the owner it's safe to clear.

**Restock note:** the earlier commit pause was lifted on Nov 18, 2026. Commit locally as usual. Pushing still needs the owner's yes because it deploys the live site.
