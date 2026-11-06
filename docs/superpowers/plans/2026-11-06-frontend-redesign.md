# Frontend Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild Kyvo's frontend as the Due Date look with the Funding Slip, without changing engines or API routes.

**Architecture:** Override Tatum's token values so existing class names take the new look. Rewrite the shell, Today page and Why panel. Restyle other pages, and merge Cards into Subscriptions, and Status and Total Recall into How it's verified.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind 3.4, next/font, Vitest.

**Spec:** `docs/superpowers/specs/2026-11-06-frontend-redesign-design.md`

## Global Constraints
- Work on the `redesign` branch. Pushing `main` deploys to the live site.
- Hindcast stays labelled on replayed numbers, and local amounts keep "≈".
- Outages are stated plainly. Why? stays on every number.
- Signed-out visitors can never write.
- Status always appears in words as well as colour.
- 12px is the floor for readable text.

---

### Task 1: Funding status rule
**Files:** Create `lib/engines/funding-status.ts`, `tests/funding-status.test.ts`.
**Produces:** `fundingStatus(funding, alerts): 'covered' | 'soon' | 'risk'`, and `fundingHeadline({ funding, status, rate, currency, asOf }): string`.

- [ ] Write failing tests for each status, the boundaries, and each headline form
- [ ] Run them and see them fail
- [ ] Implement
- [ ] Run them and see them pass
- [ ] Commit

### Task 2: Look and shell
**Files:** `app/globals.css`, `app/layout.tsx`, `tailwind.config.cjs`, `design-tokens/tokens.css`, `components/app-shell.tsx`. Create `components/total-recall.tsx`, `components/connect-gmail.tsx`.

- [ ] Add fonts through next/font with latin-ext for ₦
- [ ] Override token values, and delete the dark palette
- [ ] Rewrite the shell: five menu items, footer, account links, Connect step
- [ ] Typecheck and commit

### Task 3: Today page and slip
**Files:** `components/dashboard-view.tsx`, `components/why-panel.tsx`, `components/vault-card.tsx`, `app/page.tsx`. Delete `components/landing.tsx`.

- [ ] Rewrite the Why panel as the slip
- [ ] Rewrite Today: band, Coming up, paired chart, vault
- [ ] Hide the vault address when read-only
- [ ] Typecheck and commit

### Task 4: Other pages
**Files:** `app/subscriptions/page.tsx`, `components/subscriptions-view.tsx`, `components/cards-view.tsx`, `app/cards/page.tsx`, `app/proof/page.tsx`, `app/status/page.tsx`, `components/trials-view.tsx`, `components/family-view.tsx`, `components/wrapped-view.tsx`, `app/wrapped/share/[code]/opengraph-image.tsx`, `components/settings-form.tsx`, `app/onboarding/*`, `app/not-found.tsx`.

- [ ] Fold Cards into Subscriptions, with `/cards` redirecting
- [ ] Fold Status and Total Recall into `/proof`, with `/status` redirecting
- [ ] Remove unconfirmed-fee paragraphs and per-row Walrus records
- [ ] Flatten panels and restyle headings on the remaining pages
- [ ] Typecheck, test and commit

### Task 5: Demo and docs
**Files:** Create `scripts/rename-demo-plan.ts`. Modify `docs/architecture.md`, `docs/DEMO.md`, `README.md`, `docs/Progress.md`.

- [ ] Write the rename script. Run it only when going live, because it writes a permanent memory
- [ ] Update docs
- [ ] Commit

### Task 6: Verify
- [ ] Production build
- [ ] Check every page at desktop and phone width, signed out
- [ ] Measure contrast on all three bands
- [ ] Check the slip by keyboard
- [ ] Push the branch for a Vercel preview, and check signed-in views there
- [ ] Ask the owner before merging to `main`
