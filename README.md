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

The backend API base URL is never hardcoded into a production bundle. Resolution
order in [`config.ts`](src/lib/api/config.ts):

1. `VITE_API_URL`, when set — used verbatim (trailing slashes trimmed).
2. Development build with the variable unset — falls back to the local backend
   `http://localhost:4000/api/v1` so `npm run dev` works with no configuration.
3. Production build with the variable unset — falls back to the same-origin path
   `/api/v1`, so the panel works behind a reverse proxy without pinning a host.

Only variables prefixed with `VITE_` are embedded in the browser bundle, so never
place secrets in these files.

### Files

- `.env.example` — committed template documenting `VITE_API_URL`. Update this when
  adding new variables.
- `.env` — local, machine-specific values. Git-ignored via this repository's
  `.gitignore` (`.env`, `.env.*`, with `!.env.example` re-included).

### Setup

```bash
cp .env.example .env   # then adjust VITE_API_URL if your backend is not on localhost:4000
npm install
npm run dev            # serves on http://localhost:5173
```

The backend CORS policy allows the dev origin `http://localhost:5173`; keep the
`/api/v1` suffix on `VITE_API_URL` since the API is mounted there.
