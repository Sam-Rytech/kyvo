# Kyvo: full build plan (Day 0 to submission)

## Context
Kyvo is our Total Recall hackathon entry. It watches dollar subscriptions from the inbox, learns how each one bills, and says what to fund before a charge hits. The folder has two docs and no code. The deadline is **Nov 10, 17:00 UTC**, with an internal target of **Nov 10, 12:00 UTC**.

This plan follows the days and gates in `Progress.md` and the design in `architecture.md`. It adds the build order, who does what, and five decisions the docs leave open. It doesn't replace either doc.

## How we use the docs while building
- **Before each task, read the sections listed under "Read first".** The docs win over memory or assumption.
- **Add a project `CLAUDE.md` on Day 0** pointing to both docs and these rules, so every later session starts from them.
- **If the design has to change, update `architecture.md` in the same commit.** The docs must never drift from the code.
- **Keep `Progress.md` live:** mark `[~]` when starting, `[x]` when done, `[-]` when cut, and add a log row at each day's end, including blockers.
- **Gates are hard.** Features can move down the list, but a failed gate gets fixed before the next day starts. Cuts follow the cut order, and the "Never cut" list stays.
- **Commit as we go** to `main`, and never fake a result. If Tatum or Walrus is down, the UI says so.

## Decisions the docs leave open
Each one gets written into the docs on Day 0.

| # | Issue | Decision |
|---|---|---|
| 1 | Gate 3 needs 2 months of forecast data, but we have 6 days | Replay email history in date order, forecasting each month only from earlier charges. Mark these `"src":"hindcast"` and new ones `"src":"live"`, and label them that way in the chart, demo and blog. |
| 2 | The ~24 writes/min cap is per **account**, and all users share one account. Backfills can also outrun serverless time limits | Make scan and drain resumable: each call does one batch, saves a cursor and returns. The onboarding page keeps calling until done, showing "syncing to Walrus". A Postgres lock stops concurrent requests from exceeding the cap. |
| 3 | Tatum's USDC→NGN rate isn't what card providers charge | Show local amounts as "≈" and add a per-provider funding markup. On Day 3, set the default by comparing one of your real top-ups with Tatum's rate. |
| 4 | Forwarding fallback is on Day 2, but nothing defines how inbound mail arrives | Move it to the top of the cut order. Build it only if Gmail OAuth fails. |
| 5 | Docs are at the root, but §11 puts them in `docs/` | Move them to `docs/` on Day 0. |

**Two more safeguards:**
- **Privacy check before writing real data:** `architecture.md` doesn't say whether memory content is encrypted on Walrus. Confirm this during the Day 1 probe, **before seeding real financial facts**. If it's public, stop and decide together.
- **Rebuild must fail loudly:** if a namespace returns exactly the recall cap, Total Recall reports an error instead of silently dropping records.

---

## Day 0 (Wed Nov 4): accounts, keys, repo
**Read first:** Progress Day 0; architecture §9, §12, §13.

**Claude:**
- Upgrade Node from v22.18.0 to ≥ 22.23.4 with winget (Windows may show an admin prompt).
- `git init`; write `.gitignore` before anything else; add MIT `LICENSE`, short `README.md`, `CLAUDE.md`.
- Move the docs to `docs/` and record the five decisions.
- Write `.env.example` and `.env.local`; generate `TOKEN_ENC_KEY`, `NS_SALT`, `CRON_SECRET` directly into `.env.local` without printing them.
- Create public repo `Sam-Rytech/kyvo` and push. **Approving this plan approves making the repo public.**

**You** (paste values into `.env.local` yourself, never into chat):

