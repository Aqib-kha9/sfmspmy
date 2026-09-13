# Admin Web Foundation

The admin panel contains proprietor-facing workflows for customer accounts, financial products, collections, reconciliation, reports, and system administration.

Planned boundaries:

- `app`: routing, providers, session bootstrap, and error boundaries.
- `components`: accessible design-system primitives.
- `features`: domain-specific pages and workflows.
- `lib`: API client, auth client, permissions, formatting, and telemetry.
- `store`: server-state and local UI state boundaries.

## Environment configuration

The panel is a Vite app, so configuration is read from `import.meta.env` at
build/dev time. The only variable it consumes is `VITE_API_URL`:

- Read in [`src/lib/api/config.ts`](src/lib/api/config.ts) as `import.meta.env.VITE_API_URL`.
- Typed in [`src/vite-env.d.ts`](src/vite-env.d.ts).
- Defaults to `http://localhost:4000/api/v1` when unset, so the app runs against a
  local backend with no configuration.

Only variables prefixed with `VITE_` are embedded in the browser bundle, so never
place secrets in these files.

### Files

- `.env.example` — committed template documenting `VITE_API_URL`. Update this when
  adding new variables.
- `.env` — local, machine-specific values. Git-ignored via the repository root
  `.gitignore` (`.env`, `.env.*`, with `!.env.example` re-included).

### Setup

```bash
cp .env.example .env   # then adjust VITE_API_URL if your backend is not on localhost:4000
npm install
npm run dev            # serves on http://localhost:5173
```

The backend CORS policy allows the dev origin `http://localhost:5173`; keep the
`/api/v1` suffix on `VITE_API_URL` since the API is mounted there.
