# HTML Review Output

Use these rules only when producing the static review surface. They govern presentation,
not story reasoning.

## Contents

1. [Runtime and design system](#runtime-and-design-system)
2. [Page structure](#page-structure)
3. [Navigation and cross-references](#navigation-and-cross-references)
4. [Editorial hierarchy](#editorial-hierarchy)
5. [Evidence and findings](#evidence-and-findings)
6. [Bilingual and accessible output](#bilingual-and-accessible-output)
7. [Private versus rendered](#private-versus-rendered)
8. [Final checks](#final-checks)

## Runtime and design system

Unless the user specifies another path, create
`.case-study-reviews/<case-slug>-story-plan.html`.

Before styling, inspect the project where the skill is invoked for an explicit design
system, token file, or style guidance. Resolve styling in this order:

1. a design system or visual direction explicitly named by the user;
2. project-local design-system files, tokens, CSS variables, or documented conventions;
3. a quiet neutral editorial system.

Treat the project-local system as the source of truth when it exists; do not import a
reference project's system into an unrelated project. Reuse its typography, color,
spacing, border, and component grammar where they support long-form reading. Copy only
the needed resolved values into inline CSS so the output remains portable; do not
require the project's build system at runtime.

Make the file standalone, responsive, accessible, and readable directly from disk
without a server, CDN, build step, or external dependency. Keep CSS inline. Use
JavaScript only for small progressive enhancements. Do not start a server, background
process, or external review tool.

## Page structure

Render these sections in order:

1. **Working assumptions** — source, audience mode, duration, slide count.
2. **Story contract + findings** — one `central question → recommended argument`
   contract and no more than three findings. Candidate diagnosis appears only in
   `interview` mode. Do not render payoff as a separate line.
3. **Integrated story map** — cover, true section covers, act markers, and all slides in
   sequence. Put missing pages between slides and missing information inside slides.
4. **Evidence checklist** — at most eight high-leverage items linked to their
   `SLIDE-##`, `GAP-##`, or `ASSET-##`.
5. **Review decisions** — at most three one-sentence questions.

Immediately after the story contract, add one compact link to the review decisions so
the reader knows what feedback is needed without reaching the end.

If the foundation check is incomplete, open this section with a prominent, concise
`This story is not complete yet` notice. Link the missing stake, cause-and-effect chain,
real challenge, or ending lesson to its `GAP-##`. Explain that the plan helps the user
work out the story; it does not claim the missing parts are already true.

## Navigation and cross-references

Give a long report a sticky numbered table of contents, active section state, and thin
scroll-progress indicator. Make every reference to `SLIDE-##`, `GAP-##`, `ASSET-##`,
`SECTION-##`, or another section a real anchor link.

Give each referenced surface a matching `id`. Use `GAP-##` for missing truth or evidence
and `ASSET-##` for a settled story beat that still needs visual production. When an
anchor targets a collapsed slide, open that slide so the reader lands on the relevant
beat. Keep stable IDs identical across languages.

## Editorial hierarchy

Prefer one stable editorial grammar over repeated box-in-box treatments:

- one dominant story-contract surface;
- numbered section headers and one consistent reading axis;
- story chapters separated by spacing, not container cards;
- white slide cards with unboxed internal fields;
- chapter titles as the strongest level and slide claims as the next;
- one shared label/body treatment for screen, artifact, talk, and transition.

When `SECTION-##` strips already identify story transitions, do not add a second set of
auto-numbered chapter markers or dividers above them. One grouping signal is enough.

Use content-specific structures—flat assumptions, a contract block, collapsible slide
rows, a numbered checklist, and review questions—rather than one rounded card for every
kind of information. Avoid gradients, heavy shadows, saturated full-card backgrounds,
decorative dividers, and redundant key-page or risk badges.

Move directly from the Story Map heading into the slide sequence. Do not repeat the
argument as a keyword rail, route synopsis, legend, chapter summary, or explanatory
paragraph. Let chapter numbering and beat-led slide titles carry the arc.

Default to focus view: keep every title visible, collapse slide details consistently,
and expose only actionable gaps until the reader opens a slide or selects full detail.
Treat the collapsed rows as an index of the story.

Keep each slide card near 60–110 words and each gap near 40–70 words. Use one repeated
body grid; make gap callouts full width. Combine talk track and transition when their
separation adds little. Render format and time only when explicitly requested.

## Evidence and findings

Put an evidence-status chip in each slide's upper-right corner:

- `supported`: quiet green outline;
- `stated-only`: amber;
- `inferred`: blue;
- `missing`: red.

Always pair color with text. If four or more statuses appear, add a one-line legend at
the Story Map header. Let common `supported` states recede so uncertain states identify
where feedback matters.

Write gaps and review questions in plain language. For example: `The story does not yet
show what made this project genuinely hard.` Avoid abstract diagnostic jargon.

Rank findings by consequence. Use a short severity label only when it helps triage.
Reserve the loudest treatment for the single issue that truly blocks the deck; do not
give every finding equal weight.

For an existing deck, show source slide numbers and revision actions. Put each visible
`COVER-00`, `SECTION-##`, `SLIDE-##`, or `GAP-##` ID on the same primary row as its
beat-led title.

Treat every collapsed slide header as a responsive component, especially when another
column or narrow viewport reduces the story-plan width. Keep the beat-led title readable
as a phrase; never let a rigid metadata grid squeeze it into per-word or per-letter
wrapping. When the ID, title, action, and evidence chip no longer fit with the title on
one or two normal lines, switch layout based on the slide card's own width: put the
stable ID and chips in the first row, then give the title the full second row. Prefer a
container query over a viewport breakpoint because the same card may appear at different
widths within one page. Keep `word-break: normal` and avoid `overflow-wrap: anywhere` on
the title.

## Bilingual and accessible output

Include an `EN / 中文` switch unless the user requests one language. Embed both
languages locally and translate for meaning. Preserve the same story contract,
findings, statuses, and stable IDs in both views. The switch may follow browser language
on first visit and remember the choice locally.

Use readable body type, WCAG AA contrast, explicit focus states, and no visible text
below 16px. Prevent horizontal overflow; use `minmax(0, 1fr)`, `min-width: 0`, wrapping,
and narrow-layout adaptations where needed.

Add a short “How to review” note asking the user to cite stable IDs or quote exact text
in chat.

## Private versus rendered

| Computed privately | Rendered |
|---|---|
| Evidence ledger | Working assumptions, including audience mode |
| Timing and total runtime | Story contract and up to three findings |
| Format classification | Beat-led story map |
| Audience-signal mapping | Evidence-status chips |
| Story keywords | Slide-local gaps |
| Payoff recovery mapping | Evidence checklist |
| Title-only test and one-line arc | Review decisions |
| Storytelling definition of done | — |

## Final checks

- Remove repeated facts across the contract, findings, gaps, and slide fields.
- Keep secondary detail in the checklist instead of repeating it below every slide.
- Put unresolved foundation questions first in Review decisions.
- Verify all anchor targets, collapsed-slide behavior, language switching, overflow,
  and collapsed-title readability at full and narrow card widths.
- Privately check the storytelling definition of done, title-only arc, payoff recovery,
  slide budgets, and total runtime.
- In chat, link the HTML and give only a short summary.
- Keep the review precise enough for a separate visual or production skill to implement.