| Where | What to do | Goes in |
|---|---|---|
| Slush wallet (do first, may take longest) | Get a little SUI and ≥ 1 USDC on **mainnet** | Vault address, saved for the form |
| memory.walrus.xyz | **Mainnet** account | `MEMWAL_ACCOUNT_ID` (object ID, not wallet address), `MEMWAL_KEY`, `MEMWAL_AGENT_ID` |
| Tatum | Account and API key | `TATUM_API_KEY`; save the dashboard account ID for the form |
| Google Cloud | Enable Gmail API, Testing mode, `gmail.readonly`, add test users, create OAuth client | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` |
| @BotFather | Create bot | `TELEGRAM_BOT_TOKEN` |
| Anthropic Console | API key (Claude Haiku, `claude-haiku-5-5`, one of the options in §4) | `LLM_API_KEY` |
| Neon | Create database | `DATABASE_URL` |
| Discords | Join both; ask whether the Agent Payments prize exists | Progress log |

**Back up `NS_SALT` in a password manager.** Namespaces derive from it, so losing it cuts users off from their memories and breaks Total Recall.

**Gate 0:** `node -v` ≥ 22.23.4 in a fresh shell; a names-only check finds no blank variables; `git check-ignore .env.local` passes.

---

## Day 1 (Thu Nov 5): foundations and proof
**Read first:** Progress Day 1; architecture §3, §4, §5.3, §6, §8, §11, §13.

1. **AI Builder.** Claude drafts `docs/ai-builder/prompt.md`. **You** run it at ai.tatum.io and export. Claude commits the untouched export and tags `ai-builder-v0`.
2. **Scaffold.** Next.js, Tailwind and Drizzle on top of the export. Schema: `users`, `tokens`, `outbox`, `cache_*`, `seen_messages`, plus scan cursors (decision 2). Deploy to Vercel.
3. **Probes.** `scripts/probe-memwal.ts` runs `health` → `remember` → wait for `blob_id` → `recall` from a second process, and answers the privacy check. `scripts/probe-tatum.ts` checks vault USDC balance, USDC→NGN, and one transaction by digest. Also confirm rate and OHLCV parameters, the USDC coin type (§7.5), and Vercel's cron and function limits.
4. **`lib/memory`.** Client, envelope encode/decode, namespaces, paced drainer with `rememberBulk`, idempotency, job polling, and the lock. Unit tests use `MemWalMock`.
5. **`lib/chain`, `lib/fx`.** Tatum clients paced at 3 req/s, with 429 backoff, a credit count, 10-minute FX cache, and a clear 402 state.
6. **Seed ≥ 12 real memories on mainnet.** **You** supply your real subscriptions, cards, one promise and one trial.

**Gate 1:** ≥ 10 mainnet memories with `blob_id`s; real Tatum balance and FX data; app deployed. If Walrus is down, continue on `MemWalMock` and retry every few hours.

---

## Day 2 (Fri Nov 6): inbox to memory
**Read first:** Progress Day 2; architecture §5.1, §5.2, §5.4, §6, §9.

1. Google sign-in with `openid email gmail.readonly`; refresh tokens encrypted with AES-GCM. Add the redirect URIs now that the Vercel URL exists.
2. Onboarding: home currency, card providers.
3. `lib/inbox`: query builder, pagination, hashed message-ID dedupe, resumable 12-month backfill. Raw email is never stored or logged.
4. Extractor: AI SDK with Zod for all 7 event kinds; drop anything under 0.6 confidence. Tests use 15 of your real emails, **redacted by you or with your review before they're committed**.
5. Rebuild: `listNamespaces` → recall with `sort: "recent"` → decode → cache, wired to the **Total Recall** button. Test against the real relayer, because `MemWalMock` lacks `listMemories`.

**Gate 2:** connecting your Gmail fills the subscriptions list, with a blob ID on every item. Wiping the database and pressing Total Recall restores the same list.

---

## Day 3 (Sat Nov 7): engines
**Read first:** Progress Day 3; architecture §6.3, §7.1–7.4.

Engines are pure functions in `lib/engines`, written test-first, because the forecast numbers are the core of the pitch.

1. `config/providers.ts`, with fees re-verified from live sources; sources go in the README.
2. Forecast: date (median interval), amount, card fee, funding needed, local currency with markup. Writes `forecast` events.
3. Scoring: `forecast_result` events, hindcast replay, error-per-month chart, "Ignore memory" toggle.
4. Decline guard with per-provider warnings.
5. Trials, card registry, usage-billed detection, hikes (> 2%), promises.
6. "Why?" panel citing blob IDs for every number.
7. Pages: dashboard, subscriptions, trials, cards.

**Gate 3:** next funding amount in NGN with a "Why?" panel; chart shows ≥ 2 months of real data, labelled hindcast; the toggle visibly changes the answer.

---

## Day 4 (Sun Nov 8): Sui and notifications
**Read first:** Progress Day 4; architecture §7.2, §7.5, §8, §13.

1. Wallet connect with dapp-kit; vault balance and months-of-runway card.
2. Family plans and payment matcher: sender + USDC amount within ±1% + time window, verified through Tatum GraphQL, with lateness remembered.
3. **Real test: you and 2 friends (or 2 of your wallets) send ≥ 0.01 USDC.** Claude can't send funds.
4. Telegram with `grammy`: `/start` linking, daily digest, decline and trial alerts.
5. Vercel Cron: scan → engines → notify, protected by `CRON_SECRET`.
6. `/status` (timings for Tatum, Walrus, Gmail) and `/proof` (memory count, blob and Sui links).

**Gate 4:** a real mainnet USDC payment is verified via Tatum and shows as paid with a memory written. A Telegram alert fires from the cron.

---

## Day 5 (Mon Nov 9): polish
**Read first:** Progress Day 5; architecture §2, §9, §10, §14.

1. Dollar Wrapped page, with forecast accuracy as the headline number, plus a shareable image and link.
2. Currency picker (NGN, GHS, KES, EGP, USD).
3. Error, empty and loading states; mobile layout; demo account seeded from your real data, reviewed by you first, because strangers will see it.
4. **You:** get 2–3 friends to connect Gmail. Claude watches the shared write cap while they do.
5. README: setup, provider-fee sources, honest limits, including the operator-owned memory disclosure (§9).
6. Claude drafts `docs/DEMO.md` (2:30 script, §14) and `docs/BLOG.md`.
7. Run a secret scan over the full git history. Stretch only if all gates are green: read-only MCP endpoint (§10).

**Gate 5:** a stranger understands the product from the live URL and demo account in 30 seconds; the secret scan is clean.

---

## Day 6 (Tue Nov 10): ship by 12:00 UTC
**Read first:** Progress Day 6; architecture §14.

| Who | Task |
|---|---|
| You | Re-connect Gmail (testing-mode logins expire after about 7 days) |
| Claude | Refresh data; run the final proof check (memory count ≥ 10, `MEMWAL_AGENT_ID` matches, account visible on Suiscan) |
| Both | Demo video: you record, or Claude renders a motion-graphics cut from real screenshots; you upload it |
| You | Publish the blog on dev.to with real chart numbers; post on X and LinkedIn tagging @Tatum_io and @WalrusFoundation |
| You | Submit the form at recall-tatum-walrus.vercel.app; Claude prepares every answer for you to paste |

**Gate 6:** form submitted before 12:00 UTC and confirmation screenshotted.

---

## If we fall behind
Cut from the top: forwarding fallback (new, decision 4) → MCP endpoint → Outlook → Wrapped image export → FX history alert → usage-billed detection.

**Never cut:** inbox auto-scan, forecast and scoring chart, decline guard, a real Sui payment verified via Tatum, ≥ 10 mainnet memories, demo video, blog.

## Verification
- Each day ends by running its gate against real services and recording the result in `docs/Progress.md`.
- `pnpm test` (Vitest) must pass before each day's final commit. Coverage: envelope round trips, idempotency keys, namespaces, drainer pacing, extractor fixtures, every engine, payment matching.
- End-to-end before Day 6: wipe the cache, press Total Recall, and confirm the dashboard, chart and "Why?" citations come back identical.
