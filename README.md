# Kyvo

Never get declined again. Kyvo watches every dollar subscription, trial and saved card from your inbox, learns how each one really bills, and tells you exactly what to fund, in your own currency, before the charge hits.

Built for the Total Recall hackathon (Walrus x Tatum), Consumer Finance track.

**Try it:** https://kyvo-five.vercel.app opens a read-only demo account built from real billing history. No sign-in needed.

## What it does
- **Reads billing emails** from Gmail and turns them into events: charges, declines, refunds, trials, usage bills.
- **Remembers on Walrus.** Every event is a memory on Walrus mainnet. Postgres is only a cache: the Total Recall button wipes it and rebuilds everything from Walrus.
- **Forecasts what to fund,** with the date, the amount and the local-currency total, and shows the records behind every number under "Why?".
- **Shows that memory helps.** The forecast-error chart replays your history month by month, using only what was known at the time. Those months are always labelled hindcast. "Ignore memory" shows what a blank forecast would have said.
- **Warns you** on Telegram before a charge is likely to fail, using the rules of your card provider where they could be confirmed.
- **Tracks the rest:** trials, which services hold which card, price rises, and things you said you'd cancel.
- **Family plans:** members pay your vault in USDC on Sui. Kyvo confirms each payment on-chain through Tatum and remembers who pays late. It only reads the vault. It holds no keys and can't move money.
- **Dollar Wrapped:** a monthly report led by forecast accuracy, with a shareable link and image that leave out what you spent money on.

## How it's built
Next.js on Vercel, Neon Postgres as a rebuildable cache, [Walrus Memory](https://github.com/MystenLabs/memwal) for memories, Tatum for Sui data and exchange rates, Groq for email extraction, grammY for Telegram. All Walrus and Tatum calls run on the server.

- [Architecture](docs/architecture.md): what Kyvo does and how it's designed
- [Build plan](docs/PLAN.md) and [progress log](docs/Progress.md): the build, day by day
- [Blog draft](docs/BLOG.md) and [demo script](docs/DEMO.md)

## Run it yourself
You need Node 22.23.4 or newer, pnpm, and accounts with Walrus Memory, Tatum, Neon, Google Cloud, Groq and Telegram.

```bash
pnpm install
```

```bash
cp .env.example .env.local
```

Fill in `.env.local`. Then:

```bash
pnpm db:migrate
```

```bash
pnpm dev
```

Other useful commands:

```bash
pnpm test
```

```bash
pnpm probe:memwal
```

```bash
pnpm probe:tatum
```

`NS_SALT` must never change after your first memory is written, because every namespace derives from it. Back it up.

To see a demo account locally, copy `scripts/seed-data.example.json` to `scripts/seed-data.local.json`, fill it in, and run `scripts/seed-demo.ts`. Git ignores the local file.

## Honest limits
- **Gmail sign-in is limited to approved testers.** The app is in Google's Testing mode, which allows up to 100 listed test users and signs people out after about 7 days. Everyone else gets the read-only demo.
- **The operator owns the memories.** Kyvo uses the multi-tenant pattern Walrus documents: one operator account and one namespace per user. A user can't yet take their memories to another operator. A user-owned account with Kyvo as a delegate is future work.
- **The Walrus relayer sees plaintext** when it processes a memory. Blobs on public Walrus are SEAL-encrypted (checked by downloading a raw blob), but this is not end-to-end encryption.
- **Billing text goes to Groq** for extraction, with Zero Data Retention turned on. Raw email is never stored or logged by Kyvo.
- **Local amounts are approximate.** They use the market USDC rate from Tatum and show "≈", because card providers charge their own rate. A provider's real markup is not applied yet.
- **Hindcast is not live data.** The hackathon lasted days, not months, so the accuracy history is a replay of real emails. It's labelled as such everywhere, including on shared reports.
- **Forecasts are only as good as the emails.** A bank that sends no receipt leaves no record, and Kyvo won't guess one.
- **Card balances are typed in by hand,** because card providers have no API. Kyvo can't see them.
- **Provider rules may go out of date.** Sources and the date checked are below. Anything that couldn't be confirmed is left blank in the app.
- **Free-plan limits apply:** writes to Walrus are paced at 20 a minute across all users, the Groq free plan limits how many emails can be read per day, and Vercel Hobby runs the daily job once a day, give or take an hour.

## Provider fee sources
Checked Nov 5, 2026. Providers change their terms, and some of their own pages disagree. Anything that couldn't be confirmed is left blank in the app, not guessed.

- **Chipper:** [decline fee](https://support.chippercash.com/en/articles/7854286-why-was-i-charged-a-fee-for-my-chipper-card-transaction-that-failed-declined-due-to-insufficient-funds), [card fees](https://support.chippercash.com/en/articles/10655252-update-to-chipper-usd-card-fees)
- **Eversend:** [card fees](https://help.eversend.co/en/articles/8185032-eversend-virtual-card-fees), [card deletion](https://help.eversend.co/en/articles/10051126-reasons-your-card-may-be-deleted)
- **Grey:** [declines](https://support.grey.co/en/articles/7893790-why-is-my-card-declining), [card guide](https://grey.co/blog/your-comprehensive-guide-to-greys-virtual-card-answers-to-common-questions)
- **Raenest:** [card charges](https://help.raenest.com/en/articles/6391318-virtual-card-charges-on-raenest)
- **Cleva:** [card pricing](https://www.getcleva.com/pricing/cards), [Classic card](https://help.getcleva.com/en/articles/15113175-the-cleva-card-classic-usd-card)
- **Bybit:** [fees and limits](https://www.bybit.com/en/help-center/article/Fees-and-Spending-Limits-Bybit-Card)
- **Zenith Bank:** no current Nigerian fee schedule found. [A 2022 report on limits](https://www.thecable.ng/?p=672727) is not applied.
- **walllet:** no public fee schedule found.

## License
[MIT](LICENSE)
