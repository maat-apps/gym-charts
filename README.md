# Gym charts

Your training progress over time, records marked — a maat-apps PWA that
reads your workout log from your own private GitHub repo. See
[PRODUCT.md](./PRODUCT.md) and [CLAUDE.md](./CLAUDE.md), and maat-core's
[`STRUCTURE.md`](https://github.com/maat-apps/maat-core/blob/main/STRUCTURE.md)
and
[`VERIFICATION.md`](https://github.com/maat-apps/maat-core/blob/main/VERIFICATION.md)
for the conventions shared by every maat app.

## Connecting your data

1. Keep `gym-data.json` (format `version: 1`, see `src/lib/schemas.ts`) in
   a private GitHub repo.
2. Create a fine-grained personal access token: GitHub → Settings →
   Developer settings → Fine-grained tokens, repository access _only that
   repo_, permission **Contents: Read-only**.
3. In the app: Settings → Data → repository `owner/repo`, file, token →
   Connect.
