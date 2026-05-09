# Prompting Analysis — OnPrediction Project

An honest assessment of how I prompt, based on 83 commits, 18 PRs, instruction documents, the scanner system, thread drafts, and the full arc of this project from February 2 to March 24, 2026.

---

## Prompting Profile

I'm not prompting like someone who doesn't know how to code. I'm prompting like a **product architect who happens to use natural language as their build tool.** The distinction matters — most non-engineers prompt for features. I prompt for systems.

---

## What's Working

### 1. I build constraint systems, not feature requests

My strongest instinct is **encoding taste as rules**. The `prompt.md` banned-words list — *"thought-provoking, rigorous, compelling, essential reading, deep dive"* — isn't just preference. It's a compiled understanding of how LLMs fail at editorial writing, turned into a hard filter. Same pattern with the scanner's `exclude_patterns`: filtering out "giveaway," "airdrop," "Kelly .* bankroll" to separate prediction market theory from gambling content.

This is my superpower. Most people say "write a good blurb." I say "write 2-3 sentences, direct and factual, no em dashes, never use these 12 words, never use the 'Not X but Y' construction." That eliminates an entire class of bad outputs before they happen.

### 2. My single-shot feature prompts actually land

The forum (3,900 lines, 27 files, 4 Supabase migrations) shipped in one commit with zero same-day fixes. User profiles shipped 14 minutes later. The hero banner 12 minutes after that. The growth features mega-commit (3,017 insertions, 34 files) delivered three distinct features at once.

I can describe a desired end state clearly enough that a complete working implementation comes back. That's not a trivial skill. It requires having a mental model of the system that's accurate enough to specify from — even without knowing the implementation details.

### 3. I learn from failures and make them permanent

Every mistake becomes a constraint that prevents recurrence:
- The root layout client component bug → `feedback_root_layout.md` + Critical Rule in CLAUDE.md
- Committing to main → `feedback_branching.md` + enforced workflow
- Manual git steps after article addition → `feedback_article_auto_merge.md` + automated in the skill
- Title casing inconsistency → enforcement rule added after article #90
- Concept sprawl → 5-concept max added after a batch of 5 articles

I've built a **ratchet**. Quality only moves in one direction. This is genuinely unusual — most users correct the same mistake repeatedly instead of encoding the fix.

### 4. I build infrastructure to reduce my own friction

The progression: manual article addition → `ADD_ARTICLE_INSTRUCTIONS.md` → `/add-article` skill → Twitter scanner for discovery → auto-merge workflow. I systematically eliminated every manual step in my content pipeline until the loop is: scanner finds content → I approve → one command adds and ships it.

This is systems thinking. I'm not just using AI to build features — I'm using AI to build tools that make using AI faster.

---

## What's Not Working

### 1. The "fix chain" tax on visual/formatting work

My worst efficiency pattern is **rapid micro-iteration on visual details**. The data is clear:

- **"New" badge**: 6 commits in 5 minutes (add badge → fix truncation → try serif italic → switch to sans → show full title → move badge before title)
- **Mobile header**: 4 commits in 4 minutes (auth into hamburger → auth inline → height increase → another adjustment)
- **Ask AI formatting**: 7 commits in 31 minutes (formatting → animations → formatting again → h3 headings → h2 headings → text-lg → paragraph spacing)
- **Footer**: 2 commits in 6 minutes

Each of these is a test-in-browser → describe-what's-wrong → get-fix cycle. The problem isn't that I iterate — iteration is good. The problem is that **I'm describing visual state changes one at a time instead of specifying the visual outcome upfront.**

When I say "make the heading bigger" and then "actually use h2" and then "make it text-lg" — that's three round trips for one decision. If I'd said "headings should be h2 elements styled at text-lg with adequate spacing below" I'd have gotten there in one.

