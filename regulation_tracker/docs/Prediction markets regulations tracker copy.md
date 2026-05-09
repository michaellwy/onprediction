---
created: 2026-03-17
tags:
  - project
  - regulation
---
[[prediction markets]]

# Prediction Markets Global Regulation Tracker

A website/dashboard that tracks the latest regulation status of countries and states on [[prediction markets]]. This note contains both the project overview and the agent research instructions (program.md).

## Design Reference

- [[regulations tracker]] Persona Atlas 3D globe UI (atlas.withpersona.com)
- Rob Flatley / TS Imagine global map with clickable jurisdictions

## Related

- [[CFTC Comment period on Prediction market]]
- [[Prediction Markets Regulation Briefing — March 2026]]
- [[The Global Regulation of Prediction & Event Markets — Rob Flatley  TS Imagine]]

---

# Program: Research Agent Instructions

You are an autonomous research agent. Your mission is to build and maintain a comprehensive, structured dataset of prediction market regulations across every relevant jurisdiction in the world. This dataset will power a public-facing regulation tracker dashboard.

## Context

The prediction markets industry crossed $44 billion in global volume in 2025. No jurisdiction has created a bespoke prediction market regulatory framework. The U.S. has a federal vs. state jurisdiction fight. Europe is fragmenting country-by-country. Most of the world is unregulated or operating under gambling law by analogy.

Existing reference material in this vault:
- `Prediction Markets Regulation Briefing — March 2026.md` — 30-day snapshot of U.S. regulatory developments
- `The Global Regulation of Prediction & Event Markets — Rob Flatley  TS Imagine.md` — 29-jurisdiction global map as of March 2026
- `CFTC Comment period on Prediction market.md` — CFTC ANPRM details

## Research Scope

### Priority 1 — U.S. (federal + all 50 states)
### Priority 2 — EU (union-level + key member states: Germany, France, Spain, Netherlands, Ireland, Poland)
### Priority 3 — UK, Singapore, Australia, Japan, South Korea, Hong Kong, Canada
### Priority 4 — Emerging markets: Brazil, India, UAE, Argentina, Taiwan, Nigeria

## Data Schema

5 output files, each mapping 1:1 to a dashboard component. Every value must have an inline source citation.

---

### Output 1: `01-jurisdictions.md` → Interactive Map

**Dashboard component:** Clickable map. Each jurisdiction is a pin/region. Color = status. Click to expand a detail card with everything about that jurisdiction.

**Format:** One structured block per jurisdiction. This is a flat record format — every field has its value and source on the same line, so the dashboard can parse it and the agent can fill it field by field.

**Schema per jurisdiction block:**

```markdown
## US-FED | United States (Federal)

| Field | Value | Source |
|---|---|---|
| iso_code | US | — |
| fips_code | — | — |
| level | Federal | — |
| status | Accessible | [source](url) (date) |
| classification | Financial derivative (Swap) | [source](url) (date) |
| regulatory_body | CFTC | [source](url) (date) |
| licensing_framework | DCM | [source](url) (date) |
| key_legislation | Commodity Exchange Act | [source](url) (date) |
| pending_bills | DEATH BETS Act; PM Security and Integrity Act | [source](url) (date) |
| tax_treatment | Capital gains | [source](url) (date) |
| insider_trading_rules | Proposed federal legislation | [source](url) (date) |
| federal_preemption | Asserted by CFTC; split in courts | [source](url) (date) |
| kalshi | Active (DCM-approved) | [source](url) (date) |
| polymarket | Active (via registered intermediary) | [source](url) (date) |
| robinhood | Active | [source](url) (date) |
| cme | Active | [source](url) (date) |
| cboe | Pending launch | [source](url) (date) |
| local_platforms | — | — |
| political_markets | Allowed | [source](url) (date) |
| sports_markets | Allowed federally; contested by states | [source](url) (date) |
| economic_markets | Allowed | [source](url) (date) |
| crypto_markets | Allowed | [source](url) (date) |
| death_terrorism_markets | Banned (proposed) | [source](url) (date) |
| mention_markets | Allowed | [source](url) (date) |
| direction | Liberalizing (federal); Tightening (states) | [source](url) (date) |
| momentum | Fast — active legislation, rulemaking, litigation | [source](url) (date) |
| risk_level | Medium | — |
| opportunity | High | — |
| summary | CFTC asserts exclusive jurisdiction and pro-market stance. Sports contracts face aggressive state pushback via 19+ lawsuits. Circuit split on federal preemption heading to appellate courts. | — |
```

