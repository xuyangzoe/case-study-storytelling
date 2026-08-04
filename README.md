# Case Study Storytelling

A Codex skill for turning a product-design story draft, case-study webpage, or existing
deck into an evidence-led narrative diagnosis and a sequential slide-by-slide story map.

It focuses on story structure before visual design: argument, stakes, causality,
artifacts, evidence, pacing, iteration, and story gaps. The output is a standalone HTML
review file with an English / Chinese switch by default.

## Install

Install the skill from `skills/case-study-storytelling`, or copy that directory into a
Codex skills directory.

## Use

Ask Codex to use `$case-study-storytelling` with one or more of:

- a complete story draft;
- a case-study webpage;
- an existing presentation deck;
- optional audience context such as a job description or company notes.

The skill does not design or implement the final deck. It produces the story plan that
a separate visual or presentation workflow can use.

## Optional local profile

Personal installations may add
`skills/case-study-storytelling/references/local-profile.md` to load a private audience
lens or downstream handoff. This file is intentionally not included in the public
distribution; the core workflow remains unchanged.

## License

MIT. See [LICENSE](LICENSE).
