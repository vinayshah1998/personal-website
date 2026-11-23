# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `npm run dev` - Start development server on http://localhost:3000
- `npm run build` - Build production version
- `npm run start` - Start production server
- `npm run lint` - Run ESLint checks

## Architecture Overview

This is a Next.js 15 personal website using the App Router architecture with the following key structure:

### Core Stack
- **Framework**: Next.js 15 with React 19
- **Styling**: TailwindCSS 4 with dark mode support via CSS classes
- **TypeScript**: Strict mode enabled with path aliases (`@/*` → `./src/*`)
- **Font**: Departure Mono (OFL), self-hosted from `src/fonts/` via `next/font/local` and preloaded; 12px, 11px under 480px wide
- **Analytics**: Vercel Speed Insights and Analytics integration

### Page Structure (App Router)
- `/` - Homepage: full-screen ink with the name, local clock, and nav
- `/about` - About page
- `/projects` - A quiet list of projects (from `src/lib/projects.ts`); tapping one opens its links, posts, and demo inline
- `/blog` - Blog listing page
- `/blog/[slug]` - Dynamic blog post pages
- `/stats` - Strava fitness statistics integration

### Component Architecture

#### Layout System
- **Root Layout** (`src/app/layout.tsx`): metadata, an inline script that sets the time-of-day ground color before first paint, the `Ink` component, and `<main data-scr>` for page content
- **Ink** (`src/components/Ink.tsx`, client): one canvas for the whole site that persists across client-side navigation. On `/` it fills the first screen (100svh) with the name, local clock, and nav; on every other page it folds into a band at the top with the name and nav (Horizon). It also decodes text in (`[data-scr]`) on each page change. Palette keyframes live in `src/lib/ink.ts`
- Elements with class `m` are no-ink zones on the canvas

#### Shared Components (`src/components/`)
- **StravaStats**: Year-to-date totals and the latest run, around **StatsCharts** (client): dithered canvas charts of the last 12 weeks and year to date vs last year, colored by the time-of-day palette. Series come from `src/lib/running.ts`. The stats page has running and coding tabs (**StatsTabs**); **CodingCharts** draws the public GitHub contribution calendar (`src/lib/github.ts`, cached a day). Both chart sets share `src/components/useDither.ts`; e2e tests serve Strava and GitHub from `tests/e2e/mock-server.mjs`
- **MarkdownContent**: Renders blog markdown in the plain `.doc` style. A line of its own like `[[ink-steps]]` embeds a component from its `EMBEDS` map; **InkSteps** (client) is the step-by-step ink explainer in the paint-on post, built on the same Bayer matrix, ramp, diffusion, and palette helpers as the homepage (`src/lib/ink.ts`)

### Data Layer (`src/lib/`)

#### Projects (`src/lib/projects.ts`)
- **Single source** for the projects page: `projects` (in display order) and `more`, the smaller public repos
- Each project has a `summary`, `links` (private repos are labeled `github (private)` and still link), and `posts`, blog slugs whose titles the page reads from the posts
- **ProjectList** (client) renders them; its `MOCKS` map gives each project an inline demo in `src/components/mocks/` (kiro-cli and Kiro Orbits after their real terminal and web UIs, this website as `InkSteps mini`, Gita Swipe as real app screens in `public/projects/` dithered into the palette). A project without one shows its `detail` text

#### Blog System (`src/lib/blog.ts`)
- **Content Location**: Markdown files stored in `src/app/blog/posts/`
- **Frontmatter Parsing**: Uses `gray-matter` to extract metadata (title, date, tags, excerpt)
- **File-Based**: Each `.md` file becomes a blog post accessible via slug
- **Sorting**: Posts sorted by date (newest first)
- **Functions**:
  - `getAllPosts()`: Returns all posts sorted by date
  - `getPostBySlug(slug)`: Fetches single post by filename
  - `getAllTags()`: Extracts unique tags across all posts

