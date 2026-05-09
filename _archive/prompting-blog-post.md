# Use This Prompt to 10x Your Prompting Skill

I spent the last two months vibe coding [onprediction.xyz](https://onprediction.xyz). I have no coding background — no CS degree, no bootcamp, nothing. Using Claude Code, I've managed to ship a full production site: database-backed forum, AI-powered Q&A, OAuth, SEO infrastructure, automated content pipelines, the works.

But here's the thing — "making it work eventually" isn't the same as being good at this. I was shipping features, but I had no idea whether my prompting was efficient or whether I was burning 3x the cycles I needed to. I had no feedback loop on my own process.

So I asked Claude to analyze my own prompting patterns across the entire project. Here's the exact prompt:

> Go through my full chat history in this project and analyze how I prompt. I'm not a software engineer. I have no coding background. Prompting is how I build, so my prompting patterns are essentially a mirror of how I think about building software. I want an honest, specific assessment of how I'm doing. What's working, what's not, and what's holding me back. Use real examples from our conversations to back up what you find. The end goal: I want to develop sharper instincts for translating ideas into prompts so I can build faster and waste fewer cycles.

What came back was the most useful feedback I've gotten on how I work. Not generic "be more specific" advice — it showed me the exact patterns that made my best prompts succeed in one shot and my worst prompts spiral into 7+ iteration cycles. With receipts.

I'm sharing the distilled lessons here because they generalize. Whether you're building a site, writing a script, or automating a workflow — these patterns hold.

---

## What's actually working (and why)

### 1. Constraints beat adjectives. Every time.

This is the single highest-leverage prompting insight I've found: **don't describe what you want. Describe what you won't accept.**

Here's the difference in practice:

**Weak prompt:**
> "Write a good, engaging product description."

**Strong prompt:**
> "Write 2-3 sentences. Direct and factual tone. No em dashes. Never use these words: thought-provoking, rigorous, compelling, essential reading, deep dive, comprehensive. Never use the 'Not X but Y' rhetorical construction. No rhetorical questions."

The first prompt has infinite failure modes — the AI could produce something flowery, generic, too long, too short, full of cliches, or technically correct but tonally wrong. You'll know it's bad when you see it, but you can't articulate why in advance.

The second prompt **closes off failure modes before generation begins.** The AI literally cannot produce the most common bad patterns because you've banned them. What's left is a narrow corridor that almost always leads to acceptable output.

This is what I think of as **compiling taste into rules.** You know what "good" looks like — you've seen enough bad outputs to know the patterns. The trick is writing down those patterns as explicit exclusions instead of hoping the AI infers your taste from a vague adjective.

**How to build your own constraint system:**
1. Prompt the AI for something 5 times without constraints
2. Notice what's wrong with each output — the recurring failure modes
3. Turn each failure mode into a rule: "never do X," "always do Y," "max N sentences"
4. Add these rules to your prompt and watch the output quality jump immediately

This compounds. After a few weeks, you'll have a constraint document that encodes your taste so precisely that the AI's first output is almost always usable. I went from editing every output to accepting most of them as-is.

**This applies to code too.** Instead of "make a clean UI," try "cards with 8px padding, text-sm for metadata, no visible borders, zinc-400 for secondary text, 4px border-radius." Specific constraints produce specific results. Adjectives produce guesswork.

### 2. There are two prompting modes — and using the wrong one is expensive

The analysis revealed something I hadn't consciously noticed: I was switching between two fundamentally different prompting modes, and the wrong mode was costing me 5-9x more iterations.

**Outcome mode:** You describe the thing that should exist.
> "Build a forum with posts, comments, upvotes, single-level threading, markdown support, and user profiles."

**Delta mode:** You describe what's wrong with the current thing.
> "Move this to the left." "Make that bigger." "No, use sans-serif." "Add more space." "Actually less space."

Here's my real data:

| Feature | Prompting mode | Complexity | Commits to ship |
|---------|---------------|------------|-----------------|
| Full forum system | Outcome | Very high (3,900 lines, 27 files) | 1 |
| User profiles + auth | Outcome | High | 1 |
| Text formatting fix | Delta | Low | 7 |
| Badge placement | Delta | Trivial | 6 |
| Mobile header layout | Delta | Low | 4 |

A 3,900-line forum shipped in one prompt because I described the outcome. A trivial badge took six commits because I kept describing deltas.

**The rule:** Before you prompt, ask yourself — "Am I describing what should exist, or what's wrong with what exists?" If it's the latter, stop. Reframe it as an outcome.

Instead of: *"The heading is too small and the spacing is off"*
Try: *"The page should have h2 headings at text-lg font-semibold, with 16px margin below each heading and 24px between sections."*

The first prompt starts a conversation. The second prompt ends one.

**When delta mode is actually fine:** Quick one-off fixes where the current state is 95% correct and you need one specific tweak. "Change the button color from blue to green" is a fine delta prompt. "Make the page look better" is not.

### 3. Build a ratchet: every mistake becomes a permanent rule

Most people fix mistakes in the moment and move on. The same mistake comes back three weeks later, and they fix it again. And again. I tracked this — it's one of the biggest hidden costs in any AI-assisted workflow.

The fix: **every time something goes wrong, write a rule that prevents it from ever happening again.** Not a mental note. A written rule in your project instructions.

My ratchet looked like this:
- AI output used banned cliche words → created a banned-words list
- Accidentally broke the build with a specific pattern → wrote a "never do this" rule in project docs
- Forgot a step in a multi-step workflow → wrote a checklist and eventually automated it
- Output quality drifted across sessions → added explicit style constraints to my system prompt

The key insight: **the cost of writing the rule is ~30 seconds. The cost of encountering the same bug again is 5-15 minutes.** After a few weeks, your instruction document becomes a distillation of every lesson learned, and the AI stops making mistakes you've already seen.

Think of it like this: you're not just building a project. You're training a system. Every rule you add makes the next session start from a higher baseline.

**Practical implementation:**
- Keep a `rules.md` or `instructions.md` file in your project
- After every frustrating iteration, add one line: the rule that would have prevented it
- Reference this file in your prompts or system instructions
- Review it monthly — remove rules that no longer apply, sharpen ones that do

### 4. Use AI to build tools that make using AI faster

This one is meta but extremely powerful. Most people use AI to build their project. Few people use AI to build **their workflow for building the project.**

My progression on a single repetitive task (adding articles to my site):
1. **Manual**: Copy 8 fields into a JSON file, format a CSV row, run 3 terminal commands (15 min/article)
2. **Documented**: Wrote step-by-step instructions so I wouldn't forget steps (10 min/article)
3. **Semi-automated**: Built a single command that does all steps (2 min/article)
4. **Discovery automated**: Built a scanner that finds relevant content automatically (30 sec to approve/reject)

Each level of automation was itself built by prompting. The total investment was maybe 2 hours. It saves me 10+ minutes every time I add content, and I've added ~100 pieces of content. That's 15+ hours saved from a 2-hour investment.

**The principle:** If you do something more than 3 times, prompt the AI to automate it. Not "someday" — now. The compounding is real: your workflow should get cheaper every week, not stay flat.

Look for these signals:
- You're copy-pasting between files
- You're running the same sequence of commands
- You're reformatting data from one shape to another
- You're doing the same quality check manually

Every one of these is a prompt away from being automated.

---

## What's wasting cycles (and how to fix it)

### 1. The "fix chain" — the most expensive prompting pattern

This is the #1 efficiency killer I found in my own work, and I suspect it's universal.

The fix chain looks like this:
1. Prompt for a feature
2. See the result in the browser
3. Something looks off — describe what's wrong
4. Get a fix
5. Something else looks off now — describe that
6. Repeat 4-7 more times
7. Finally accept the result, exhausted

My worst fix chain: 7 commits in 31 minutes for text formatting. Add formatting → add animations → fix formatting again → change to h3 headings → change to h2 headings → adjust to text-lg → fix paragraph spacing. Seven round trips for decisions that could have been made upfront in a single paragraph.

**Why fix chains happen:** You know what looks right when you see it, but you can't articulate it before you see it. So you prompt vaguely, react to the output, and iterate your way to the goal. Each step is small and feels productive, but the total cost is enormous.

**How to break fix chains:**

**Build a visual vocabulary.** You don't need to learn CSS or design theory. You need ~20 words that map your intuitions to concrete instructions:

| When you're thinking... | Say this instead |
|------------------------|-----------------|
| "It feels cramped" | "16px padding, 12px gap between items" |
| "It doesn't stand out" | "font-semibold, text-lg, darker color" |
| "It looks cluttered" | "Remove borders, use whitespace to separate, muted secondary text" |
| "It needs to be cleaner" | "Single font weight, consistent alignment, max 2 colors" |
| "It's too much" | "text-sm, zinc-400 color, lighter weight" |
| "Make it pop" | "Higher contrast, bolder weight, larger size, more padding around it" |

The goal isn't precision — it's getting close enough on the first prompt that you need 0-1 follow-ups instead of 6.

**Use a pre-flight checklist for any UI feature.** Before prompting, answer these questions:
1. **Layout:** How should elements be arranged? (stack, grid, side-by-side)
2. **Typography:** What size and weight for headings vs. body vs. metadata?
3. **Spacing:** Tight, normal, or generous padding/margins?
4. **Colors:** Default, or specific overrides?
5. **Responsive:** How should it change on mobile?
6. **Interaction:** Hover states, animations, transitions?

You don't need to answer all six every time. But forcing yourself to think through even 2-3 of these before prompting will eliminate most fix chains.

### 2. The "specify later" trap

There's a seductive logic: "I'll just get something on screen and then refine it." It feels faster than spending time on a detailed prompt. The data says otherwise.

Here's the real math from my project:

**High spec, one shot:**
- Full forum (3,900 lines) — 1 prompt, 0 follow-ups, ~5 min total
- SEO infrastructure (sitemaps, RSS, JSON-LD) — 1 prompt, 0 follow-ups
- Content scanner — 1 prompt, 0 follow-ups

**Low spec, many iterations:**
- Ask AI text formatting — 1 prompt + 8 follow-ups, ~35 min total
- Badge component — 1 prompt + 5 follow-ups, ~15 min total
- Mobile header — 1 prompt + 3 follow-ups, ~10 min total

The forum was literally 100x more complex than the badge. It took fewer cycles because the specification was complete.

**The rule of thumb:** The cost of a prompt is not writing it — it's the iteration that follows. Two extra minutes specifying an outcome saves 10-30 minutes of iteration. This ratio holds consistently.

**When to specify more:**
- The feature has a visual surface users will see
- There are multiple interacting design decisions (layout + typography + spacing)
- You have opinions about how it should look (you will iterate anyway — capture those opinions now)

**When quick-and-iterate is fine:**
- Pure logic/data work with no visual output
- One-off scripts you'll run once
- Features where you genuinely don't care about the presentation

### 3. Not batching costs more than you think

Every prompt carries fixed overhead: context switching, reviewing output, testing, committing. This overhead is roughly constant whether you're making one change or ten.

If you're doing the same type of work repeatedly — adding items to a database, fixing similar bugs across files, updating related components — batch them. One prompt that says "add these 8 items" is dramatically cheaper than 8 separate prompts adding one item each, even though the total work is identical.

This isn't just about saving time. Batching also produces more consistent results because the AI handles all items in the same context with the same patterns.

---

## The prompt audit: do this for your own project

The most valuable thing I did wasn't reading prompting guides or watching tutorials. It was **asking the AI to analyze my actual prompting patterns** — with real data from our conversations.

Here's why this works better than generic advice: prompting guides tell you what good prompting looks like in theory. A prompt audit tells you what **your** prompting looks like in practice. The gap between those two is where all your wasted cycles live.

**The prompt again, for easy copy-paste:**

> Go through my full chat history in this project and analyze how I prompt. I'm not a software engineer. I have no coding background. Prompting is how I build, so my prompting patterns are essentially a mirror of how I think about building software. I want an honest, specific assessment of how I'm doing. What's working, what's not, and what's holding me back. Use real examples from our conversations to back up what you find. The end goal: I want to develop sharper instincts for translating ideas into prompts so I can build faster and waste fewer cycles.

**Adapt it to your situation.** If you are an engineer, change the framing. If you're using AI for writing instead of building, shift the focus. The core structure works regardless: analyze my patterns → show what works → show what doesn't → back it up with examples → give me actionable changes.

**What to look for in your results:**
- Which prompts shipped in one shot vs. required many iterations? What was different about them?
- Where are you repeatedly correcting the same type of mistake?
- Are you in "outcome mode" or "delta mode" for most of your work?
- What decisions are you making reactively that you could make upfront?

---

## The meta-lesson

The analysis revealed something I didn't expect: **the skills that make you good at prompting are the same skills that make you good at building products.** Thinking in systems, not features. Specifying outcomes, not processes. Encoding quality as constraints, not hopes. Automating everything you do twice.

Prompting isn't a parlor trick or a shortcut. It's a design discipline. The better you get at decomposing what you actually want — precisely, completely, in terms of outcomes rather than corrections — the better your results get. Not just with AI, but with any collaborator, human or otherwise.

The prompt at the top of this post took 30 seconds to write and saved me hours of future work. Try it on your own project. The honest feedback is worth more than any prompting guide — because it's about *your* patterns, not someone else's theory.

---

*Built [onprediction.xyz](https://onprediction.xyz) — a prediction market knowledge hub — entirely with Claude Code and zero coding background.*
