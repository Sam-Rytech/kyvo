# Kyvo: Progress

**Submission deadline:** Mon Nov 10, 2026, **17:00 UTC (18:00 Lagos)**. Internal deadline: submit by **Nov 10, 12:00 UTC**.
**Rule:** each day ends with a **hard gate**. If a gate fails, fix it before starting the next day's work. Moving a feature down the list is allowed; skipping a gate is not.

Status key: `[ ]` todo · `[~]` in progress · `[x]` done · `[-]` cut

---

## Day 0 (Wed Nov 4, tonight): accounts and keys
- [x] Tatum account → API key + **dashboard account ID** (needed for the form)
- [x] Walrus Memory dashboard (memory.walrus.xyz) → **mainnet** account. Record the account object ID, delegate private key and delegate **public** key (`MEMWAL_AGENT_ID`, 64 hex)
- [~] Sui wallet (Slush) with a little SUI and ≥ 1 USDC on mainnet (the vault, plus test family payments): wallet exists; 0 USDC and 0 SUI on mainnet as of Nov 5, funds needed before Day 4
- [x] Google Cloud project `kyvo-513800` → OAuth consent screen in **Testing** mode, scope `gmail.readonly`, owner added as test user. Add 2–3 friends by Day 5; add redirect URIs on Day 2
- [x] Telegram bot via @BotFather: @Kyvoalert_bot
- [x] LLM API key: Groq free plan, key tested. Zero Data Retention to be turned on by the owner
- [x] Neon Postgres database: project `kyvo`, connection tested
- [ ] Join the Walrus and Tatum Discords. **Ask whether the Agent Payments prize exists** (the rules list a Mystery Bounty instead)
- [x] GitHub repo `kyvo` (public, MIT): https://github.com/Sam-Rytech/kyvo
- [x] Node upgraded to 22.23.4; `.env.example` and `.env.local` created; `TOKEN_ENC_KEY`, `NS_SALT`, `CRON_SECRET` generated. **Back up `NS_SALT` in a password manager**

**Gate 0:** every key is in `.env.local` and `node -v` is ≥ 22.23.4. **Passed Nov 5.** Tatum, Neon, Telegram and Groq tested live; Walrus and Google values format-checked only.

---

## Day 1 (Thu Nov 5): foundations and proof that it works
- [x] **AI Builder:** prompt ai.tatum.io for the Kyvo dashboard shell. Export it, commit, tag `ai-builder-v0`, and save the prompt in `docs/ai-builder/prompt.md`
- [x] Next.js + Tailwind + Drizzle scaffold on top of the AI Builder UI; deploy to Vercel: https://kyvo-five.vercel.app
- [x] `scripts/probe-memwal.ts`: `health()` → `remember` → wait for `blob_id` → `recall` from a second process. Passed on mainnet. Blobs on public Walrus are encrypted (raw blob checked)
- [x] `scripts/probe-tatum.ts`: GraphQL vault USDC balance; FX `USDC→NGN`; one transaction looked up by digest. Rate endpoint confirmed. OHLCV path found, parameters to finish when the FX history alert is built
- [x] `lib/memory`: client, envelope encode/decode, namespace helper, outbox table plus drainer (paced, `rememberBulk`, idempotency, job polling). Tested live end to end on mainnet
- [x] Seed **≥ 12 real memories on mainnet** from your own real subscriptions (profile, 4 merchants, 2 cards, 1 promise, 1 trial): 15 stored under the demo account, from real Gmail receipts. 3 merchants, because no fourth dollar subscription exists

**Gate 1 (hard):** ≥ 10 memories on mainnet with `blob_id`s · Tatum balance and FX calls return real data · the app is deployed. *If Walrus is down, keep coding against `MemWalMock` and retry the writes every few hours.* **Passed Nov 5:** relayer lists 15 demo memories, all 15 recalled and decoded with matching blob IDs, raw blob unreadable on public Walrus, Tatum balance and FX real, site live.

---

## Day 2 (Fri Nov 6): inbox to memory
- [x] Google OAuth sign-in; encrypted refresh-token storage
- [x] Gmail scanner: query builder, pagination, `seen_messages` dedupe, 12-month backfill. 91 real emails read, 23 memories stored
- [~] LLM extractor with Zod schemas for all 8 event kinds, including `refund`; confidence threshold; unit tests on 15 real (redacted) emails. All 15 extract correctly; waiting on the owner's review before the redacted emails are committed
- [-] Forwarding fallback endpoint: moved to the top of the cut order; build only if Gmail OAuth fails
- [x] Rebuild path: `listNamespaces` → recall → decode → cache. Wire up the **Total Recall** button

**Gate 2:** connecting your own Gmail populates the subscriptions list automatically, and every item has a blob ID. Wiping the database and pressing Total Recall restores the same list. **Passed Nov 5:** after wiping the cache, outbox and dedupe rows, the real button restored 23 records, with events and list byte-identical to a snapshot. A repeat scan wrote no duplicates.

---

## Day 3 (Sat Nov 7): the engines (where the learning lives)
- [ ] `config/providers.ts` rules table (re-verify fees from the sources in the README). Add **Zenith Bank** and **Bybit**, the owner's real cards
- [ ] Forecast engine: date, amount, card fee, local-currency total; write `forecast` events
- [ ] Forecast scoring: `forecast_result` events; error-per-month chart; the "Ignore memory" toggle
- [ ] Decline guard plus provider-specific warnings
- [ ] Trial tracker; card-on-file registry; usage-billed detection; price-hike detector; promises
- [ ] "Why?" panel citing blob IDs for every number