**The underlying gap:** I'm very good at specifying *systems* (data schemas, taxonomies, workflows) but I fall back to reactive, trial-and-error prompting for *visual design*. I know what looks right when I see it, but I haven't developed the vocabulary to describe it before seeing it.

### 2. I sometimes skip the "describe the end state" step that makes my big prompts work

My best prompts work because they describe outcomes: "a forum with posts, comments, upvotes, single-level threading, markdown support." My worst prompts describe the delta from current state: "move this here," "make that bigger," "switch to sans-serif."

The forum succeeded in one shot because I specified what it should be. The Ask AI formatting failed seven times because I kept specifying what was wrong with the last attempt. These are two fundamentally different prompting modes, and I should be aware of which one I'm in.

### 3. No upfront design spec for UI-heavy features

The Ask AI feature needed 9 follow-up commits. The "New" badge needed 6. These features had well-specified *behavior* (rate limiting, citation format, conversation persistence) but no specification for *appearance*. Compare this to the scanner, which shipped clean — because a data pipeline doesn't need visual iteration.

When my features have a visual surface, I'm paying a tax for not describing the visual outcome upfront. Something like: "Responses should render as body text (text-base) with h2 section headings (text-lg, font-semibold). Citations appear as inline links. Space between paragraphs should match the article card blurbs" would have saved 5+ commits on the Ask AI feature.

### 4. Batch sizes are inconsistent

My article batches went: 1, 1, 2, 3, 1, 5, 1, 3, 4, 8, 1. The large batches work fine. But the single-article additions, each getting their own branch/PR/merge cycle, create overhead. I've automated the workflow (good), but I haven't batched the input (the decision of which articles to add). This is a process issue more than a prompting issue, but it costs real time.

---

## What's Holding Me Back

### 1. I don't have a visual design language

My constraint system for text quality is mature (banned words, sentence counts, tone guidelines). My constraint system for visual design is almost nonexistent. I iterate to visual outcomes instead of specifying them.

What would help: build a reference vocabulary. Not a design system — just a cheat sheet of terms. Things like: "compact" means 8px padding and text-sm. "Airy" means 16-24px padding and text-base. "Prominent" means font-semibold text-lg. If I had this, I could say "compact card layout with airy spacing between sections and prominent headings" instead of "make it smaller... no, add more space... the heading should stand out more."

### 2. I conflate "ship fast" with "specify once"

My best work happens when I specify completely and let it build (forum, SEO infrastructure, scanner). My most expensive work happens when I ship something half-specified and then iterate in real time (badge placement, header layout, Ask formatting).

The instinct to ship fast is good. But "fast" for me doesn't mean "start building immediately" — it means "spend 2 extra minutes describing the visual outcome, then build once." My own data proves this: the forum (high specification, one shot) was cheaper than the Ask AI formatting (low specification, nine iterations), even though the forum was 10x more complex.

### 3. I haven't built a "visual spec template" the way I built prompt.md

I created `prompt.md` to solve the problem of inconsistent article curation. It works because it constrains Claude's output before generation. I need the equivalent for visual features — a template that forces me to specify layout, spacing, typography, and interaction patterns before the first line of code gets written.

Even something like: "Before any UI feature, specify: (1) layout structure, (2) font sizes and weights, (3) spacing/padding values, (4) colors if non-default, (5) responsive behavior, (6) animation if any" would eliminate most of my fix chains.

---

## The Bottom Line

I've developed a genuinely effective prompting methodology for systems and logic — taxonomies, constraints, workflows, data pipelines. My instinct to encode quality rules, automate friction away, and specify complete end states is strong and has produced a production-quality site.

My weak spot is the visual layer. When I can't see the output in my head before building, I fall into a costly describe-what's-wrong loop. The fix isn't learning CSS — it's developing the same kind of constraint vocabulary for visual design that I already have for content quality. I solved the editorial quality problem with `prompt.md`. Build the visual equivalent, and I'll cut my iteration cycles in half.
