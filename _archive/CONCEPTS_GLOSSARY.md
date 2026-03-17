# Prediction Market Concepts Glossary

Quick reference for all concepts in the article database.

---

## Core Mechanics

**liquidity provision** — Supplying capital to markets so traders can buy/sell without large price impact. LPs earn fees but face adverse selection risk.

**oracle design** — How markets determine real-world outcomes. Can be centralized (platform decides), decentralized (token holder votes), or hybrid (UMA's optimistic oracle).

**information aggregation** — The core PM thesis: markets synthesize dispersed private beliefs into a single price signal that reflects collective probability.

**market making** — Continuously quoting bid/ask prices to facilitate trading. MMs profit from spread but lose to informed traders.

**order book** — A list of buy/sell orders at various prices. CLOBs (central limit order books) aggregate competing quotes; depth = liquidity.

**LMSR (logarithmic market scoring rule)** — Hanson's automated market maker that always offers prices. Bounded loss for the subsidizer, always-available liquidity.

**proper scoring rules** — Reward functions where reporting your true belief maximizes expected payout. Ensures honesty is optimal strategy.

---

## Market Types

**conditional tokens** — Tokens representing outcomes (YES/NO) that can be traded, split, merged. Gnosis CTF is the standard implementation.

**decision markets** — Markets conditional on actions: "Price of X if policy Y passes." Used to evaluate policy impact.

**futarchy** — Governance via prediction markets: "Vote on values, bet on beliefs." Markets decide which policies achieve chosen goals.

**election markets** — PMs on political outcomes. High-profile, high-volume, but face reflexivity concerns (odds influence voter behavior).

**self-resolving markets** — Markets on subjective outcomes where crowd consensus becomes the resolution. No external oracle needed.

**hyperstition markets** — Markets designed for self-fulfilling prophecies. Betting = coordinating action toward manifestation.

**distribution markets** — Markets where traders express full probability distributions, not just binary yes/no. Rewards precision.

**attention markets** — Markets on social engagement metrics (followers, mentions). Trendle example.

**parlays** — Combined bets on multiple outcomes. Require all legs to hit. Liquidity fragmentation challenge.

---

## Trading & Risk

**adverse selection** — When counterparties know more than you. MMs get "picked off" by informed traders, leaving them with losing positions.

**toxic flow** — Order flow from informed traders that causes MM losses. Opposite of profitable retail flow.

**arbitrage** — Exploiting price differences across platforms. In PMs, complicated by different resolution rules/oracles.

**hedging** — Offsetting risk by taking opposing positions. PMs often lack hedging venues, limiting institutional participation.

**gap risk** — Risk of sudden price jumps on news. In PMs, informed traders can clear entire order books instantly.

**corruption value multiple** — The ratio of what's at stake in a market vs. cost to manipulate the outcome. Low CVM = manipulation risk.

**reflexivity** — When market prices influence the outcome being predicted. Elections, awards, policy decisions.

**Kelly criterion** — Optimal bet sizing formula based on edge and odds. Traders use fractional Kelly (1/4 or 1/5) to account for uncertainty.

**portfolio sizing** — How to allocate capital across multiple PM positions given edge estimates and correlation.

---

## Infrastructure

**dispute resolution** — Process for challenging market resolutions. UMA uses token holder votes with escalating bonds.

**UMA protocol** — Optimistic oracle used by Polymarket. Assumes resolution is correct unless disputed within challenge period.

**resolution criteria** — The specific rules defining how an outcome is determined. Ambiguity here causes most PM controversies.

**event contracts** — Binary contracts paying $1 if event occurs, $0 otherwise. The basic PM primitive.

**derivatives** — Financial instruments derived from PM positions: leverage, options on outcomes, variance swaps on belief volatility.

---

## Economics

**price discovery** — The process by which markets find fair value. PMs discover probability through trading.

**info finance** — Vitalik's term for using financial incentives to surface and aggregate information. PMs are one application.

**network effects** — Value increases with more users. PMs benefit from liquidity, data, and mindshare network effects.

**platform competition** — Dynamics between PM venues (Polymarket, Kalshi, etc.). Liquidity tends to concentrate; winner-take-most.

**incentive compatibility** — Mechanism design term: a system where truthful behavior is each participant's best strategy.

**wisdom of crowds** — Aggregated group estimates often beat individual experts. Theoretical foundation for PMs.

**forecasting accuracy** — How well PM prices predict actual outcomes. Often measured by Brier scores.

---

## Advanced Concepts

**peer prediction** — Rewarding forecasters based on correlation with peers rather than ground truth. For subjective questions.

**batched auctions** — Collecting orders over time windows and executing at single clearing price. Reduces speed advantages.

**belief volatility** — How much market-implied probabilities fluctuate. Analogous to implied volatility in options.

**covariance markets** — Markets on joint probability of multiple outcomes. Enables parlays without fragmenting liquidity.

**opportunity markets** — Private PMs where prices stay hidden from public. Sponsors discover opportunities before competitors.

**impact markets** — Markets pricing assets conditional on events (e.g., "BTC price if Fed cuts 75bp"). Enables direct hedging.

**composable beliefs** — Treating predictions as vectors over distributions that can combine, offset, and integrate with DeFi.

**no-loss prediction markets** — Deposits earn yield; only yield funds payouts. Losers get principal back.

---

## Other

**AI agents** — Autonomous systems that trade PMs, price micro-markets, or translate user beliefs into optimal positions.

**regulatory arbitrage** — Exploiting differences in rules across jurisdictions. Polymarket offshore vs. Kalshi CFTC-regulated.

**no-trade theorem** — Economic theory that rational traders with common priors shouldn't trade. PMs work because priors differ.

**public goods problem** — Information is non-excludable; those who discover it can't capture full value. PMs partially solve this.

**social coercion** — When market participants can directly pressure/manipulate outcome subjects (e.g., influencers, small DAOs).

**information asymmetry** — When some participants have private knowledge others lack. Insiders in company/protocol decisions.
