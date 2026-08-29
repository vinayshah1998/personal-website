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
- **Graphics**: WebGPU via `vgpu` (vercel-labs) — procedural planet backdrop
- **Styling**: TailwindCSS 4, permanently dark (space theme)
- **TypeScript**: Strict mode enabled with path aliases (`@/*` → `./src/*`)
- **Font**: Inter font loaded via `next/font/google`
- **Analytics**: Vercel Speed Insights and Analytics integration

### Page Structure (App Router)
- `/` - Homepage with personal introduction and recent projects preview
- `/about` - About page
- `/projects` - Projects showcase (pulls from shared data)
- `/blog` - Blog listing page
- `/blog/[slug]` - Dynamic blog post pages
- `/stats` - Strava fitness statistics integration

### Component Architecture

#### Layout System
- **Root Layout** (`src/app/layout.tsx`): Defines site-wide structure with header, navigation, footer, and metadata
- **Header**: Fixed header with name/logo and Navigation component
- **Footer**: Consistent footer across all pages
- **Client Components**: Marked with `'use client'` directive (Navigation, StravaStats)

#### Solar System Backdrop (WebGPU)

The site is themed as a solar system: each section is a planet, and navigating
between sections flies between them. There are two views of the same scene.

**Section view** — the current route's planet alone at the origin, lit by an
art-directed directional sun, camera parked on +z. This is the page backdrop.

**Orrery view** — the sun plus every planet at its orbital position, lit from
the sun, with a free orbit camera the visitor drives (drag to rotate,
shift-drag to pan, wheel/pinch to zoom, click a planet to travel to its
section). Entered from the "Solar system" button; the site's chrome can be
toggled back on over it, or dismissed with Escape.

The two differ only in uniforms, so moving between them is a change of values
rather than a change of scene.

- **Shader** (`src/shaders/planet.wgsl`): one fullscreen fragment pass drawing
  starfield, nebula, up to `MAX_BODIES` analytically intersected spheres with
  their cloud decks, atmospheres, ring systems and moons, plus orbit lines and
  the sun. Imports fBM/hash/colour helpers from `@vgpu/wgsl-std` — the WGSL
  import graph is resolved at build time by the loader wired up in
  `next.config.ts`.
- **Planet data** (`src/lib/solar-system.ts`): a `PlanetLook` and an `OrbitSpec`
  per route (Earth `/`, Mars `/about`, Jupiter `/projects`, Neptune `/blog`,
  Saturn `/stats`, Venus `/foolish-enterprises`), plus `sun`. `planetForPath()`
  maps a route to a planet; `lerpLook()` blends two of them.
- **Uniform mapping** (`src/lib/planet-uniforms.ts`): builds the WGSL `Body`
  array and `Params` struct, and owns the screen maths — `projectBody`,
  `rayThroughUv`, `pickPlanetAlongRay` — which **must** stay in step with
  planet.wgsl or labels drift off their planets and clicks pick the wrong one.
- **Renderer** (`src/lib/planet-renderer.ts`): owns the WebGPU lifecycle, the
  orrery camera, pointer input, and the transition state machine. `vgpu` is
  dynamically imported so it stays out of the initial bundle.
- **Components**: `SolarSystem.tsx` (canvas, planet labels, orrery controls),
  `SolarSystemContext.tsx` (view state), `SiteChrome.tsx` (hides the page while
  the orrery is up). Falls back to a static CSS starfield when WebGPU is
  unavailable or the device is lost.

Because every planet is the same shader with different uniforms, a route change
interpolates between two looks — the planet morphs while the stars streak. View
changes reuse the same warp, flipping the scene at the midpoint where the
streaking is brightest.

Planet labels are real `<button>` elements positioned imperatively from the
renderer's per-frame projection callback, so the orrery is keyboard-navigable
and no React state updates at 60fps. A label hides whenever its planet is
occluded, decided by the same pick used for clicks.

##### Shader workflow

**`next build` never validates WGSL.** Validate and preview explicitly:

```
npm run shader:check     # validates against a real WebGPU device
npm run shader:preview   # renders every planet and the orrery to tools/preview-out/
npm run shader:verify    # asserts label projection and click-picking match the shader
```

