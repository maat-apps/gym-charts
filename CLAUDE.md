# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

For the generic app structure this repo follows (folder layout, routing
pattern, i18n approach, naming conventions, testing split) see
[`maat-core/STRUCTURE.md`](https://github.com/maat-apps/maat-core/blob/main/STRUCTURE.md).
For the "verify each change exactly once" principle behind this repo's
automation setup, see
[`maat-core/VERIFICATION.md`](https://github.com/maat-apps/maat-core/blob/main/VERIFICATION.md).
What follows here is what's specific to **gym-charts** — product intent and
scope are in [`PRODUCT.md`](./PRODUCT.md).

<!-- BEGIN AUTO-GENERATED: setup-claude-workflow -->
<!-- Only Project Snapshot and Commands below are ever rewritten by --refresh. -->

## Project Snapshot

- Vite + React + TypeScript, Tailwind v4, shadcn (`base-nova`).
- Mobile-only (`@maat-apps/ui`'s `MobileGate`, from `src/app/root.tsx`), like routines.

## Commands

| Purpose   | Command                 |
| --------- | ----------------------- |
| Dev       | `npm run dev`           |
| Build     | `npm run build`         |
| Lint      | `npm run lint:fix`      |
| Format    | `npm run format`        |
| Typecheck | `npm run typecheck`     |
| Unit test | `npm run test:coverage` |
| E2E test  | `npm run test:e2e`      |
| Validate  | `npm run validate`      |

<!-- Everything below is seeded once, then append-only — --refresh never rewrites it. -->

## Conventions

- Filenames: kebab-case everywhere, including components; component names
  inside a file stay PascalCase.
- Named exports throughout.
- Hooks (`use*`) live in `src/hooks/`, not `src/lib/` — `lib/` stays free
  of `react`/`react-dom` imports.
- A Playwright project's reusable test-helper file belongs at
  `e2e/utils.ts`, not `fixtures.ts` — these are plain functions specs call
  directly, not Playwright's own `test.extend()` fixture-injection system.
- **Data.** The app doesn't edit training data: it reads one JSON file
  (`schemas.ts`, `version: 1`, documented in the private data repo's
  README) from the user's own private GitHub repo — maat-core's GitHub
  pattern in read-only mode (`docs/storage-github.md`,
  `@maat-apps/core/github`'s `createRepoMirror`), with a fine-grained
  read-only token pasted in Settings → Data. `src/lib/storage.ts` keeps
  the last downloaded copy and its time in a `/local` store (`DATA_KEY`,
  encrypted with the lock's key) and the connection (repo, path, token)
  under `GITHUB_KEY`, **only ever stored encrypted** — no connection
  without a lock that encrypts; the lock's rewrite re-encrypts or deletes
  it. An old source kept with the data (before core's pattern) moves to the
  connection on load, or is dropped without an encrypting lock. Read
  through `src/hooks/use-gym-data.ts`. It downloads once per app run
  (`syncOnStart`, from home) and on Refresh; a failed download keeps the
  old copy and shows why (`views/settings/sync-error.tsx`, core's
  `GitHubError` kinds). E2E connects through a Chromium-only virtual
  authenticator with PRF (`e2e/utils.ts`'s `installPrfAuthenticator`), so
  `data.spec.ts` runs on mobile-chromium only. No backups or
  update snapshot — the repo is the backup. **Never commit the owner's
  numbers** — tests and e2e use made-up data (`tests/unit/fixtures/`,
  `e2e/utils.ts`'s `GYM_DATA`, GitHub mocked with `page.route`).
- **Progress maths** are pure helpers in `lib/progress.ts`: per-exercise
  measures (`measuresFor` — weight: top weight / reps at the top weight /
  Epley 1RM / volume; `assisted`: assistance, where lower is better and
  the chart's axis is reversed; reps; time), one series per side when sets
  carry `side`. A **record is per session**: for weight exercises a better
  top weight than every earlier session, or the same one with more reps
  done at it in total (`topSets`, `beatsOnWeight` — the owner's rule; the
  same sessions are ringed on every measure); for reps/time a strictly
  better score. The first session only sets the baseline. `personalBest`
  is the best session by the same rule ("100 kg × 3, 3, 3, 2"),
  `groupSets` groups sets for display. Number/date formatting:
  `lib/format.ts`.
- **Screens.** `/` (`views/home`: one plan at a time; by the owner's choice
  not maat-core's `BottomBar` — a fixed header with the title, Refresh and
  the settings gear, and the plans as bottom tabs (`plan-tabs.tsx`,
  `role="tab"`; `lib/plans.ts`'s `planTabs` adds "Other" for exercises no
  plan lists), the chosen plan remembered in `app-settings.ts`'s
  `selectedPlan`; rows show the personal best and a sparkline),
  `/exercise/:id` (`views/exercise`: personal best, record count, measure
  chips, the recharts line chart from `@maat-apps/ui/chart` with records
  as ringed dots, sessions newest first). Settings is a drawer
  (`views/settings/`, one `settings-<name>-section.tsx` per card).
- **i18n.** `src/i18n/en.json` and `pl.json` (core's `createTranslation`;
  device language on first launch, Settings → Language after). `t()`
  only accepts keys present in both — keep them in sync. Exercise and
  plan names come from the data file as written.
- **App lock.** Every maat-apps app has it (`@maat-apps/core/lock` +
  `@maat-apps/ui/app-lock-gate`, wrapped around the router in
  `src/app/router.tsx`). `src/lib/app-lock.ts` rewrites the stored
  source + data with the current key and erases them (`disconnect`);
  `storage.ts` encrypts with `src/lib/encryption-key.ts`. **Never change
  `HKDF_INFO` (`"gym-charts-data-v1"`)** — existing encrypted data would
  become unreadable.
- Full pattern log: none yet — run `/learn-patterns` after a non-trivial
  session to start one.

## Workflow Rules

- Don't manually re-run lint/format/typecheck/build/test to double-check a
  change before committing — CI runs the full `npm run validate` gate on
  every PR; see `maat-core/VERIFICATION.md` for why running it twice is
  pure waste, not extra safety.
- Check the current branch before editing or committing anything — never
  edit or commit directly on `main`.
- Name branches `<type>/<short-descriptive-slug>` — see
  `maat-core/STRUCTURE.md`'s "Branch naming" section — not a generic or
  session-scoped name; cut a fresh branch per PR/task rather than reusing
  one across unrelated changes.
- Commit once a task's changes are complete, then use `/open-pr` to push
  and open the PR.

<!-- END AUTO-GENERATED: setup-claude-workflow -->
