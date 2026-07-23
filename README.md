# vinayshah.dev

Vinay Shah's personal portfolio, project case studies, engineering notes, and
running log. The site is built with Next.js, TypeScript, and Tailwind CSS.

## Requirements

- Node.js 22 (`nvm use` reads `.nvmrc`)
- npm

Node 25 is not supported by the current Next.js release because its experimental
Web Storage global conflicts with Next.js server rendering.

## Local development

```bash
nvm use
npm ci
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

The site works without external credentials. The `/stats` route shows a stable
local-preview state when Strava is not configured.

## Optional Strava data

Create `.env.local` from `.env.example` and provide:

```bash
STRAVA_CLIENT_ID=
STRAVA_CLIENT_SECRET=
STRAVA_REFRESH_TOKEN=
```

Never commit real credentials.

## Validation

```bash
npm run lint
npm run typecheck
npm run build
npm run verify:design
```

`verify:design` uses the locally installed Google Chrome to validate all public
routes, narrow and wide viewport geometry, keyboard focus, the mobile menu, and
key content invariants. Screenshots and its JSON report are written to
`.artifacts/design`.

## Dependency audit

The project is on the patched Next.js 15.5 line. `npm audit` currently reports
advisories in Next's pinned `postcss` and optional `sharp` dependencies. This
site does not accept untrusted CSS and disables Next image optimization, so
those vulnerable paths are not exposed here. npm's proposed automated fix is an
unsafe downgrade to Next 9 and must not be applied.

## Content

- Project data: `src/lib/projects.ts`
- Blog posts: `src/app/blog/posts`
- Public routes and metadata: `src/app`
