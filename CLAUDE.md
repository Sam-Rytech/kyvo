# Kyvo

Hackathon build. Deadline Nov 10, 2026, 17:00 UTC; internal target 12:00 UTC.

## Start here
Before any work, read these and find the current day in Progress:
- `docs/Progress.md`: daily checklist, gates, cut order, log
- `docs/PLAN.md`: the build order, who does what, and which sections to read for each day
- `docs/architecture.md`: the design

## Rules
- **Read the "Read first" sections for the current day before each task.** The docs win over memory or assumption.
- **If the design has to change, update `docs/architecture.md` in the same commit.** Docs must not drift from code.
- **Keep `docs/Progress.md` live:** `[~]` when starting, `[x]` when done, `[-]` when cut, and a log row at each day's end, including blockers.
- **Gates are hard.** Features can move down the list, but a failed gate gets fixed before the next day starts. Cuts follow the cut order, and the "Never cut" list stays.
- **Never fake a result.** If Tatum or Walrus is down, the UI says so. Hindcast data is always labelled hindcast.

## Secrets and data
- Secrets live only in `.env.local` and on the server. Never print them, commit them, or prefix them with `NEXT_PUBLIC_`.
- Raw email is never stored or logged. Test fixtures must be redacted and reviewed by the user before they're committed.
- All Walrus and Tatum calls are server-side.
- `NS_SALT` must never change: namespaces derive from it.
