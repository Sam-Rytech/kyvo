# Kyvo: Progress

**Submission deadline:** Mon Nov 10, 2026, **17:00 UTC (18:00 Lagos)**. Internal deadline: submit by **Nov 10, 12:00 UTC**.
**Rule:** each day ends with a **hard gate**. If a gate fails, fix it before starting the next day's work. Moving a feature down the list is allowed; skipping a gate is not.

Status key: `[ ]` todo · `[~]` in progress · `[x]` done · `[-]` cut

---

## Day 0 (Wed Nov 4, tonight): accounts and keys
- [ ] Tatum account → API key + **dashboard account ID** (needed for the form)
- [ ] Walrus Memory dashboard (memory.walrus.xyz) → **mainnet** account. Record the account object ID, delegate private key and delegate **public** key (`MEMWAL_AGENT_ID`, 64 hex)
- [ ] Sui wallet (Slush) with a little SUI and ≥ 1 USDC on mainnet (the vault, plus test family payments)
- [ ] Google Cloud project → OAuth consent screen in **Testing** mode, scope `gmail.readonly`, add yourself and 2–3 friends as test users
- [ ] Telegram bot via @BotFather
- [ ] LLM API key; Neon Postgres database
- [ ] Join the Walrus and Tatum Discords. **Ask whether the Agent Payments prize exists** (the rules list a Mystery Bounty instead)
- [x] GitHub repo `kyvo` (public, MIT): https://github.com/Sam-Rytech/kyvo
- [x] Node upgraded to 22.23.4; `.env.example` and `.env.local` created; `TOKEN_ENC_KEY`, `NS_SALT`, `CRON_SECRET` generated. **Back up `NS_SALT` in a password manager**

**Gate 0:** every key is in `.env.local` and `node -v` is ≥ 22.23.4.

---

## Day 1 (Thu Nov 5): foundations and proof that it works
- [ ] **AI Builder:** prompt ai.tatum.io for the Kyvo dashboard shell. Export it, commit, tag `ai-builder-v0`, and save the prompt in `docs/ai-builder/prompt.md`
- [ ] Next.js + Tailwind + Drizzle scaffold on top of the AI Builder UI; deploy to Vercel
- [ ] `scripts/probe-memwal.ts`: `health()` → `remember` → wait for `blob_id` → `recall` from a second process. **Confirm whether memory content is encrypted on Walrus before seeding real data; if it's public, stop and decide**
- [ ] `scripts/probe-tatum.ts`: GraphQL vault USDC balance; FX `USDC→NGN`; one transaction looked up by digest. **Confirm the parameters of the rate and OHLCV endpoints**
- [ ] `lib/memory`: client, envelope encode/decode, namespace helper, outbox table plus drainer (paced, `rememberBulk`, idempotency, job polling)
- [ ] Seed **≥ 12 real memories on mainnet** from your own real subscriptions (profile, 4 merchants, 2 cards, 1 promise, 1 trial)

**Gate 1 (hard):** ≥ 10 memories on mainnet with `blob_id`s · Tatum balance and FX calls return real data · the app is deployed. *If Walrus is down, keep coding against `MemWalMock` and retry the writes every few hours.*

---

## Day 2 (Fri Nov 6): inbox to memory
- [ ] Google OAuth sign-in; encrypted refresh-token storage
- [ ] Gmail scanner: query builder, pagination, `seen_messages` dedupe, 12-month backfill
- [ ] LLM extractor with Zod schemas for all 7 event kinds; confidence threshold; unit tests on 15 real (redacted) emails
- [-] Forwarding fallback endpoint: moved to the top of the cut order; build only if Gmail OAuth fails
- [ ] Rebuild path: `listNamespaces` → recall → decode → cache. Wire up the **Total Recall** button

**Gate 2:** connecting your own Gmail populates the subscriptions list automatically, and every item has a blob ID. Wiping the database and pressing Total Recall restores the same list.

---

## Day 3 (Sat Nov 7): the engines (where the learning lives)
- [ ] `config/providers.ts` rules table (re-verify fees from the sources in the README)
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
- [ ] Vercel Cron: daily scan → engines → notify
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
