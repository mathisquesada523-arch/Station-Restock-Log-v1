# Station Restock Log

Working folder `C:\Users\mathi\Projects\restock-app`. The crew view records supplies taken from a station. The supervisor view shows restock logs and bulk inventory, including items below PAR (the target stock level).

## Start locally

Double-click `start.bat`. It installs the locked dependencies if needed, starts Vite, and opens [the local app](http://127.0.0.1:5173/). Keep the terminal window open while using it. If the server is already running, use the local link directly. From a terminal, run `npm.cmd ci` to install dependencies and then `npm.cmd run dev -- --host 127.0.0.1 --port 5173 --strictPort`. Run `npm.cmd run build` to check the production build.

## Recovery and services

- GitHub source verified at recovery point `7a7fe1e`. The two GitHub branches pointed to this same commit. [Station-Restock-Log-v1](https://github.com/mathisquesada523-arch/Station-Restock-Log-v1)
- Netlify site verified. The locally built JavaScript and CSS matched the published files byte for byte. [Deployed Restock app](https://stationrestocklogv1.netlify.app/)
- Supabase project reference verified against the source and deployed app. The owner resumed the project and the signed-in Project Overview confirmed restoration completed. The local app then received HTTP 200 for supply logs, inventory items, current counts, and inventory movements. [Supabase project dashboard](https://supabase.com/dashboard/project/tbybflqfgixarvkxhndk) · [Live read-only test log](C:/Users/mathi/Projects/_recovery/restock/browser-live-read-only.log)
- The crew form and supervisor login controls rendered. Changing the category populated item options. The offline test passed for the crew submission, supervisor dashboard, usage history, and below-PAR display. Verifying the signed-in supervisor view with live data still needs the owner's app sign-in. The production build passed, and ESLint reported eight errors already present in the recovered code.
- Supervisors sign in with a Supabase Auth email and password. The old hardcoded code is gone from the source, but it's still in the public Git history and the currently deployed site until the next push. The database lockdown is in `supabase/migrations/` and isn't applied to the live project yet. See the rollout steps in `AGENTS.md`. The old code's value belongs outside notes, screenshots, and new commits. The normal launcher uses production Supabase. Keep tests there read-only and use the offline harness for sample submissions.

## Run the approved offline browser test

With this app’s dependencies installed, use PowerShell to run the recovery harness. It starts its own loopback server, verifies its external request block, and uses a mocked Supabase sign-in with a synthetic supervisor account and disposable in-memory data.

```powershell
node.exe 'C:\Users\mathi\Projects\_recovery\restock\browser-offline-fixture.mjs'
```

The test checks that the crew view makes no reads, a wrong password is rejected, and signing out works. It then checks one crew submission in the supervisor dashboard and Usage History, then verifies the reorder quantity and filter using separate bulk inventory data. [Verified run log](C:/Users/mathi/Projects/_recovery/restock/browser-offline-fixture.log)

## Team workflow (Claude Code + Codex)

Open this folder in **Claude Code** (Claude desktop app → **Code** → **Local** → **Open folder…**, Worktree off). Claude leads. When you want a second opinion or need to hand off a task, use the Codex plugin from the same Claude Code session. One-time setup per PC: install the [official Codex plugin](https://github.com/openai/codex-plugin-cc#install) (`claude plugin marketplace add openai/codex-plugin-cc`, then `claude plugin install codex@openai-codex`). If Claude Code was already open, run `/reload-plugins`, then run `/codex:setup`.

- `/codex:review`: Codex reviews uncommitted changes (read-only). For committed work, add `--base <commit-before-the-work>`.
- `/codex:rescue`: Codex takes over a task, such as a stuck bug.

Rules: only one agent edits at a time, everything is committed before each handoff, and every commit message starts with `[Claude]` or `[Codex]`. See `AGENTS.md` for the full rules and the current **Next step**.

To see what changed since a known commit (replace `BEFORE` with the commit ID):

```powershell
git log --oneline BEFORE..HEAD
git diff BEFORE HEAD
```
