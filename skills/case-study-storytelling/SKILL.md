---
name: case-study-storytelling
description: Shape product-design case-study storytelling by turning a story draft, webpage, or existing deck into an evidence-led argument, causal narrative arc, and sequential slide-by-slide story map with artifacts and story gaps. Use before visual design or implementation for a live talk, interview, portfolio review, or self-guided deck.
---

# Case Study Storytelling

Shape the argument before the visuals. Read
[storytelling-principles.md](references/storytelling-principles.md), then follow this
workflow. Read [html-review-output.md](references/html-review-output.md) only when
producing the review file. If `references/local-profile.md` exists, read it as an
installation-specific extension. It may add an audience lens or downstream handoff,
but it must not weaken the evidence guardrails or replace the core workflow.

## Guardrails

- Use only supplied or explicitly cited sources; never import another case study's context.
- Do not invent evidence, metrics, ownership, collaboration, or outcomes.
- Never invent a stake, conflict, failure, turning point, consequence, or lesson to
  complete an arc. A plausible story is not a truthful story.
- Distinguish what shipped from what remained exploratory.
- Preserve the creator's voice, but replace vague claims with concrete decisions.
- Adapt emphasis to the supplied audience without turning the story into a competency checklist.
- Do not design or implement the eventual deck. The HTML is only a review surface.

## Workflow

### 1. Inspect

- **Story draft:** extract events, decisions, evidence, agency, and outcomes.
- **Webpage:** inspect the whole page and meaningful artifacts; do not mirror scroll
  sections into slides.
- **Existing deck:** inspect slides, notes, appendix, and artifacts; retain source slide
  numbers for revision mapping.
- **Target context:** inspect supplied JD, company material, founder notes, and candidate
  rubric. Separate explicit signals from working hypotheses.

Use the appropriate file-reading capability. Prefer the latest explicit source when
materials conflict. Infer missing audience, format, duration, or count only when safe,
and label the assumption. Explicitly set `audience mode` to `interview`, `portfolio`, or
`self-guided`; this controls whether candidate-fit findings appear in the output.

### 2. Build a private evidence ledger

Record the stable elephant, any deeper active blocker, the tension question, stakes,
role, collaborators, beliefs, decisions, evidence, artifacts, outcomes, metrics,
confidence horizon, highs and lows, five-second turn, earned wisdom, and unresolved
questions. Track learning progress separately from organizational traction. For each
artifact, record its intended message and proof. Do not output the ledger unless useful.

Separate validation of the problem, system, interaction model, and feature priority.
Enthusiasm is not priority; a written claim is not proof.

When target context is supplied, select 2–4 audience signals the case can credibly
prove. Do not force every case to cover every trait. Record the moment, action,
constraint, and outcome that prove each signal. Keep this mapping private unless the
audience mode is `interview`. If target context is absent, skip signal selection; never
render candidate-fit material outside `interview` mode.

### 3. Diagnose the story and audience fit

State the current and recommended arguments in one sentence each. Identify the primary
proof, strongest beat, biggest risk, broken causal links, and the unresolved question
that carries the middle.

Run a story-foundation check before treating the map as complete. Confirm from supplied
facts:

- the highest defensible customer or business stake for the opening;
- a causal chain from problem through changed decisions to outcome;
- a real source of resistance, low point, constraint, uncertainty, tradeoff, rejected
  assumption, or failure that makes the outcome non-inevitable;
- one specific ending wisdom earned through the project.

If any foundation is absent, still build a useful **provisional plan**. Begin the visible
output—before diagnosis or slides—with `Provisional story — foundation incomplete` and
name the missing foundations. Assign each one a stable `GAP-##`, place it where it
belongs in the sequence, and turn it into a targeted review question. Do not write slide
claims that depend on facts the user has not provided. Prefer a real failure or lesson
when one exists, but never force literal failure; credible resistance or uncertainty
can create the required rise and fall.