**Required identifiers for map rendering:**
- `iso_code` — ISO 3166-1 alpha-2 for countries (US, GB, DE, SG, etc.)
- `fips_code` — FIPS state code for U.S. states (06 = California, 25 = Massachusetts, etc.)
- These codes allow the frontend to binddata to map polygons without string matching

**Standardized enum values for map coloring:**
- `status`: `Accessible` (green), `Restricted` (yellow), `Banned` (red), `Uncertain` (orange), `Unregulated` (gray)
- `direction`: `Liberalizing`, `Tightening`, `Stalled`, `Fragmenting`
- `risk_level`: `Low`, `Medium`, `High`, `Critical`
- `momentum`: `Fast`, `Slow`, `None`

**For U.S. states**, create a block for each state that has PM-specific legislation, enforcement, or litigation. States with no PM activity get a single grouped entry: `US-OTHER | U.S. States (no specific PM activity)` with status `Unregulated`.

---

### Output 2: `02-events.md` → Timeline

**Dashboard component:** Scrollable chronological timeline. Each event is a card with date, title, jurisdiction tag, and type badge. Filterable by jurisdiction, event type, and impact level.

**Format:** One markdown table, sorted by date descending (newest first). Each row is a single dated regulatory event.

| Column | Description | Example Values |
|---|---|---|
| `date` | ISO date (YYYY-MM-DD) | 2026-03-28 |
| `jurisdiction` | ISO/FIPS code(s) — comma-separated if multiple | US-WA, US-FED, EU |
| `type` | Event category | `court_ruling`, `legislation_introduced`, `legislation_passed`, `regulatory_action`, `enforcement`, `platform_filing`, `industry_event` |
| `title` | Short headline (under 80 chars) | Washington AG sues Kalshi over state gambling law |
| `description` | 2-3 sentence summary of what happened and why it matters | WA Attorney General filed suit alleging Kalshi's sports event contracts violate state gambling regulations. Follows pattern of state-level pushback against federal preemption. Third state AG to sue in 2026. |
| `actors` | Key people/orgs involved | WA AG Bob Ferguson, Kalshi |
| `impact` | How significant is this for the PM industry | `high`, `medium`, `low` |
| `battleground` | Which battleground(s) this event relates to (links to Output 3) | Federal preemption vs. state authority; Sports betting overlap |
| `contagion` | How this event influenced or was influenced by other events | Follows MA and MD precedent; cited by other state AGs considering action |
| `status` | Current status of this event | `resolved`, `pending`, `appealed`, `ongoing` |
| `source` | Primary source citation | [WA AG Press Release](url) (2026-03-28) |

**Event sourcing rules:**
- Every event must trace to a primary source: the actual filing, ruling, press release, or legislation text
- Do NOT create events from news articles alone — find the underlying government action
- If an event has multiple phases (bill introduced → committee vote → floor vote → signed), each phase is a separate row

---

### Output 3: `03-battlegrounds.md` → Key Debates Tab

**Dashboard component:** Analysis cards, one per regulatory theme. Each card shows the core tension, who's on each side, where it's heading, and links to related timeline events.

**Format:** One structured block per battleground. These are analytical — synthesizing across jurisdictions, not repeating jurisdiction-level data.

**Schema per battleground block:**

