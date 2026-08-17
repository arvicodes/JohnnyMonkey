# AGENTS.md

## Cursor Cloud specific instructions

JohnnyMonkey is a single full-stack learning platform (German-language LMS), not a monorepo of separate products. Two dev services must run:

- Backend: Express + Prisma API on port `3003` (entry `server/src/index.ts`, run via `nodemon`/`ts-node`).
- Frontend: Create React App dev server on port `3000` (`client/`). It proxies `/api`, `/material`, `/uploads` to `3003` via `client/src/setupProxy.js`.

### Running

- Start both together from the repo root with `npm run dev` (uses `concurrently`). The web bundle takes ~60s to compile on first start; wait before hitting `http://127.0.0.1:3000`.
- The backend's `dev` script runs `server/scripts/setup-local.sh` on every start. This regenerates `server/prisma/schema.sqlite.prisma` from `schema.prisma` and runs `prisma db push`, so the local SQLite DB is auto-synced — you do not need to run migrations manually. `schema.sqlite.prisma` and `server/prisma/dev.db` may show as modified after a dev run; these are expected local artifacts and should not be committed.
- Local persistence is SQLite at `server/prisma/dev.db`, which is committed with real seed data (students + teachers). Production (Render/Docker) uses PostgreSQL instead.
- Health check: `curl http://127.0.0.1:3003/health`. Reachability check for both ports: `npm run check:local`.

### Auth / testing

- Login uses a "Login-Code" (no email/password). A working teacher code in the committed DB is `Pan8` (teacher "Frau Christ"); student codes also exist (e.g. `KönEri07`). Query more with Prisma against `server/prisma/dev.db` if needed.

### Lint / test / build caveats

- There is no standalone lint script. ESLint runs automatically inside the CRA compile pipeline (`npm run dev` / client `npm run build`) and surfaces warnings in the `[WEB]` output.
- Server build: `cd server && npm run build` (`tsc` + `prisma generate`). This writes into the committed `server/dist/` directory — revert those changes if you only intend a build check.
- Client automated tests (`cd client && CI=true npm test`) currently fail to run: the default CRA Jest config cannot transform `pdfjs-dist`'s ESM build (imported via `SlideDeckEditorPage.tsx`), so `App.test.tsx` throws `SyntaxError: Unexpected token 'export'` at import time. This is a pre-existing config gap, not an environment problem.
- The heavy root `npm run build` is production-oriented (builds client, copies to `server/client-build`, hardcodes the Render API URL); use `npm run dev` for development, not the production build.
