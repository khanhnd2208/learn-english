# UI/UX refactor plan — Pixel Parchment RPG

## Direction confirmed

Use the supplied image as a visual reference for an English-learning RPG interface: warm parchment surfaces, ink-like navy outlines, pastel category panels, crisp pixel-style headings and icons, visible progress meters, and encouraging language. Keep the product's vocabulary-learning identity and current learning mechanics. Use pixel display typography for short headings and labels; keep paragraphs, prompts, forms, and answer choices in a highly readable sans-serif.

## Principles

- Make learning actions feel like quests and progress feel collectible, without adding pressure, streak loss, or XP incentives that change learning rules.
- Use a small shared palette (parchment, ink, lavender, amber, rose, mint, sky) with consistent borders, corner cuts, and compact shadows.
- Give each screen a clear title, one primary action, and a compact progress/status summary.
- Use pixel art selectively for identity, rewards, and empty states. Keep dense vocabulary, test, and admin content legible first.
- Preserve accessibility: keyboard focus, reduced motion, contrast, responsive layouts, and non-color status cues.

## Rollout

1. **Foundation (started):** replace forest-green tokens with the parchment palette; set display/body typography roles; establish border, shadow, card, control, progress, and navigation recipes; define dark-mode equivalents.
2. **Shared shell and components:** align desktop sidebar, mobile navigation, buttons, cards, badges, dialogs, inputs, progress bars, empty/loading/error states, and icon framing.
3. **Learner dashboard and discovery:** create the overview as a quest hub; standardize set cards, enrollment, review and mistake-book entry points.
4. **Learning loops:** align set detail, practice, review tests, results, audio controls, and answer feedback while preserving task clarity and focus.
5. **Progress and motivation:** present XP, mastery, quests, rewards, notes, and daily summary as optional, calm RPG feedback.
6. **Admin and account flows:** apply the same visual language to content authoring, QA, disputes, settings, and sign-in without reducing data density.
7. **Responsive/accessibility pass:** verify mobile navigation, long English prompts, forms, keyboard states, reduced motion, and light/dark contrast on every route.

## Current implementation slice

The first pass updates shared color tokens and global recipes, plus the application shell and recurring game surfaces. Route-specific layouts will be migrated in the rollout above so complex learning and admin interactions can be checked in their actual context.

## Acceptance criteria

- All app routes use the same token system and recognizable parchment/pixel-RPG visual language.
- Learning content and controls remain readable at mobile and desktop widths.
- No XP, mastery, review, or test behavior changes as a side effect of styling.
- Light and dark appearances have intentional contrast and consistent focus indicators.
- Every route is checked in-browser at narrow and wide widths before considering the migration complete.
