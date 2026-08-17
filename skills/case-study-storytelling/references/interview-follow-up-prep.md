# Interviewer Follow-Up Preparation

Use this reference only in `interview` mode when the user asks to anticipate questions,
pressure-test the presentation, or prepare answers after the story architecture is
approved or explicitly accepted as clear and a script or talking-point layer exists.

Read the complete story plan and complete script before generating questions. Treat
both as source material: the story plan defines the approved visible claims, evidence,
gaps, and causal spine; the script adds the claims, interpretations, transitions, and
emphasis the presenter will actually say. If the two conflict, preserve the approved
story facts and flag the spoken mismatch instead of silently reconciling them.

## 1. Build one visible-and-spoken claim inventory

Extract and connect:

- **Visible claims:** slide titles, on-screen statements, artifacts, evidence statuses,
  outcomes, and unresolved gaps from the story plan;
- **Spoken claims:** talking points, opening and closing lines, causal connectors,
  emotional interpretations, ownership language, and transitions from the script;
- **Claim boundaries:** what the supplied evidence supports, what remains inferred, and
  what the presenter must not imply;
- **Mismatches:** spoken claims that are stronger, broader, more causal, or more certain
  than the approved story plan.

Use stable slide IDs to align each spoken claim with the story beat it explains. If a
script line cannot be anchored to the story plan, treat it as a potential follow-up risk
and inspect whether it needs evidence, revision, or removal.

## 2. Predict verification questions from both inputs

Do not begin with a generic behavioral-question bank. Inspect the story's strongest
claims and gaps together with the script's spoken claims, causal leaps, unusually broad
ownership, emotional interpretation, contested diagnoses, strategic persistence, and
outcome language. Predict the questions an interviewer would need to ask before
believing what they will see and hear.

Start with these recurring pressure axes, then keep only the ones the case actually
creates:

- **Ownership:** What judgment, artifact, or decision was the creator's? What did the
  manager, PM, research, field, engineering, or leadership contribute?
- **Evidence:** What was directly observed, what was inferred, what alternatives were
  considered, and what later evidence changed confidence?
- **Judgment and influence:** Why was continuing, stopping, narrowing, escalating, or
  waiting rational? What were the opportunity cost, checkpoint, and stop condition?
- **Outcome and causality:** What shipped, who used it, what behavior changed, and which
  business outcomes remain hypotheses rather than measured effects?
- Add technical feasibility, iteration quality, customer specificity, conflict, or
  failure only when a claim in the story makes that axis consequential.

Rank candidate questions by `likelihood × consequence × claim vulnerability`. Prefer
three to six high-leverage questions over a long exhaustive list. The most useful
question is often the one that tests the story's central claim, not the most common
interview prompt.

## 3. Build each question card

Give every card a stable `QUESTION-<TOPIC>` ID and include:

1. **Primary question** — use the direct, skeptical wording an interviewer may use.
2. **What they are testing** — name the credibility or seniority signal behind it.
3. **Likely drill-downs** — provide three to five questions that test specificity,
   alternatives, magnitude, ownership, or limits.
4. **Answer structure grounded in supplied facts** — use five to seven numbered steps
   that form a complete reasoning path without becoming a polished spoken script.
5. **Claim boundary** — state what the evidence does not justify saying.
6. **Next fact to sharpen** — ask for the single missing fact most likely to improve the
   answer's defensibility.
7. **Story and script anchors** — link the question to the slides and talking points
   whose visible or spoken claims created it.

Merge factual material and answer structure into one readable sequence. Do not leave a
rich factual-notes block beside an overly compressed answer outline. Preserve useful
detail while making the reasoning order scannable.

Do not write a verbatim answer unless the user explicitly requests one. The default
output is a walking spoken-answer structure: complete enough to follow, loose enough to
say naturally.

## 4. Structure the reasoning, not the prose

Use this default progression when it fits the question:

`calibrate the starting claim → name direct evidence → show the creator's inference or
decision → name collaborators or constraints → acknowledge the strongest alternative →
state the outcome → draw the claim boundary`

