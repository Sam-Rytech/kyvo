# Kyvo

Never get declined again. Kyvo watches every dollar subscription, trial and saved card from your inbox, learns how each one really bills, and tells you exactly what to fund, in your own currency, before the charge hits. Your dollars live as USDC on Sui. Everything Kyvo learns lives in Walrus Memory.

Built for the Total Recall hackathon (Walrus x Tatum), Consumer Finance track.

**Status:** in development. There's no app to run yet.

## Docs
- [Architecture](docs/architecture.md): what Kyvo does and how it's designed
- [Build plan](docs/PLAN.md): the build order, day by day
- [Progress](docs/Progress.md): daily checklist, gates and log

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

## Requirements
Node 22.23.4 or newer. Copy `.env.example` to `.env.local` and fill it in.

## License
[MIT](LICENSE)
