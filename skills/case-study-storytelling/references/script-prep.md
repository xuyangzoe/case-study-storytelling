# Case-Study Performance Preparation

Read this reference only after the storyline has passed the approval gate in
`SKILL.md`. This is a second-pass performance layer, not a substitute for story
architecture.

## Output contract

Default to flexible talking points, not a memorized script. For each approved slide,
prepare:

- **Audience emotion:** the feeling to establish or the emotional shift to create;
- **Talking points:** two or three concise beats that supply causality, context, or
  judgment the screen cannot communicate alone;
- **Causal emphasis:** a truthful contrast, consequence, reversal, or time turn when
  one exists;
- **Handoff:** why the next slide must follow, unless the existing story-map handoff is
  already sufficient.

Add a stage cue only when a pause, click, reveal, quote, or silence is essential to the
meaning. Do not add a generic delivery instruction to every slide. Write a verbatim
line only for a supported quote, a deliberately crafted opening or closing sentence,
or when the user explicitly requests exact wording.

Preserve the lightweight-cover rule when crafting the opening line. Do not promote the
first narrative stake, outcome, or later emotional interpretation into the cover.

## Performance-detail gaps

Before finalizing talking points, audit whether each pivotal beat has enough supplied
detail to perform its intended emotional and narrative job. If an important detail is
missing, do not invent it or conceal the absence with generic prose. Add a stable
`PREP-GAP-##` beside the affected slide with:

- **Intended effect:** what the audience should feel or understand;
- **Missing detail:** the specific kind of detail needed;
- **Prompt:** one concrete, answerable question for the presenter;
- **Truthful fallback:** the restrained talking point to use if the detail is unavailable.

High-value detail types include the plan or expectation before a low; a time, place,
action, quote, silence, or reaction at a turning point; the practical cost of continuing
or stopping; the reasoning behind legitimate pushback; an observed validation behavior;
a time-linked consequence; or the belief earned by the ending.

Use `PREP-GAP` only when the approved storyline is sound but the performance layer lacks
a memorable or emotionally legible detail. Keep `GAP` for missing story logic or
evidence, and `ASSET` for missing visual material. Do not create a gap for every slide.
Prioritize the few details that could materially strengthen an expectation, low point,
decision, turn, consequence, or close. Ask for them in small batches, then replace each
resolved gap with the supplied detail and recheck the adjacent handoffs and emotional arc.

## Talking-point rules

- Preserve factual guardrails, evidence status, collaboration, and confidence horizons.
- Orient before process. Name the goal, question, or decision before describing methods,
  channels, or execution.
- Choose tense by narrative function. Use past tense for completed events, historical
  present to re-enter a moment, and present tense for truths that still hold today.
- Use `I` for owned judgment and name collaborators' material contributions.
- Let the screen carry visible evidence. For demos and self-explanatory artifacts, use
  the talk to frame why they matter, what remains uncertain, and what changed; do not
  narrate the screen.
- Before a low point, establish the plan, why it seemed reasonable, and what it was
  expected to change. Let the audience invest in the plan before revealing its failure.
- Prefer one concrete time, place, action, quote, silence, or reaction over emotional
  adjectives. Let supported detail carry the feeling.
- Preserve the story's knowledge state. Do not use hindsight to announce recognition,
  sponsorship, or success before the moment that makes it knowable.
- When claiming expertise, name the distinctive judgment or product capability that
  the expertise enabled. Do not leave expertise as a self-description.
- Treat pushback as legitimate reasoning. Explain why the concern was reasonable and
  what the presenter reconsidered. Build tension through the practical consequences of
  unresolved disagreement—cost, delay, maintenance, risk, or lost learning—without
  flattening stakeholders into resistance or portraying collaboration as dysfunction.
- Name the exact validation layer: problem, system or framework, interaction model, or
  feature priority. Do not turn resonance, usability, enthusiasm, or urgency into a
  generic claim that “customers validated it.”