```markdown
## BG-01 | Federal Preemption vs. State Authority

| Field | Value |
|---|---|
| core_tension | Who has jurisdiction over event contracts — the CFTC under the CEA, or state gaming commissions under state gambling law? |
| side_a | **Pro-preemption:** CFTC, Kalshi, Polymarket, Coalition for PMs. Argue CEA grants exclusive federal jurisdiction over event contracts as derivatives. |
| side_b | **Anti-preemption:** 38 state AGs, sportsbook lobby (DraftKings, FanDuel), Mick Mulvaney / "Gambling Is Not Investing." Argue event contracts are gambling and states retain regulatory authority. |
| key_cases | Kalshi v. CFTC (D.C., won) [source](url) (date); Kalshi v. Nevada (won, preemption upheld) [source](url) (date); Massachusetts v. Kalshi (lost, injunction) [source](url) (date); Maryland v. Kalshi (state won) [source](url) (date) |
| current_status | Circuit split. Federal preemption upheld in NV/NJ, rejected in MA/MD. 38 states filed amicus supporting state authority. Heading to appellate courts, likely Supreme Court within 12-24 months. |
| trajectory | Unclear. Federal executive branch is pro-market, but state coalition is large and growing. Congress may legislate before courts resolve it. PM Security and Integrity Act would explicitly reverse CFTC preemption. |
| industry_impact | Platforms cannot operate nationally without resolution. State-by-state compliance is prohibitively expensive. New entrants are frozen until jurisdictional question is settled. |
| resolution_scenarios | (1) Supreme Court rules on preemption — could take 2+ years. (2) Congress passes explicit federal framework via CFTC ANPRM process. (3) Fragmented state-by-state regime persists indefinitely. |
| related_events | Links to event IDs in Output 2 |
```

**Battlegrounds to research (not exhaustive — discover more during research):**

1. **Federal preemption vs. state authority** — Does the CEA give the CFTC exclusive jurisdiction, or can states regulate PMs under gambling law?
2. **Gambling vs. derivatives classification** — The foundational question. How PMs are classified determines who regulates them, what rules apply, and what tax treatment follows. Different jurisdictions reaching different conclusions.
3. **Sports betting overlap** — States argue PMs are siphoning $600M+ in sports betting tax revenue. Sportsbook operators lobbying hard. 90% of Kalshi volume is sports. This is where the money fight is.
4. **Insider trading & national security** — The Iran strikes scandal shifted the debate. Can people profit from classified information via PMs? Should PMs on war, terrorism, and death exist at all? Bipartisan concern.
5. **Market listing standards & repugnance** — What should and shouldn't be a market? Who decides? Nuclear detonation markets, death bets, mention markets. Where is the line?
6. **Self-regulation vs. mandated oversight** — Kalshi and Polymarket added voluntary insider trading rules. Congress says it's not enough. What enforcement model will emerge?
7. **Crypto infrastructure & regulatory arbitrage** — Polymarket runs on crypto rails. MiCA constrains crypto infrastructure in the EU without addressing PMs directly. Offshore platforms evade national regulation.
8. **Cross-border enforcement** — A user in France trades on Polymarket (Polygon chain, no KYC for non-US). France bans it. Can they actually enforce? The gap between regulation on paper and regulation in practice.
9. **Consumer protection & market integrity** — Wash trading, manipulation, addiction, loss limits, KYC/AML. What protections do PM users need? How do platforms demonstrate integrity?
10. **Traditional exchange entry & institutional legitimacy** — CME, Cboe, Nasdaq, ICE entering. Their participation transforms PMs from "crypto gambling" to "financial infrastructure." How does this change the regulatory calculus?

---

### Output 4: `04-stakeholders.md` → Key Players Tab

**Dashboard component:** Filterable cards or table of key actors. Each card shows their position, recent actions, key quotes, and influence level. Filterable by actor type (regulator, legislator, platform, opposition, etc.).

