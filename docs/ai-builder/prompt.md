# Tatum AI Builder prompt

Used at ai.tatum.io to generate the Kyvo dashboard shell. The untouched export is committed and tagged `ai-builder-v0`.

---

Build the front-end shell for **Kyvo**, a web app for people outside the US who pay dollar subscriptions (Netflix, Spotify, ChatGPT, AWS) from a non-dollar currency using pre-funded virtual cards. A declined charge can cost them a fee or even their card. Kyvo reads their billing emails, learns how each subscription really bills, and tells them exactly how much to fund, and by when, before the charge hits.

**Tech:** Next.js App Router, TypeScript, Tailwind CSS. No backend, no wallet connection and no API calls yet. Put all placeholder data in one file, `lib/placeholder.ts`, so it can be replaced with real data later. Show a small "Sample data" label on every page.

**Pages**, with a shared navigation (sidebar on desktop, bottom bar on mobile):

1. **Dashboard** (`/`). The hero is one sentence: "Fund $61.40 by Friday (≈ ₦X)", with a "Why?" link beside it. Below it: charges due in the next 7 days with amount and date; a warning card such as "Netflix is due in 2 days and your card is $4.10 short"; a "Forecast accuracy" line chart of error in dollars per month, with an "Ignore memory" toggle; a USDC vault card with balance and months of runway.
2. **Subscriptions** (`/subscriptions`). A list with merchant, amount, next charge date, which card pays it, and a price-change badge such as "$15.49 → $17.99".
3. **Trials** (`/trials`). Each trial with what it converts to, a countdown, and the reason the user started it.
4. **Cards** (`/cards`). Each card with its provider, the services holding it, and a "stale, unused since August" badge. Include a headline such as "6 services hold Card A".
5. **Family** (`/family`). Shared plans with members, each member's share, paid or late status, and lateness history such as "paid 2 days late last time".
6. **Wrapped** (`/wrapped`). A shareable monthly report card. Its headline number is forecast accuracy.
7. **Status** (`/status`). A table of external services with their last response time.
8. **Proof** (`/proof`). Memory count, a list of stored record IDs, and a list of blockchain transaction links.

Also include a **"Why?" side panel** that opens from any number and lists the past records that number came from. Add a **"Total Recall" button** in the navigation with a confirmation step and a progress state.

**Design:** this is a calm personal-finance tool for someone worried about a declined card, not a crypto trading dashboard. Avoid neon, gradients and glowing dark themes. Use a warm off-white background, deep ink text and one confident accent colour, with amber for warnings and red only for real risk. Use large, tabular numerals for money, and keep each page focused on one clear next action. Show dollar amounts first, with local currency in a lighter weight marked "≈". Support dark mode through CSS variables. It must work well on a phone, because most users will open it from a Telegram alert.

Include clear empty, loading and error states on every page.