Adapt the sequence to the facts. Do not force every step into every answer. Prefer a
specific contrast, decision, or metric definition over abstract self-description.

For ownership questions, separate:

- the creator's design spine: framing, synthesis, framework, pivotal UX judgment, and
  artifacts;
- collaborators' consequential ownership: sponsorship, domain evidence, roadmap,
  formulas, implementation, rollout, or business decisions;
- what changed when an exploration became an official product;
- what likely would not have happened, or would have happened more slowly, without the
  creator—without claiming lone-hero execution.

For persistence questions, require evidence for continuing, a finite checkpoint,
opportunity-cost control, a stop condition or mode change, and a lower-investment
fallback such as moving the idea to the back burner. Persistence is a variable
investment strategy, not indefinite effort.

## 5. Enforce evidence and causality boundaries

Keep these outcome levels separate:

`learning → sponsorship → roadmap commitment → shipped scope → reach → recurring use →
behavior change → retention / renewal / revenue`

Do not substitute an earlier level for a later one. State the highest measured outcome
confidently, then state the causal limit without apologizing.

For every important metric, sharpen:

- unit: user, account, customer, deal, or session;
- cumulative versus period-specific count;
- first-time reach versus recurring behavior;
- frequency and time window;
- denominator and population definition;
- duration over which the level was sustained.

When business attribution is weak, inspect the causal chain. A product that directly
removes a documented deal blocker has a shorter attribution chain than a product that
acts early in a multi-factor renewal journey. Use comparisons only to explain the
difference; do not import one project's proof into another.

Distinguish experiment types precisely:

- A randomized holdout may require deliberately withholding a beneficial experience
  and accepting avoidable customer or renewal risk. Name when this is commercially
  irresponsible or potentially harmful rather than proposing it casually.
- An observational cohort can compare naturally exposed and unexposed groups without
  withholding the product, but self-selection and confounding limit causal claims.
- Do not conclude that measurement is impossible merely because randomized withholding
  is unacceptable. Name what directional evidence is feasible and what remains
  unproven.

## 6. Iterate from rough user facts

Treat rough, code-switched, or spoken notes as source material rather than draft prose.
Extract and classify each addition as:

- direct fact;
- interpretation or inference;
- metric definition;
- collaborator contribution;
- decision or tradeoff;
- constraint or counterfactual;
- comparison example;
- unknown.

Update the existing card instead of appending a second answer. Place each fact in the
reasoning step it supports, revise the claim boundary when needed, and replace the
`Next fact to sharpen` prompt with the next highest-value unknown. Keep supporting
examples optional when they would otherwise hijack the main answer.

If the user's fact corrects the question's premise, revise the premise. If it only
strengthens one branch, preserve uncertainty elsewhere. Never turn confidence in the
idea into evidence that the idea was correct.

## 7. Render the workspace in the story-plan HTML

Append one compact `Interviewer follow-up workspace` section after the core story-plan
review content. Use collapsible question cards with a readable numbered answer
structure. Keep `What they are testing`, drill-downs, claim boundary, next fact, and
story/script anchors visually distinct.

Reuse the existing bilingual, navigation, accessibility, and direct-from-disk rules in
[html-review-output.md](html-review-output.md). Open the local HTML directly; do not
require localhost, a development server, CDN, or an external review session.

In the review note, invite the user to comment on a question, structure step, claim
boundary, or missing fact. Fold later facts back into the same UI rather than generating
parallel scripts or answer versions.

## Quality check

- Every primary question is caused by a visible story claim, spoken script claim, gap,
  or mismatch between the two.
- The complete approved story plan and complete script were both inspected.
- Spoken claims remain aligned with the story plan's evidence and claim boundaries.
- The answer structure uses only supplied facts and labels inference honestly.
- Ownership includes collaborators without dissolving the creator's agency.
- Metrics have a clear unit, time window, behavior definition, and denominator when
  known.
- Shipped product, adoption, and business impact remain distinct.
- Counterfactuals and causal claims respect measurement feasibility and bias.
- Each card ends with one claim boundary and one next fact to sharpen.
- The workspace is structured preparation, not a memorized script.