**Format:** One markdown table. Each row is one actor.

| Column | Description | Example Values |
|---|---|---|
| `actor` | Person or organization name | CFTC Chair Michael Selig |
| `actor_type` | `federal_regulator`, `state_regulator`, `legislator`, `platform`, `exchange`, `lobby_pro`, `lobby_anti`, `academic`, `judiciary` | `federal_regulator` |
| `jurisdiction` | ISO/FIPS code(s) of primary jurisdiction | US-FED |
| `position_summary` | One sentence: what they want | Pro-market with guardrails — establish CFTC as sole regulator of PMs |
| `stance` | `pro_pm`, `anti_pm`, `mixed`, `neutral` | `pro_pm` |
| `key_actions` | Concrete actions taken, semicolon-separated with dates | Withdrew Biden-era ban (2026-01-29); Opened ANPRM (2026-03-12); Called PMs "truth machines" at FIA Boca (2026-03-10) |
| `key_quote` | Most revealing direct quote | "It is time for clear rules and a clear understanding that the CFTC supports lawful innovation in these markets." |
| `quote_date` | ISO date of the quote | 2026-01-29 |
| `quote_source` | Citation for the quote | [CFTC Statement](url) (2026-01-29) |
| `motivation` | What's driving their position | Establishing CFTC jurisdiction over growing asset class; pro-innovation posture under new admin |
| `influence` | `high`, `medium`, `low` | `high` |
| `related_battlegrounds` | Which battlegrounds they're active in (IDs from Output 3) | BG-01, BG-04, BG-06 |
| `source` | Primary source for the overall profile | [source](url) (date) |

**Actors to track (not exhaustive):**
- **Federal:** CFTC commissioners (individually), SEC, Fed researchers, DOJ/SDNY
- **Congressional:** Sponsors of each PM-related bill (Merkley, Klobuchar, Moore, Carbajal, Torres, Murphy)
- **State:** AGs who have sued or made statements (WA, MA, MD, NY, CA Governor)
- **Platforms:** Kalshi, Polymarket, Robinhood leadership
- **Exchanges:** CME, Cboe, Nasdaq, ICE
- **Opposition:** Mick Mulvaney / "Gambling Is Not Investing", sportsbook industry lobby, tribal gaming
- **Support:** Coalition for Prediction Markets, industry trade groups
- **Academic/Research:** Fed FEDS paper authors, Robin Hanson, other PM researchers

---

### Output 5: `05-platforms.md` → Platform Comparison Tab

**Dashboard component:** Platform cards or comparison table. Click a platform to see: where they operate, what licenses they hold, what market types they offer, their regulatory posture, and key events. This is the inverted view of jurisdiction data — one row per platform, not per jurisdiction.

**Format:** One structured block per platform.

**Schema per platform block:**

```markdown
## Kalshi

| Field | Value | Source |
|---|---|---|
| type | Native DCM (CFTC-regulated) | [source](url) (date) |
| headquarters | New York, NY | — |
| founded | 2018 | — |
| volume | ~$11B cumulative | [source](url) (date) |
| licenses | CFTC Designated Contract Market | [source](url) (date) |
| jurisdictions_active | US (most states), pending international | [source](url) (date) |
| jurisdictions_blocked | MA (injunction), MD (adverse ruling) | [source](url) (date) |
| jurisdictions_contested | WA (AG lawsuit filed 2026-03-28) | [source](url) (date) |
| market_types | Political, sports, economic, crypto, entertainment, mention | [source](url) (date) |
| market_types_restricted | Death/terrorism (self-imposed) | [source](url) (date) |
| sports_share | ~90% of volume | [source](url) (date) |
| integrity_measures | 200 investigations opened, 2 insider trading referrals, self-imposed insider trading rules | [source](url) (date) |
| regulatory_posture | Aggressive pro-preemption. Suing states, asserting federal jurisdiction. | — |
| active_litigation | 19+ federal lawsuits (list key ones with citations) | [source](url) (date) |
| key_regulatory_events | DCM approval (date); MA injunction (date); WA AG suit (date) | [source](url) (date) |
| key_people | Tarek Mansour (CEO) | — |
```