`shader:verify` renders each planet twice — once highlighted — and diffs, which
isolates that planet's pixels no matter what else is on screen. The centroid of
the diff is where the shader actually drew it, which is compared against where
`projectBody` says the label belongs. This is the only way to catch screen-maths
drift; it is invisible in a screenshot.

Headless rendering needs a GPU or `npx vgpu install-software-renderer`.
Use `npx vgpu docs cat getting-started.md` for the API. Note that
`effect.compile(surface)` throws outside `frame(gpu)` — pre-warm with a render
signature (`{ colors: [surface.format] }`) instead.

##### Performance

- Quality tiers in `pickQuality()`: fewer fBM octaves and a lower DPR ceiling on
  coarse-pointer/small viewports.
- `framingFor()` positions and zooms the planet per aspect ratio so it never
  sits under the text.
- `prefers-reduced-motion` skips the render loop entirely and draws static
  frames on route/viewport change.

#### Shared Components (`src/components/`)
- **Navigation**: Client-side navigation with active state highlighting using `usePathname()`
- **Footer**: Site footer with links and copyright
- **StravaStats**: Client component for displaying Strava fitness data
- **MarkdownContent**: Renders markdown content with syntax highlighting

### Data Layer (`src/lib/`)

#### Projects (`src/lib/projects.ts`)
- **Centralized Data Source**: Single source of truth for all projects
- **Type-Safe**: TypeScript interface (`Project`) defines structure
- **Shared Access**: Imported by both homepage (latest 2) and projects page (all)
- **Usage Pattern**: Homepage truncates descriptions to 200 chars and shows max 4 tech tags

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

#### Dark Theme
The site is always dark so the WebGPU scene reads correctly. `globals.css`
redefines the `dark` variant as `@custom-variant dark (&:where(.dark, .dark *))`
and `<html>` carries `class="dark"`, so `dark:` utilities always apply rather
than following the OS preference. `body` is transparent so the canvas shows
through.

Panel utilities keep copy legible over bright planets:
- `.panel` — frosted card (blur + translucent ground)
- `.panel-strong` — denser ground for long-form text
- `.panel-soft` — subtle card for list rows
- Text: `text-white`, `text-white/60`, `text-white/45`
- Borders: `border-white/10`

#### Responsive Design
- Mobile-first approach with responsive breakpoints
- Navigation adapts spacing: `gap-4 md:gap-8`
- Max width container: `max-w-4xl mx-auto px-6` used consistently

#### Typography
- Headings: Size scale from `text-4xl` (h1) to `text-2xl` (h2)
- Body text: `text-gray-600 dark:text-gray-400` for secondary content
- Links: `text-blue-600 dark:text-blue-400 hover:underline`

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
- Comprehensive metadata in root layout with OpenGraph and Twitter cards
- Author: Vinay Shah
- Site URL: https://vinayshah.dev
- Twitter: @vinayshah1998

### Common Patterns

#### Adding New Projects
1. Add project object to `src/lib/projects.ts` array
2. Include all required fields: id, title, description, tech, link, demo
3. Homepage automatically displays latest 2 projects
4. Projects page shows all projects

#### Adding New Blog Posts
1. Create `.md` file in `src/app/blog/posts/`
2. Include frontmatter: title, date, tags, optional excerpt
3. Write content in markdown
4. Post automatically appears in blog listing sorted by date

#### Adding a Planet
1. Add a `Planet` entry to `planets` in `src/lib/solar-system.ts` with its
   `path` and a `look`. Only override what differs from `base`.
2. Add the route to `navItems` in `src/components/Navigation.tsx`.
3. Preview it with `npm run shader:preview`.

#### Creating New Pages
1. Add `page.tsx` in appropriate `src/app/` subdirectory
2. Follow layout pattern: `panel panel-strong max-w-4xl mx-auto my-10 px-6 py-12 md:px-10` container
3. Use consistent heading styles and dark mode support
4. Update Navigation component in `src/components/Navigation.tsx` if needed

#### API Integration Pattern
1. Create lib file with API client logic (like `strava.ts`)
2. Create API route in `src/app/api/` that uses the client
3. Implement caching with TTL for external APIs
4. Use `'use client'` component to fetch from your API route