#### Strava Integration (`src/lib/strava.ts`)
- **OAuth Flow**: Manages token refresh automatically using refresh token
- **Singleton Pattern**: Single `StravaAPI` instance exported as `stravaAPI`
- **Token Management**: Auto-refreshes access tokens when expired
- **TypeScript Interfaces**: `StravaActivity`, `StravaStats` define API response shapes
- **Methods**:
  - `getAthleteStats()`: Fetches athlete statistics (recent, YTD, all-time)
  - `getRecentActivities(limit)`: Gets recent activities with optional limit

#### Cache System (`src/lib/cache.ts`)
- **In-Memory Caching**: Simple cache implementation for API responses
- **TTL Support**: Time-to-live configuration per cache key
- **Usage**: Strava API routes cache responses for 10 minutes to reduce API calls

### API Routes (`src/app/api/`)

#### Strava API Endpoints
- **`/api/strava/stats`**: Fetches athlete statistics with 10-minute cache
- **`/api/strava/activities`**: Fetches recent activities with caching
- **Force Dynamic**: All routes marked with `export const dynamic = 'force-dynamic'`
- **Error Handling**: Returns 500 with error message on failures
- **Pattern**: API routes use `stravaAPI` singleton and `cache` utility

### Environment Variables

Required for Strava integration:
- `STRAVA_CLIENT_ID` - Strava OAuth client ID
- `STRAVA_CLIENT_SECRET` - Strava OAuth client secret
- `STRAVA_REFRESH_TOKEN` - Strava OAuth refresh token

Stored in `.env.local` (not committed to repo).

### Styling Patterns
- Plain CSS classes in `src/app/globals.css` (Tailwind is imported for its reset)
- Colors come from the visitor's local time via `--bg` and `--fg`; there is no separate dark mode
- Subpage content: `<div className="bd">` with `.row` blocks (a `.dim` label, then text); secondary text uses `.dim`
- Links use `.lk` (44px tall in the nav)

### Key Technical Details

#### TypeScript Configuration
- Strict mode enabled
- Path alias `@/*` maps to `src/*` for clean imports
- Target: ES2017 for modern JavaScript features

#### Next.js Configuration
- `trailingSlash: true` - Enables trailing slashes on routes
- `images.unoptimized: true` - Disables image optimization
- API routes enabled (not using static export)

#### SEO & Metadata
- Root layout sets `metadataBase` (https://vinayshah.dev), the site title "vinay shah" with a `%s - vinay shah` template, and the default description
- Every page builds its title, description, Open Graph, and Twitter tags with `pageMeta()` from `src/lib/meta.ts`; blog posts use their title and excerpt in `generateMetadata`
- The link preview is `src/app/opengraph-image.png` (copied to `twitter-image.png`): a 1200x630 capture of the homepage ink in the night palette

### Common Patterns

#### Adding New Projects
1. Add a project object to `projects` in `src/lib/projects.ts`, in the order it should appear
2. Give it a one-line `summary`, its `links`, and the slugs of related `posts`
3. Add a demo to `MOCKS` in `src/components/ProjectList.tsx` only if it looks like the real project and fits the site; otherwise give it `detail` text

#### Adding New Blog Posts
1. Create `.md` file in `src/app/blog/posts/`
2. Include frontmatter: title, date, tags, optional excerpt
3. Write content in markdown
4. Post automatically appears in blog listing sorted by date

#### Creating New Pages
1. Add `page.tsx` in appropriate `src/app/` subdirectory
2. Wrap content in `<div className="bd">` with `.row` blocks
3. Add it to `PAGES` in `src/components/Ink.tsx` if it belongs in the nav

#### API Integration Pattern
1. Create lib file with API client logic (like `strava.ts`)
2. Create API route in `src/app/api/` that uses the client
3. Implement caching with TTL for external APIs
4. Use `'use client'` component to fetch from your API route
