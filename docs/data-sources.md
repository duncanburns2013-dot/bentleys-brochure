# Data sources

Every figure in the book traces to something here. If a number cannot be
traced to a row in this file, it does not go in the book.

## Market share chart (page 9)

| | |
|---|---|
| **Flourish visualisation** | <https://app.flourish.studio/visualisation/29950235/edit> — "Greater Newburyport Market Share 2016-2026 YTD", by Duncan Burns |
| **Source file** | `D:\Market Share Race Chart\greater-newburyport-market-share-2016-2026ytd.csv` |
| **Copy in this repo** | [`src/data/market-share.csv`](../src/data/market-share.csv) |
| **Attribution** | MLS PIN |

The repo copy is the source file with two changes, both recorded in its header
comment: the 2026 column is dropped, and a `merge_into` column records
acquisitions.

**Bentley's holds two MLS office IDs** — `AN2888` (the legacy team) and
`AN8279` (the RE/MAX era). Both must be counted for any year before the
RE/MAX conversion. The source file already combines them.

### Decisions the chart encodes

- **2026 is excluded.** The year is not over, and the owner reports the
  Flourish column may be stale.
- **Top ten by mean share across 2016–2025**, not by the latest year. Ranking
  on 2025 alone would drop RE/MAX On The River and Stone Ridge Properties —
  the firms that led this market in 2016 and have since left — and those
  departures are the story.
- **Acquisitions merge forward.** Fruh Realty folds into Gibson Sotheby's, so
  the acquirer's line runs continuously instead of appearing from nowhere in
  2023. Shares are percentages of the same denominator within a year, so they
  add.
- **Leading and trailing zeros are breaks, not values.** A zero means the firm
  was not trading in this market that year. Plotting it would draw a flat line
  along the axis for a brokerage that did not exist yet. Interior zeros are
  kept, since a zero between two trading years is a real gap.
- **Four brokerages fall outside the top ten** and are omitted rather than
  pooled into an "other" line: Bean Group, J. Barrett & Company, Redfin,
  Advisors Living.

### What the percentages measure

The source file carries no units label. The owner reports the published chart
carried a disclaimer that **share includes off-market listings** — expired,
cancelled and withdrawn, not only sales. That is now stated in the page's
source line, because "share of this market" and "share of homes sold" are
different claims and only the first is supported.

An attempt to reverse-engineer the exact methodology against MLS PIN **did not
succeed**, and the negative result is worth keeping so nobody repeats it.
2024 and 2025 were pulled for the six Greater Newburyport towns including
off-market listings, and 80 combinations of town set, side convention, metric,
status universe and property type were scored against the published figures:

| Definition | 2024 | 2025 | published |
|---|---|---|---|
| 6 towns / both sides / volume / closed | 15.62% | 14.73% | 15.6 / 15.79 |
| 6 towns / both sides / volume / incl off-market | 16.98% | 15.80% | 15.6 / 15.79 |
| 6 towns / list side / count / incl off-market | 15.34% | 12.04% | 15.6 / 15.79 |

**No definition reproduces both years** — the best worst-year error is 1.06
points. Several reproduce one year almost exactly, but that is what sweeping
80 combinations against a single number will always produce, and it is not
evidence.

What the exercise does establish:

- **The series is volume-weighted and counts both sides.** Every candidate that
  lands anywhere near the published figures is. Listing-side counts come out at
  10–12%, nowhere near 15–16%.
- **Off-market inclusion matters materially** — it moves 2024 from 15.62% to
  16.98%. So the disclaimer is load-bearing, not a footnote.
- The unexplained residual is most likely the town list, a property-type or
  rental filter, or additional Bentley's office and team IDs beyond `AN2888`
  and `AN8279`. Team IDs are a known corrupter of raw MLS PIN side counts.

Rows sum to roughly 53% in 2025 — the remainder is every other office in the
market, not an error.

Query scripts and cached pulls live in `D:\Bentley's Brochure\mls-tools`,
deliberately outside this repo.

## Figures on page 8

| Figure | Source |
|---|---|
| $1.14B sold since 2019 | bentleysrealestate.com; owner-confirmed. No file on D: derives it. |
| #1 in Greater Newburyport, 7 years | Owner-confirmed; corroborated by the market-share data above (2019–2025) |
| #1 in Essex County, 2022 | REALTRENDS "The Thousand", The Wall Street Journal |
| 60 agents, from eight in 2016 | Site roster counts 52 REALTORs plus 8 leadership and staff |
| Veteran-owned and woman-owned, founded 2016 | Owner-confirmed |

## Rules

- **Attribute market data to MLS PIN and nothing else** — in copy, comments,
  commit messages and docs.
- **No MLS backfills.** The housing pipeline is driven from another machine
  and a stray bulk pull exhausts the shared quota.
- There is no MLS credential on the build machine, and there should not be
  one in this repository. See the README.
