# Kyvo: a subscription tracker that gets better by remembering

*Draft for dev.to. Numbers are from the demo account's real history. Check them against the live app on publish day, and add friends' usage only if it happened.*

If you pay for dollar subscriptions from Nigeria, you probably fund a card by hand. You guess how much to put on it, and when. Guess low and the charge fails. Depending on the card, that can cost a fee, your access, or the card itself.

I built Kyvo for the Total Recall hackathon (Walrus x Tatum) to stop guessing. It reads your billing emails, learns how each subscription really bills, and tells you what to fund, in your own currency, before the charge hits.

Try the read-only demo: https://kyvo-five.vercel.app

## What it does
You connect Gmail once. Kyvo finds your dollar subscriptions, trials, declines and refunds. Then it says something like "Fund $22.58 by 16 Nov, about ₦30,700," and you can open "Why?" to see the exact records behind that number.

It also warns you on Telegram, shows which services hold which card, reminds you of things you said you'd cancel, and checks family-plan payments on Sui.

## How it uses Walrus and Tatum
**Walrus Memory is the source of truth.** Every fact Kyvo learns is written as a memory on mainnet, in namespaces per user and per merchant. Memories are append-only, and the newest event wins. Postgres is only a cache. The Total Recall button wipes that cache and rebuilds everything from Walrus, which is the simplest honest proof that the memory is real.

**Tatum provides the chain and the money.** Kyvo uses Tatum's Sui GraphQL gateway to read vault balances and match family payments, and its rate API for USDC to naira and other currencies. A real 0.01 USDC payment between two of my wallets was detected on mainnet, matched to a plan and saved as a memory.

Kyvo only reads the vault. It holds no keys and can't move money.

## How it learned
The hackathon lasted days, so there are no months of live forecasts to show. Instead Kyvo does a hindcast: it replays real emails in date order and forecasts each month using only what it knew before that month began. Then it scores itself. The same months are scored for a forecast with no memory, which only knows what you pay today.

| Month (hindcast) | Off by, with memory | Off by, without memory |
|---|---|---|
| Aug 2026 | $21.49 | $21.99 |
| Sep 2026 | $0.00 | $6.50 |
| Oct 2026 | $1.50 | $8.00 |

August shows the honest beginning: a new $20 subscription appeared, and no memory could have predicted it. By September it had seen one month and got it exactly right. In October the charge rose from $20.00 to $21.50 once tax was added, so it was off by $1.50, or 93% accurate. After that it knows the new price: the next forecast uses $21.50.

This is a small sample from one person. It shows the mechanism working, not a statistical result.

## What went wrong
Real data was much harder than my tests:

- **Wallet alerts looked like subscriptions.** A card top-up email and a real charge look similar to a model. I had to tell them apart explicitly.
- **One decline became two.** The merchant and the bank both send an email, so one event was counted twice. Tax also caused false "price rise" alerts until I separated the two.
- **Some emails say almost nothing.** Plain-text stubs from payment processors have no useful content, so the extractor needs to read the HTML version.
- **Results depended on row order.** Rebuilding from Walrus returned events in a different order and changed the answers, which is exactly what Total Recall exists to catch.
- **Service limits I didn't expect.** The relayer accepts 20 job IDs per status request. Tatum's gateway now refuses address history queries without a starting checkpoint.
- **I nearly published my own data.** Real card digits got into a commit. I rewrote the history and added a check for it before each commit.

## Limits
- Gmail sign-in is limited to approved testers while the app is in Google's Testing mode. Everyone else gets the demo.
- The operator account owns the memories, the pattern Walrus documents for multi-tenant apps. User-owned memory is future work.
- The relayer sees plaintext when processing a memory. Blobs on Walrus are encrypted, but this is not end-to-end encryption.
- Billing text goes to Groq for extraction, with Zero Data Retention on. Kyvo doesn't store raw email.
- Local amounts are marked "≈". One real Zenith payment showed a markup of about 1.06% over that day's market rate, so Zenith forecasts include it. Other providers use the market rate until a real payment is compared.
- Card provider fees are only stated where a source confirmed them.

The code is at https://github.com/Sam-Rytech/kyvo.