- Make adjacent beats act on one another. Prefer a real `BUT → THEREFORE`, `YET → SO`,
  `UNTIL → THEN`, or equivalent causal shape over a list joined by `and`.
- Avoid canned antithesis such as “it was not X; it was Y.” State the claim directly;
  use contrast only when the story contains a real collision, limit, or reversal.
- Do not force a connector onto every slide. Highlight one only when the underlying
  story contains a genuine contrast, consequence, reversal, or time turn.
- Keep the connector inside the sentence it changes; do not render a decorative rail
  of disconnected transition words.
- Protect the low. State what failed to change, what remained uncertain, or what the
  resistance cost before moving to the response.
- Carry each meaningful change's approved causal loop into the talk: reason, change,
  consequential impact, and observed outcome or remaining uncertainty. Compress changes
  that did not materially affect the story.
- Sequence outcomes with concrete time anchors and causal links. Let each success answer
  an earlier tension instead of becoming an accomplishment list.
- Keep talking points speakable and scannable. They are prompts for improvisation, not
  prose paragraphs to memorize.
- End with one earned umbrella insight rather than a recap or several parallel slogans.
  If the screen names multiple qualities, make the spoken close explain how they act on
  one another and what the presenter now believes.

## Slide-to-slide transitions

- Give every adjacent slide pair one speakable transition. Put it at the end of the
  current slide or the beginning of the next—not both.
- Make the transition explain why the next slide must follow. Let it answer,
  complicate, contrast with, or act on the preceding beat; never reset the topic.
- Prefer truthful causal connectors such as `BUT`, `THEREFORE`, `SO`, `YET`,
  `UNTIL`, `THEN`, or `BECAUSE` when they express the real relationship. Use fewer
  additive `and` transitions that flatten events into a process diary.
- Vary the connector and sentence shape. Do not manufacture conflict or repeat a
  transition word when the evidence supports only sequence or continuation.
- During review, read only the final talking point of each slide and the opening
  talking point of the next. Revise until they form one continuous causal story.

## Emotional arc

Use audience emotions such as `concern`, `uncertainty`, `overwhelm`, `disappointment`,
`discouragement`, `tension`, `surprise`, `relief`, `hope`, `confidence`, or `quiet
pride`. A transition such as `uncertainty → resolve` is valid when the slide truly
changes the audience's state.

Do not expose editorial functions such as `reframe`, `gravity`, `clarity`, `turn`, or
`release` as emotion labels. They may remain private implementation tones for visual
styling, but the visible tag should describe what the audience should feel.

Across the full deck, vary emotional pressure deliberately:

1. establish the stake without prematurely resolving it;
2. let early clarity create hope;
3. make resistance, failure, silence, or reversal materially felt;
4. earn the turning point through a decision or supported moment;
5. release tension through consequences, not adjectives;
6. close with the specific emotion and wisdom the story earned.

## Per-slide data shape

Use this conceptual schema when a structured representation is useful:

```text
SLIDE-##
emotion: uncertainty → clarity
talking_points:
  - The answer did not begin cleanly.
  - BUT the mess exposed recurring patterns.
  - THEREFORE I could form the first model we could test.
handoff: A model existed. The organization still had to care.
stage_cue: optional; only if meaning depends on it
prep_gap: optional; only when a pivotal beat lacks supplied performance detail
```

## Review checks

- The talking points still follow the approved causal order.
- The opening stays light, and each consequential change has both a reason and an impact.
- No sentence invents evidence, a reaction, a failure, or a memorable moment.
- Important missing performance details remain visible as `PREP-GAP` items rather than
  being disguised by generic language.
- Every visible emotion tag is an emotion, not an editorial label.
- Strong connectors mark real story logic and remain legible without overuse.
- Every slide boundary has one natural, speakable handoff into the next slide.
- The talk complements rather than duplicates the screen.
- The low remains low long enough for the later success to matter.
- The presenter can scan the points and speak naturally without memorizing prose.
