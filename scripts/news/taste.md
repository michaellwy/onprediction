# News feed taste profile

The single source of truth for what belongs on the OnPrediction news feed. The
taste classifier (`lib/taste-classifier.mjs`) reads THIS FILE verbatim as its
rubric, so editing the prose below changes the filter. Keep it concrete.

The feed is read by prediction-market builders, researchers and investors. They
already follow the space. They do NOT want a metrics ticker or an opinion column.
They want to know **what concrete thing just happened, who did it, and the numbers.**

The one-line test:
> **A specific thing happened, done by a named entity, with figures or a jurisdiction → SIGNAL.**
> **A trend, an aggregate metric, an opinion, or a rehash of something already known → NOISE.**

## SIGNAL — publish these

- **Money moves**: a fundraise, a valuation, an IPO step, M&A, an equity/advisory stake. Especially named startups, but the Kalshi/Polymarket mega-rounds count too.
- **Deals & launches**: a partnership, a product launch, a new feature, a new company entering the space, an integration that ships.
- **Legal / regulatory action with a named actor + jurisdiction**: a lawsuit filed, a court ruling, a CFTC/state-AG/tribe action, a specific bill, a ban enacted or proposed by a named body.
- **Integrity events**: a hack, fraud, insider-trading case, manipulation, a settlement dispute — with specifics.
- **Platform building**: a named tool, surveillance hire, infrastructure (API, terminal, oracle) that a platform actually shipped or staffed.
- **Enforcement with a named subject**: an investigation or referral naming a person/company.

## NOISE — hide these

- **Metric churn**: "weekly volume hit $X billion", "annualized revenue surpassed $Y", "open interest hit a record". The recurring scoreboard. Hide it even when the number is big and the story is on-topic and high-scoring.
- **Roundups**: "Kalshi and Polymarket face growing X", "the prediction market boom is reshaping Y" — survey pieces with no single discrete development.
- **Opinion / commentary / explainers**: op-eds, "argues that", "what this means", think-pieces, "what is a prediction market".
- **Duplicates**: a weaker-sourced or later re-report of a development already on the feed. Same event, new outlet, no new facts → noise.
- **Odds-as-barometer**: the hook is what a market PRICES about an external event (an election, a game, a Fed decision), not the industry itself. (The on-topic gate mostly catches these, but flag any that slip through.)
- **Culture/ad fluff**: celebrity-ad backlash, viral marketing stunts, personality profiles with no business development.

## UNCERTAIN — send to review, don't guess

Mark `uncertain` (do NOT force signal/noise) when it is genuinely borderline:
- A volume/metric story that is ALSO a singular notable first or is tied to a specific named event (e.g. a record set *during* a market selloff, or a category crossing a milestone for the first time). Pure scoreboard = noise; a genuine "first ever" framed as an event might be signal — let a human decide.
- A development you can't tell is net-new vs. a rehash from the headline + summary alone.

## SIGNAL examples (real headlines kept)

- Kalshi is targeting a $40 billion valuation
- EDGE Markets raised $29.2 million in Series A funding led by CoinFund
- Polymarket partnered with Splash Sports to launch a pro football survivor contest
- Crypto.com launched its OG prediction market platform in New York with OG Anunoby as brand ambassador
- Gemini seeks to join the CFTC's legal battle with New York over prediction markets
- Hong Kong is considering a ban on prediction markets
- Binance Wallet launched a unified API for prediction market applications
- The DOJ is investigating whether George Santos used insider information to bet against his own race
- Meta is building a standalone prediction market app called Arena
- Kalshi built an AI agent called Orca to stress-test prediction market bets
- New Mexico Attorney General Raúl Torrez sued Kalshi over sports event contracts
- Native American tribes and casinos in Rhode Island are joining the state's legal effort against prediction market platforms

## NOISE examples (real headlines hidden)

- Prediction market weekly volume hit a record $14.4 billion, more than doubling the prior week
- Kalshi's weekly perpetual contract notional volume hit nearly $6 billion, a new all-time high
- Prediction markets hit a record $10.8 billion in weekly trading volume
- Polymarket and Kalshi have generated $5.4 billion in World Cup 2026 trading volume
- Kalshi and Polymarket face growing global bans as the 2026 World Cup approaches
- The prediction market boom is reshaping midterm elections
- Kalshi and Polymarket have made prediction markets a reality, but not in the way economists imagined
- A Bloomberg opinion columnist argues proposed CFTC rules for Kalshi and Polymarket are backward
- Kalshi and Polymarket turned NBA Finals celebrations into viral marketing stunts
