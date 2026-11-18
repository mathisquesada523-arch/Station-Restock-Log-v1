# Station Restock Log

## Next step

Roll out the supervisor sign-in and database lockdown. It's built and committed locally, but not live. Owner steps, in order:
1. In the Supabase dashboard (Authentication), create a supervisor user with email and password for each supervisor. Turn off "Allow new users to sign up".
2. Give Claude the yes to push to `main`. Netlify deploys the new sign-in. It also works under the old open policies.
3. Give Claude the yes to apply `supabase/migrations/20261118120000_supervisor_auth_rls.sql` to the live project. Then add each supervisor to `public.supervisors` (the SQL is at the bottom of the file).
4. Sign in on the live site and check the dashboard, history, and inventory. Then confirm that a signed-out request gets no rows back.
Until step 3, the live database stays open to anyone.

## Completed fixes

- Nov 18, 2026: Recovered the source from GitHub `main` (`7a7fe1e`), added the launcher, notes and ignore rules, and passed the build and offline browser checks.
- Nov 18, 2026: Set up the Claude Code + Codex team workflow notes.
- Nov 18, 2026: Fixed two Codex review findings. `start.bat` now reinstalls when an earlier install was interrupted, and the setup notes add `/reload-plugins` before `/codex:setup`.
- Nov 18, 2026: Owner lifted the commit pause. Local commits resume. The supervisor code stays unchanged until the security fix (see below).
- Nov 18, 2026: Built the security fix locally. Approved plan, not yet live.
  - Supervisor Login now uses Supabase Auth email and password instead of the hardcoded code, which is removed from the source and bundle. The session is kept in memory only, so a reload signs the supervisor out on shared devices. The crew view reads no data, and supervisor data loads only after sign-in. An account that isn't on the supervisor list is signed out.
  - New migration `supabase/migrations/20261118120000_supervisor_auth_rls.sql`: adds a `public.supervisors` allowlist and `is_supervisor()`, and drops all the "allow anyone" policies. Crew can only add supply logs, with checked values and columns. Only listed supervisors can read or change logs and the inventory tables.
  - The offline fixture now mocks the Supabase sign-in. It checks that the crew view makes no reads, a wrong password is rejected, a supervisor sign-in loads the data, and signing out returns to the crew view. It passed, and the build passed.
  - Not covered offline: the database rules themselves. Check them on the live project after the migration is applied.
- Nov 18, 2026: With the owner's yes, pushed `4d5f730` to `main`. Netlify now serves the email and password sign-in, and the old code is not in the live bundle. Rollout step 2 is done. A read-only check right after found 0 users in Supabase Auth, so step 1 isn't finished yet, and no one can open the supervisor view until a supervisor user exists. The migration is not applied.

The crew view records supplies taken from a station. The supervisor view shows restock logs and manages bulk inventory, including below-PAR stock. PAR is the target stock level.

- Working folder `C:\Users\mathi\Projects\restock-app`.
- Double-click `start.bat` or run `npm.cmd run dev -- --host 127.0.0.1 --port 5173 --strictPort`. Open [the local app](http://127.0.0.1:5173/). For a fresh install run `npm.cmd ci`. Use `npm.cmd run build` to check the production build.
- Recovery baseline `7a7fe1e`. The built JavaScript and CSS matched the Netlify deploy byte for byte. Keep the Windows launcher, the loopback binding, and the ignore rules for `.env` files, dependencies, and build output. Setup left the app code and dependency versions as recovered.
- The crew form passed browser checks. The approved offline browser test confirmed one crew submission in the supervisor dashboard and usage history, plus the below-PAR calculation and reorder filter. Supabase confirmed restoration completed, and the local app received HTTP 200 for all four live startup reads. The live supervisor view still needs the owner's app sign-in. Build passed. ESLint reports eight pre-existing errors. [Supabase project dashboard](https://supabase.com/dashboard/project/tbybflqfgixarvkxhndk) · [Live read-only test log](C:/Users/mathi/Projects/_recovery/restock/browser-live-read-only.log)
- Supervisor code (Nov 18, 2026): the old hardcoded code is removed from `src/App.jsx` locally. It stays in the public Git history and in the currently deployed JavaScript until the push. Once the migration is live, the old code unlocks nothing. Scrubbing the history isn't needed unless the same value is used somewhere else, in which case change it there. Making the repository private is optional and the owner's call. Never put the value in notes, logs, captures, messages, or new commits.

## Checks to preserve

- [x] Crew view opens and shows the date, station, category, item, and Submit controls. Choosing a category populates item choices. Leave Submit untouched during production-backed checks.
- [x] The crew view shows the Supervisor Login control.
- [ ] After rollout, the owner signs in on the live site. Inspect Restock Dashboard, history, and bulk inventory using read-only checks.
- [ ] After the migration, confirm that a signed-out request gets no rows from any table, and that the crew form can still submit.
- [x] Offline fixture: the crew view makes no reads, a wrong password is rejected, a supervisor sign-in loads the data, and signing out returns to the crew view.
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
