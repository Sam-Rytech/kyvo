# Frontend redesign: Due Date with the Funding Slip

Chosen by the owner on Nov 6, 2026, from [the four directions](https://claude.ai/artifact/HedpQed4zEwAqp75uZgBZd): direction A (Due Date) with direction C's slip for "Why?".

## Goal
A stranger opening the live URL understands Kyvo in 30 seconds, and anyone can see what to fund at a glance. The page stops being a stack of identical cards, and detail that doesn't help that decision moves out of the way.

This replaces how the pages look and what they show. Engines, memory, Tatum, Telegram and API routes don't change.

## Look
| | |
|---|---|
| Colours | Marigold `#FFC21A`, aubergine ink `#24103A`, warm white `#FFFDF7`, muted `#6D5F7A`, rule `#ECE5D6` |
| Status colours | Covered `#39C47A`, fund soon marigold, at risk `#D42A20` with white text |
| Display type | Archivo, black weight, condensed, used for the funding sentence and little else |
| Text type | Instrument Sans |
| Slip type | Spline Sans Mono, inside the slip only |
| Shape | Flat sections separated by rules. Cards only where something is really a separate object, such as the slip |

One light look. The dark mode toggle goes, because status colour is the identity and a second palette adds work the deadline doesn't need.

## The funding sentence
Today's page opens with one huge sentence on a full-width status colour:

> FUND ABOUT ₦30,681 BY 16 NOV

Under it: the dollar amount, what it covers, the most urgent warning, and "Why this amount?".

| Status | When | Sentence |
|---|---|---|
| Covered | Nothing due in 30 days, or the known balance covers it | "You're covered through 18 Nov", or "Nothing to fund in the next 30 days" |
| Fund soon | Money is due and nothing urgent applies | "Fund about ₦30,681 by 16 Nov" |
| At risk | Any alert is `danger`, or a card is known to be short | The same sentence, plus the reason from the alert |

Status is always stated in words as well as colour. The rule is a small pure function, `lib/engines/funding-status.ts`, built test-first.

Other cases:
- **Rate unavailable or USD home currency:** the sentence uses dollars, and when the rate is down a note says so.
- **Ignore memory on:** the band turns neutral grey, the sentence shows the blank forecast and is labelled as such, and no provider markup is applied.
- **Long amounts (UGX, KES):** the type scales to fit at phone width, and the sentence never overflows.
- **No memories yet:** an empty state with one action, "Scan your billing emails".

## The slip
The Why panel becomes an itemised slip with a torn edge, in the same slide-over, closing the same ways (Esc, close button, clicking outside). It takes over the full screen on phones.

Every "Why?" uses it, so the existing `WhyContent` shape stays. Sums print as line items, the rate and provider markup become lines instead of a paragraph, and the "≈" total sits at the foot. Records on Walrus go last, collapsed behind a count, and open to show each sentence and blob ID.

## Pages and menu
The menu becomes **Today, Subscriptions, Trials, Family, Wrapped**, on the side at desktop width and along the bottom on phones.

| Page | Change |
|---|---|
| Today (`/`) | Funding band, then "Coming up" (trials, promises and charges in date order), then the forecast chart, then the vault |
| Subscriptions | Plain rows. Cards folds in as a section, and `/cards` redirects there |
| Trials, Family, Wrapped, Settings, onboarding | Restyled. No change to what they do. Wrapped's share image gets the new colours |
| How it's verified (`/proof`) | Takes in Status and Total Recall, linked from the footer on every page. `/status` redirects here |
| Settings | Reached from the signed-in account menu |
| Error, loading, not-found | Restyled |

Signed-out visitors see one plain line above the band saying what Kyvo does and that this is a live demo from real billing history. Marketing explanation stays that short.

## Information changes
| Now | After |
|---|---|
| Google testing-mode banner on every page | Shown in a short step when someone presses Connect Gmail, before Google opens |
| Status, Proof, Total Recall in the main menu | On How it's verified |
| "5 records on Walrus" on each subscription | Inside the slip |
| Rate source and exact rate in a paragraph | A line on the slip |
| Paragraphs about unconfirmed provider fees on Cards | Removed. Fees and rules appear only when there's something confirmed to state, with their source |
| Long caveats under the chart | One short line |
| "Payment test" plan in the demo | Renamed "Sui payment proof" by a new memory that keeps the plan ID, so Total Recall restores the new name |
| Vault wallet address in the demo | Hidden for signed-out visitors, with the balance kept |

### Waiting on the owner
These defaults apply unless the owner says otherwise:
- **"Last payment on Sui" link in the demo:** stays, because judges need it. Clicking it reveals the wallet addresses on Suiscan.
- **GitLab trial, its reason, and "Cancel GitLab before the trial ends":** stay, because they demonstrate the trial and promise features.
- **Any other information the owner meant:** the owner's original request didn't list it, so this table is a best guess.

### What must stay
Hindcast is always labelled on replayed numbers, in small type if needed. Local amounts keep "≈". Outages are stated plainly. Why? stays on every number, and the Ignore memory switch stays. Blob IDs and the Sui payment stay reachable for judges.

## How it's built
- Work on a `redesign` branch, since pushing `main` deploys straight to the live site. Review on a Vercel preview, then merge.
- Keep the existing Tailwind class names and spacing scale. Replace their colour, font and radius values, and delete the dark palette. Rewrite the shell, today page, Why panel and landing line, and restyle the rest.
- Load fonts with `next/font`, with fallbacks.
- The `ai-builder-v0` tag and the original export stay untouched.

## Testing
- Test-first for the status rule, including boundaries. The existing test suite must keep passing.
- Check every page at desktop and phone width on the preview, signed out and signed in.
- Check all three status bands, a rate outage, a USD account and an empty account.
- Measure text contrast on all three band colours, and check keyboard use and reduced motion on the slip.
- Confirm signed-out visitors still can't write, and that Total Recall works from its new home.

## Docs to update in the same change
`docs/architecture.md` (pages and demo account), `docs/DEMO.md` (Cards and Status beats move), `README.md`, and `docs/Progress.md`.

## Out of scope
New features, engine or forecast changes, a separate marketing site, painted art, dark mode, and changes to Telegram messages.

## Open risk
The redesign drops the Tatum look while Kyvo targets the Best Tatum AI Builder prize. The owner should ask on Discord whether the look itself matters. If it does, this design's colours and fonts can be swapped back for Tatum's tokens, since the class names stay.
