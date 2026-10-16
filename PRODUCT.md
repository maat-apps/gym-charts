# PRODUCT.md

## Product

Gym charts is a private, phone-first PWA that shows how your training
progresses: one chart per exercise over your sessions, with records
marked. It only reads — the training log itself is a JSON file in your
own private GitHub repo, downloaded with a read-only token that never
leaves the device except to go to GitHub. No accounts, no server of its
own.

## Platform

web - PWA, mobile-only (like routines, notes and albums).

## Scope

- Plans as tabs (e.g. Plan A, Plan B, an "other" bucket for old
  exercises); an exercise can be marked inactive.
- Per exercise: personal best, number of records, a line chart per
  measure (weight, estimated 1RM, volume; assistance for assisted
  exercises, with the axis flipped; reps; hold time, per side when
  logged per side) and every session's sets.
- Refresh on demand and once per launch; the last download stays
  available offline.

Not in scope: logging workouts in the app, editing data, sharing.