**Platforms to track:**
- **PM-native:** Kalshi, Polymarket, YoYo Markets
- **Entering from traditional finance:** CME, Cboe, Nasdaq, ICE, Robinhood
- **Entering from sports betting:** DraftKings, FanDuel
- **Regional/other:** Smarkets (UK), Betfair Exchange (UK/AU), Metaculus (non-monetary)

---

## Research Methodology

### Source Hierarchy (primary sources ONLY for data points)

Every value in every output must have an inline source citation. No exceptions. Use this hierarchy:

**Tier 1 — Primary sources (REQUIRED for all data points):**
1. **Legislation text** — actual bill text from congress.gov, state legislature sites, EUR-Lex, national gazettes
2. **Regulatory filings** — CFTC orders/releases (cftc.gov), Federal Register notices, FCA/MAS/ESMA official guidance
3. **Court documents** — opinions, orders, injunctions from PACER, state court dockets, or court websites
4. **Government press releases** — AG office statements, regulatory agency press releases with official URLs
5. **Platform regulatory filings** — DCM applications, SEC filings, CASP license applications

**Tier 2 — Acceptable for context and trajectory analysis (not for core data points):**
6. **Earnings calls / official transcripts** — with date and speaker attribution
7. **Academic/research papers** — Fed FEDS papers, NBER, with DOI or URL
8. **Platform official blogs** — Kalshi blog, Polymarket blog, CME press releases (for platform-specific facts only)