In `interview` mode, integrate the 2–4 audience signals this case can credibly prove into
the same diagnosis. Do not repeat the recommended argument as a separate candidate
thesis. Keep the visible diagnosis to one story contract plus no more than three short
findings; use ratings only when they change an editorial decision, and do not output a
comprehensive scorecard.

### 4. Shape one integrated story map

Build a decision-and-evidence arc, not a process diary. Every slide needs:

- one job and one primary type;
- a conclusion-led title;
- a privately tracked format and live-talk budget;
- minimum on-screen content and one named artifact plus the message it must land;
- at most one audience signal, only when the slide genuinely proves it;
- one talk-track focus and a causal handoff.

Start with a standalone `COVER-00` before `SLIDE-01`. Give it the project name, a
one-sentence premise, minimal role/context, and one hero artifact; budget 15–30 seconds.
Do not make the first narrative slide do double duty as the cover.

Budget content slides at 60–120 seconds and covers, transitions, or payoffs at 20–45
seconds. Split or cut when a slide exceeds two minutes, has two jobs, gives two
artifacts different messages, or makes text compete with the artifact. Choose
`standard`, `hero artifact`, `reveal`, `embedded experience`, or `transition`. Hero
artifacts get only a conclusion-led title and one focal annotation.

Do not turn every story beat into a slide. Put connective context in the talk track;
combine time-based beats in a timeline; use a separate slide only when the audience
must pause, reinterpret the story, or inspect distinct evidence. When persistence is
central, show a decision point, its opportunity cost, and the convictions that made
continuing rational. When an external event opens a strategic window, show the
preparation runway that made the moment actionable.

For a reveal or embed, specify `default → trigger → changed state → static fallback`;
the default must communicate the conclusion without interaction. Prefer replacing one
state with another in stable geometry instead of accumulating every layer on screen.
In timelines, compress routine activity and emphasize decisions and reversals. Require
one real iteration when available:
`before → evidence → changed decision → after → why better`.
Use a split screen, two-slide pair, or toggle. If evidence is absent, place a gap where
the iteration belongs; never invent it.

Insert a `SECTION-##` cover only at a true mode change such as
`problem → direction` or `product → delivery/outcome`. It must land one bridge thought,
answer “why are we changing topics now?”, take 15–30 seconds, and count toward total
runtime. Do not add decorative chapter dividers or repeat the previous slide's handoff.

Place every story problem where the reader encounters it:

- **Missing beat/page:** insert a gap card between the affected slides.
- **Missing information:** attach it inside the affected slide card.
- **Weak proof/artifact:** attach it to that slide's artifact field.
- **Cut/merge/move:** show the editorial action on the affected slide.

Give each unresolved truth or evidence item a stable `GAP-##` ID, priority, needed
evidence, and truthful fallback. Give settled story beats that still need a visual,
diagram, crop, or animation an `ASSET-##` production item instead. Verify details in
proportion to narrative consequence: prioritize facts that affect ownership, causality,
magnitude, or credibility. Never output separate gap, narrative-spine, and slide-plan
sections. If a problem affects the whole story, place it in the brief diagnosis rather
than repeating it across slides.

Label evidence status:

- `supported`: inspectable evidence supports the claim;
- `stated-only`: the input asserts it without substantiation;
- `inferred`: reasonable interpretation, not explicit fact;
- `missing`: required evidence is absent.

For an existing deck, map each planned slide to source slides and mark `keep`, `revise`,
`merge`, `split`, `move`, `replace`, or `new`.

Before rendering, run the title-only arc test as an action: extract the cover's opening
question and every `SLIDE-##` title in order, then write their one-line arc. Revise the
titles or sequence until the opening question and title group form a clear arc rather
than a result inventory. Map the opening question to the named `SLIDE-##` that explicitly
answers it; if no slide does, repair the story or mark the missing answer as a foundation
gap. Keep the one-line arc and payoff mapping private.

## HTML output

Follow [html-review-output.md](references/html-review-output.md). Keep the output focused
on story decisions; do not use visual polish to make unresolved narrative structure
appear complete.
