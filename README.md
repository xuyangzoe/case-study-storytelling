# Case Study Storytelling

**Plan it. Tell it. Defend it.**

A skill with three user-facing modes for taking a product-design case study from raw
material to interview readiness.

## Choose a mode

| Mode | Use it when | What it produces |
|---|---|---|
| `/plan` | You have a story draft, case-study webpage, or existing deck. Start here for a new story. | An evidence-led argument, narrative diagnosis, and slide-by-slide story map with artifacts and gaps. |
| `/script` | The story plan is approved and the slide sequence is close to final. | Flexible slide-aligned talking points, emotional movement, causal emphasis, and natural transitions—not a verbatim script unless requested. |
| `/follow-up` | The story, slides, and script are ready and you want to prepare for interviewer questions. | Questions caused by the story's visible and spoken claims, plus structured answers, drill-downs, claim boundaries, and missing facts. |

## Suggested workflow

Run the modes in this order:

```text
/plan → refine and approve the story → finalize the slides → /script → /follow-up
```

1. **Start with `/plan`.** Build and revise the argument, causal arc, evidence, gaps,
   artifacts, and slide sequence. Do not move on while a known gap could still change
   the core story.
2. **Bring the slides close to final.** Stabilize the slide order, titles, primary
   artifacts, and important reveals or interactions. Visual polish may continue, but
   the presentation's meaning and sequence should no longer be moving substantially.
3. **Run `/script`.** Prepare the delivery against the real slides so every talking
   point, emotional turn, and transition has a stable place.
4. **Run `/follow-up`.** Prepare interviewer questions after the script so the skill can
   pressure-test both what appears on screen and what the presenter plans to say.

During any stage, the agent may revise the current artifact in response to feedback
without silently advancing to the next mode.

The skill keeps story logic, delivery preparation, and interview defense connected to
one truthful source. It does not invent evidence, stakes, failures, emotions, metrics,
ownership, or impact.

## Also in this repository

[`app/`](app/) contains **MultiCat**, a shared cat-food management app for multi-cat
households, built from a product requirements document. It is a self-contained
TypeScript project (Express API, React client, shared domain logic) with its own
[README](app/README.md) and test suite, unrelated to the storytelling skill above.

## Install

Install the skill from `skills/case-study-storytelling`, or copy that directory into a
Codex skills directory.

## Use

Ask your coding agents to use `case-study-storytelling` with the mode you need. For
example:

```text
Use $case-study-storytelling /plan on this case-study webpage.
Use $case-study-storytelling /script on the approved story plan.
Use $case-study-storytelling /follow-up on the final story and script to prepare for interviewer questions.
```

For `/plan`, provide one or more of:

- a complete story draft;
- a case-study webpage;
- an existing presentation deck;
- optional audience context such as a job description or company notes.

The planning output is a standalone HTML review file with an English / Chinese switch
by default. The skill does not design or implement the final deck; a separate visual or
presentation workflow can use the approved story plan.

## Optional local profile

Personal installations may add
`skills/case-study-storytelling/references/local-profile.md` to load a private audience
lens or downstream handoff. This file is intentionally not included in the public
distribution; the core workflow remains unchanged.

## License

MIT. See [LICENSE](LICENSE).