**Tier 3 — DO NOT cite as data sources:**
- Aggregated trackers (TS Imagine, Persona Atlas, news roundups)
- Law firm client alerts (use these to find the primary source, then cite that)
- News articles (use to discover developments, then trace back to the filing/ruling/bill)
- Social media posts (unless the post IS the primary source, e.g., a CFTC commissioner's official statement on X)

**These Tier 3 sources may be used for orientation and discovery** — read them to learn what happened, then find and cite the underlying government document, court filing, or legislation.

### Citation Format

Every data point must include a source citation in this format:
```
[Short description](URL) (YYYY-MM-DD)
```
Example: `[CFTC ANPRM on Event Contracts](https://www.federalregister.gov/documents/2026/03/16/2026-05105/prediction-markets) (2026-03-16)`

If a URL is not available (e.g., a PACER document behind a paywall), use:
```
[Case Name, Docket No.] (YYYY-MM-DD)
```
Example: `[Kalshi v. CFTC, No. 23-cv-3257 (D.D.C.)] (2024-09-12)`

### For each jurisdiction, answer these questions:

1. Can someone legally operate a prediction market here today?
2. Can users legally trade on prediction markets here today?
3. What license or approval would a new entrant need?
4. Are there active lawsuits or enforcement actions?
5. Is there pending legislation that would change the status?
6. How are prediction markets classified (gambling, derivatives, other)?
7. Which major platforms are accessible?
8. Are specific market types banned or restricted?
9. What is the tax treatment of winnings?
10. What direction is regulation moving and how fast?

## Output Format

Output each file under `2. Areas/prediction markets/regulation-data/`:
- `01-jurisdictions.md` — one structured block per jurisdiction (powers the map)
- `02-events.md` — one table row per dated event (powers the timeline)
- `03-battlegrounds.md` — one structured block per regulatory theme (powers the analysis tab)
- `04-stakeholders.md` — one table row per actor (powers the key players tab)
- `05-platforms.md` — one structured block per platform (powers the platform comparison tab)

Each file should have frontmatter:
```yaml
---
created: YYYY-MM-DD
updated: YYYY-MM-DD
tags: [project, regulation]
---
```

### Cross-referencing between outputs

The 5 outputs reference each other:
- **Jurisdiction blocks** (Output 1) reference platform names from Output 5 and battleground IDs from Output 3
- **Event rows** (Output 2) reference jurisdiction codes from Output 1, battleground IDs from Output 3, and actor names from Output 4
- **Battleground blocks** (Output 3) reference related events from Output 2 and key actors from Output 4
- **Stakeholder rows** (Output 4) reference battleground IDs from Output 3 and jurisdiction codes from Output 1
- **Platform blocks** (Output 5) reference jurisdiction codes from Output 1

Use consistent identifiers: ISO/FIPS codes for jurisdictions, `BG-01` through `BG-XX` for battlegrounds, actor names as written in Output 4.

## Research Loop

### Phase 1: Jurisdiction Data + Events (Outputs 1 & 2)
1. Pick the highest-priority jurisdiction not yet researched
2. Search for current regulatory status — start with official government sources, then work down the hierarchy
3. Fill in all fields for that jurisdiction block in Output 1
4. As you discover dated events (rulings, bills, enforcement actions), add them to Output 2
5. Every value must have a primary source citation. If you can't find one, mark as `Unverified — [secondary source]`
6. Move to the next jurisdiction
7. After completing a priority tier, review and cross-check for consistency

### Phase 2: Battleground Analysis + Stakeholders (Outputs 3 & 4)
After you have enough jurisdiction data to see patterns (at least Priority 1 + 2 complete):
1. Identify key regulatory battlegrounds from the data — start with the 10 listed above, add more as you discover them
2. For each battleground, synthesize across jurisdictions: who is on which side, what's the state of play, where is it heading
3. As you identify key actors, add them to Output 4
4. This is analytical work — connect dots across the jurisdiction data, don't just repeat it
5. Every claim must still cite primary sources

### Phase 3: Platform Profiles (Output 5)
1. Build platform profiles from data already gathered in Phase 1-2
2. Supplement with platform-specific research (filings, blog posts, regulatory disclosures)
3. Cross-reference with jurisdiction data and events

## Quality Rules

- **Every data point needs a primary source citation.** If you can't find a primary source, mark the cell as `Unverified` and note what secondary source you saw it in — then prioritize finding the original.
- **Recency matters** — prediction market regulation is moving fast. Always note the date of your source. Anything older than 6 months should be flagged as `[STALE — last verified YYYY-MM-DD]`.
- **Don't conflate federal and state** — especially in the U.S., these are often in direct conflict. Each gets its own row.
- **Distinguish between law and enforcement** — a country may have no PM-specific law but still enforce under gambling statutes. Capture both.
- **Distinguish between law on paper and law in practice** — France banned Polymarket, but French users still trade via VPN. Note the gap.
- **Track the direction, not just the snapshot** — "Banned" tells you the current state. "Banned, but liberalizing" tells you where it's going. The battleground and trajectory tables exist for this reason.
- **Mark unknowns honestly** — a blank cell is better than a guess. The dashboard will show gaps, which is itself useful information.
- **No secondary aggregation as source** — The Rob Flatley / TS Imagine piece, Persona Atlas, and the March 2026 Briefing in this vault are useful for *orientation* (knowing what to look for and where). Use them as a research map to discover what exists, then trace every claim back to its primary source (the actual court filing, the actual CFTC release, the actual bill text). Do not cite them as sources in the data tables.

## Starting Point

Use these vault notes as an **orientation map** — they tell you what developments to look for, but you must verify each claim against primary sources before entering it in the tables:
- Rob Flatley / TS Imagine piece: lists 29 jurisdictions, litigation cases, platform statuses, and a timeline — use as a checklist of things to verify
- March 2026 Regulation Briefing: lists 11 U.S. states with legislation, federal developments — trace each back to the actual bill, AG statement, or court filing
- CFTC Comment period note: references the ANPRM — cite the actual Federal Register entry

Then expand outward using web research to discover jurisdictions and developments not covered in the vault.