**Gate 3:** the dashboard shows the next funding amount in NGN with a "Why?" panel. The forecast-error chart shows at least 2 months of real data, replayed from your history and labelled hindcast. The "Ignore memory" toggle visibly changes the answer.

---

## Day 4 (Sun Nov 8): Sui and notifications
- [ ] Wallet connect (dapp-kit); vault balance and months-of-runway card
- [ ] Family plan: create a plan, add members' Sui addresses, Tatum GraphQL payment matcher, lateness memory
- [ ] **Real test:** 2 friends (or 2 of your own wallets) send ≥ 0.01 USDC each → auto-marked paid
- [ ] Telegram bot: `/start` linking, daily digest, decline-guard alerts, trial alerts
- [ ] Vercel Cron: daily scan → engines → notify. Confirm Vercel's cron and function limits first (not yet checked)
- [ ] `/status` page (timings for Tatum, Walrus and Gmail) and `/proof` page (memory count, blob links, Sui transaction links)

**Gate 4:** a real USDC payment on Sui mainnet is verified through Tatum and shows as paid, with a memory written. A Telegram alert fires from the cron.

---

## Day 5 (Mon Nov 9): polish and the shareable part
- [ ] Dollar Wrapped monthly report page (shareable image and link)
- [ ] Currency picker (NGN, GHS, KES, EGP, USD) to show global scope
- [ ] Error, empty and loading states; mobile layout; a demo account seeded from your real data
- [ ] Get 2–3 friends to connect Gmail (real usage evidence for the blog)
- [ ] README: setup, architecture link, provider-fee sources, honest limits
- [ ] Stretch, only if all gates are green: read-only MCP endpoint

**Gate 5:** a stranger can open the live URL, use the demo account, and understand the product in 30 seconds. The repo has no secrets (run a secret scan).

---

## Day 6 (Tue Nov 10): ship, finished by 12:00 UTC
- [ ] **Morning:** re-connect Gmail (testing-mode logins expire after about 7 days); refresh data
- [ ] Record the 2:30 demo (script: `docs/DEMO.md`) and upload to YouTube (unlisted is fine)
- [ ] Publish the blog on dev.to: what it does, Tatum + Walrus, **how it learned** (chart + numbers), what went wrong, limits
- [ ] Post on X and LinkedIn tagging @Tatum_io and @WalrusFoundation (bonus points)
- [ ] Final proof check: memory count ≥ 10, `MEMWAL_AGENT_ID` matches, account object visible on Suiscan
- [ ] **Submit the form** at recall-tatum-walrus.vercel.app: email, Discord, LinkedIn, Tatum ID, SUI address, Account ID, `MEMWAL_AGENT_ID`, description, video, repo, both feedback answers

**Gate 6:** form submitted before 12:00 UTC. Screenshot the confirmation.

---

## Cut order (if behind schedule, cut from the top)
1. Forwarding fallback endpoint
2. MCP endpoint
3. Outlook support
4. Dollar Wrapped image export (keep the page)
5. FX history alert
6. Usage-billed detection (fold into ordinary charges)

**Never cut:** inbox auto-scan, forecast + scoring chart, decline guard, a real Sui payment verified via Tatum, ≥ 10 mainnet memories, demo video, blog.

---

## Log
| Date | What happened | Blockers |
|---|---|---|
| Nov 4 | Idea locked: Kyvo (global, inbox auto-scan). Architecture and plan written. | — |
| Nov 4 | Full build plan approved (`docs/PLAN.md`). Local repo set up, five open decisions recorded in the docs. Gate 0 not passed yet: external accounts and keys are still to do. | Accounts and keys |
| Nov 5 | GitHub repo created and pushed. First Neon sign-in timed out at its 60-second limit; database not created yet. Gate 0 still open. | Accounts and keys; Neon sign-in |
| Nov 5 | Neon, Google Cloud, Telegram and Groq set up. LLM switched to Groq to keep costs at zero. **Gate 0 passed.** Day 1 started. | Vault wallet has 0 USDC and 0 SUI; needs funds before Day 4. Discord question on the Agent Payments prize still open |
| Nov 5 | Day 1: AI Builder export merged and tagged, UI ported to Next.js and live at kyvo-five.vercel.app. Probes pass on mainnet; drainer tested live; 28 unit tests pass. Gate 1 not passed yet: 12 real memories still to seed. | Owner's real subscription details for the seed |
| Nov 5 | 15 real memories seeded from the owner's Gmail receipts, including 2 real Claude Pro declines. Real data exposed a missing `refund` event kind, now added. **Gate 1 passed.** | Vault wallet still empty; Discord question open |
| Nov 5 | Day 2: first real Gmail scan, 91 emails. Real data exposed wallet alerts read as subscriptions, double-counted declines and charges, false price hikes, and senders with stub plain-text parts: all fixed. 3 naira memories remain on Walrus, hidden by the view. **Gate 2 passed.** Emails read before the stub fix aren't re-read. | Owner to confirm card providers and review the 15 fixtures |
