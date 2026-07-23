# Personal Website Design Review

Date: July 22, 2026

## Executive summary

The site is readable, technically straightforward, and already contains better
material than its presentation suggests. The strongest raw ingredients are:

- Three credible projects across AI agents, browser extensions, and iOS.
- A concrete performance result for LuckyNumber (3 seconds to under 100ms).
- Technical writing grounded in real debugging and infrastructure work.
- Personal interests that could make the portfolio memorable: running,
  mountaineering, baking, and self-hosting.

Today, those ingredients are presented like a lightly customized Next.js
starter. The monochrome layout, default typography, generic introduction, and
text-only projects make the site feel competent but anonymous. A hiring manager
can tell that Vinay builds software, but not quickly enough what kind of
engineer he is, what he is especially good at, or which proof is most important.

The recommended direction is **Builder's Field Notes**: a bright, precise
portfolio organized around evidence from shipped systems. Its signature element
is a reusable "system specimen" for each project that shows the problem,
decisions, architecture, and result.

## Audience and job

Primary readers:

1. Engineering hiring managers looking for scope, judgment, and outcomes.
2. Potential collaborators evaluating product and technical fit.
3. Technical peers arriving through a blog post or GitHub project.

The site's single job:

> Make a reader understand Vinay's engineering point of view, trust the proof,
> and choose a clear next step within two minutes.

## Method

This review combines:

- Live browser review of the home, about, projects, blog, article, stats,
  Foolish Enterprises, and privacy-policy routes.
- Desktop and narrow-viewport layout inspection.
- Source review of the Next.js pages, components, data, and Markdown content.
- Independent subagent reviews focused on visual design, usability and
  accessibility, content and persuasion, and functional quality.
- `npm run lint` and `npx tsc --noEmit`.
- GitHub visibility checks for all project links.

The local server is running at `http://localhost:3000`. On this machine, Node
25 required `--no-experimental-webstorage` for Next.js 15. The site renders
after that workaround. The Stats route still fails when Strava credentials are
absent.

## Scorecard

| Area | Score | Summary |
| --- | ---: | --- |
| Visual identity | 2/5 | Clean, but close to framework defaults and without visual evidence. |
| Information hierarchy | 3/5 | Routes are simple; the strongest proof is buried in paragraphs. |
| Content and persuasion | 2/5 | Accurate but generic positioning, weak calls to action, little outcome framing. |
| Usability | 3/5 | Straightforward on desktop; navigation and metadata rows need mobile work. |
| Accessibility | 2.5/5 | Good semantic foundations, but heading, focus, active-state, and loading gaps remain. |
| Functionality | 3/5 | Core routes work; Stats fails locally and one public-facing project link is private. |
| Credibility | 2.5/5 | Good technical substance, but no project media, case studies, resume, or social proof. |

## What already works

- The route structure is easy to understand.
- Semantic elements such as `header`, `nav`, `main`, `article`, and `time` are
  used consistently.
- Blog subjects are specific and useful rather than generic thought pieces.
- Project descriptions communicate technical scope.
- External links use `noopener noreferrer`.
- Light and dark themes have a reasonable contrast foundation.
- The site is restrained; it does not bury information under decorative UI.
- Lint and TypeScript checks pass.

## Action register

These are the finite items the implementation Goal should handle. Priorities
describe reader impact, not implementation difficulty.

### P1: Must fix

#### DR-01: Give the homepage a specific position and next action

**Evidence:** "I'm a software engineer" and "I enjoy building things that make a
difference" could describe thousands of portfolios.

**Change:**

- Replace the introduction with a concrete positioning statement centered on
  practical AI systems, consumer tools, and cross-platform engineering.
- Surface one proof point in the first viewport.
- Add clear actions for the featured work, resume, and contact.
- Keep the personal interests, but make them supporting texture rather than the
  primary professional claim.

**Acceptance:** A new reader can answer "what does Vinay build?", "what is the
proof?", and "what should I click next?" without scrolling.

#### DR-02: Turn projects into evidence-led case studies

**Evidence:** Projects are currently long text blocks followed by technology
tags. There are no screenshots, role definitions, architecture views, status,
constraints, or outcome summaries.

**Change:**

- Create a reusable project case-study model and detail route.
- Give every project a primary visual artifact.
- Present problem, Vinay's role, key decisions, constraints, result, and status.
- Promote measurable outcomes, especially LuckyNumber's startup improvement.
- Make project previews on the home and projects pages directly clickable.

**Acceptance:** Every featured project contains a visual, ownership statement,
at least one result or honest learning, and working destination links.

#### DR-03: Replace the narrow-screen navigation

**Evidence:** The logo and five unwrapped links share one row. At the tested
narrow viewport, the brand and first item touch; at common phone widths, the
row cannot fit. Link heights are also below comfortable touch-target size.

**Change:**

- Keep a compact desktop navigation.
- Add an accessible mobile menu below the desktop breakpoint.
- Use at least 44px interactive targets.
- Preserve current-route context in both modes.

**Acceptance:** No horizontal overflow or clipped navigation at 320px, 375px,
390px, 768px, or desktop widths; the menu works with keyboard and touch.

#### DR-04: Make Stats resilient when Strava is unavailable

**Evidence:** `stravaAPI` is constructed at module import time. Missing
credentials throw before `getStravaData()` can catch the failure, so `/stats/`
returns a development error instead of its intended fallback.

**Change:**

- Validate credentials lazily inside the request path.
- Render a useful unavailable/empty state without returning a route-level 500.
- Keep retry behavior for temporary upstream failures.
- Never expose credential values in errors or logs.

**Acceptance:** `/stats/` renders a stable page with and without credentials,
and distinguishes configuration, empty-data, and temporary API failures.

#### DR-05: Remove the dead public project link

**Evidence:** LuckyNumber's "View Code" URL targets a private GitHub repository.
Visitors who are not the owner receive a 404.

**Change:**

- Replace it with a public case study, App Store/demo destination, or an honest
  "Private repository" label.
- Validate every external project destination.

**Acceptance:** Every visible project action works for a signed-out visitor.

### P2: Significant improvements

#### DR-06: Establish a distinctive visual system

**Evidence:** The site relies on black/white, default blue links, generic gray
rules and pills, and no images. It looks close to a starter template.

**Change:**

- Implement one coherent color, type, spacing, and border system.
- Use a characterful display face, readable body face, and utility/mono role.
- Add one signature motif tied to the chosen direction.
- Use real product screenshots, diagrams, and personal photography where they
  provide evidence.
- Keep card radii at 8px or less and avoid decorative card nesting.

**Acceptance:** The site is recognizable from a cropped section without its
name, while remaining readable in light and dark contexts.

#### DR-07: Fix typography ownership

**Evidence:** `layout.tsx` loads Inter, while `globals.css` assigns Arial to the
body, likely overriding the intended font. Type scale and line length are mostly
framework defaults.

**Change:**

- Define explicit display, body, and utility font tokens.
- Set deliberate heading, body, caption, and code scales.
- Keep long-form text near 65 characters per line.
- Ensure code and long links scroll or wrap without widening the page.

**Acceptance:** Computed styles use the intended fonts, article lines remain
comfortable, and typography behaves consistently across routes.

#### DR-08: Improve navigation and document accessibility

**Evidence:** The active route is indicated only through a subtle color change.
Navigation lacks `aria-current`; there is no skip link. The brand is an `h1` on
every route in addition to the page's real `h1`.

**Change:**

- Render the brand as text rather than a document heading.
- Keep one primary `h1` per normal page.
- Add a skip-to-content link.
- Add `aria-current="page"` and a non-color active marker.
- Add consistent, visible `focus-visible` states.
- Preserve logical tab order and semantic landmarks.

**Acceptance:** Keyboard users can skip navigation, locate focus, identify the
current page, and traverse all controls without a mouse.

#### DR-09: Repair blog hierarchy and mobile metadata

**Evidence:** Article Markdown repeats the title already rendered by the page,
creating duplicate `h1` content. Date/tag rows do not wrap. The article body
uses `max-w-none`, and date-only strings render one day early in Pacific time.

**Change:**

- Remove the duplicate Markdown title or suppress it during rendering.
- Parse frontmatter dates as calendar dates rather than UTC instants.
- Let date and tags wrap on narrow screens.
- Constrain prose width while allowing code blocks and tables to scroll.
- Add reading time and use more outcome-led excerpts.

**Acceptance:** One article title is announced, dates match frontmatter in all
time zones, metadata fits at 320px, and body copy remains readable.

#### DR-10: Strengthen About with context and humanity

**Evidence:** The page repeats project descriptions and lists technologies, but
does not explain career context, engineering principles, preferred problems, or
what collaboration would be useful.

**Change:**

- Add current professional context and areas of depth.
- Explain two or three engineering principles with evidence.
- Include a genuine portrait or relevant personal artifact.
- State what kinds of roles, collaborations, or conversations are welcome.
- Replace literal bullet characters inside list items to remove double bullets.

**Acceptance:** The page adds information not already present on Projects and
ends with a specific, credible invitation.

#### DR-11: Clarify or demote Foolish Enterprises

**Evidence:** It occupies the longest primary-navigation label but contains only
two generic paragraphs and no products, proof, identity, or action.

**Change:**

- Either develop it into a real product-studio page with LLM Time Blocker,
  product status, visuals, and contact, or move it under Projects/About.
- Keep the privacy policy directly reachable for product users.

**Acceptance:** Its navigation prominence matches its content value and readers
can understand its relationship to Vinay immediately.

#### DR-12: Make personal Stats tell a story

**Evidence:** Three rainbow-colored metric cards report totals without trends,
goals, records, or a connection to the portfolio narrative.

**Change:**

- Use a coherent running-specific palette rather than arbitrary colors.
- Add goal progress, recent trend, personal best, or a small activity chart.
- Explain why running belongs on this site.
- Add `aria-busy`, status text, and reduced-motion behavior to loading UI.

**Acceptance:** The page is useful even when data is stale and communicates
personality rather than presenting disconnected numbers.

#### DR-13: Add route-level discovery and sharing metadata

**Evidence:** Most routes inherit "Personal website and portfolio." There is no
visible social preview image, sitemap, robots route, canonical strategy, or
structured profile/project data.

**Change:**

- Add descriptive titles and summaries for all public routes.
- Create a real Open Graph image and share card.
- Add sitemap and robots metadata.
- Add appropriate Person, Article, and project structured data.
- Confirm the Twitter handle or remove it if inaccurate.

**Acceptance:** Every public route has a useful title/description, social cards
show intentional artwork, and crawlers can discover canonical pages.

#### DR-14: Pin and document the supported runtime

**Evidence:** The default README is still the create-next-app template. On Node
25, Next.js 15 failed because of the experimental Web Storage global. Strava
configuration is undocumented.

**Change:**

- Pin an LTS Node version with `.nvmrc` and `package.json` engines.
- Replace the README with project-specific setup and environment guidance.
- Provide `.env.example` with names only, never secrets.
- Document graceful behavior when optional Strava variables are absent.

**Acceptance:** A clean clone can be installed, linted, built, and started by
following the README on the pinned runtime.

### P3: Polish and maintenance

#### DR-15: Add restrained motion and reduced-motion support

**Change:** Use one orchestrated entry or project-preview interaction plus small
state transitions. Disable nonessential motion under
`prefers-reduced-motion`.

**Acceptance:** Motion clarifies hierarchy without delaying reading or causing
layout shifts.

#### DR-16: Improve external-link communication and recovery routes

**Change:**

- Indicate when a link opens a new tab where the behavior is not obvious.
- Add a useful custom 404 with links to Work, Writing, and Contact.
- Ensure failure and empty states explain the next available action.

**Acceptance:** Dead ends always provide a recovery path.

#### DR-17: Remove orphaned and duplicated content

**Evidence:** `src/app/projects/linux_server/blog.md` duplicates the published
blog post but is not connected to a route.

**Change:** Delete it or turn it into an intentional project case-study source;
keep one canonical copy of each piece of content.

**Acceptance:** Every content file has one clear producer and public destination.

#### DR-18: Refresh dependencies deliberately

**Evidence:** Installation reports 12 dependency vulnerabilities and the dev
overlay identifies the current Next.js release as outdated.

**Change:**

- Review `npm audit` findings by production reachability.
- Upgrade Next.js and related packages through supported versions.
- Avoid `npm audit fix --force` without reviewing breaking changes.
- Re-run lint, typecheck, build, and route smoke tests.

**Acceptance:** Remaining advisories are resolved or documented with rationale,
and the supported test suite passes.

## Visual directions

These are alternatives, not cumulative requirements.

### Direction A: Builder's Field Notes (recommended)

**Idea:** A working notebook for a product engineer who turns messy systems into
useful tools. The visual language comes from architecture sketches, debugger
annotations, commit evidence, and field observations.

**Palette:**

- Paper: `#F7F8F5`
- Ink: `#15201E`
- Signal teal: `#087F78`
- Verification blue: `#2557C7`
- Alert coral: `#E45A3C`
- Rule gray: `#CBD4CF`

**Type:**

- Display: IBM Plex Sans Condensed
- Body: Source Sans 3
- Utility/code: IBM Plex Mono

**Layout:**

```text
[name / role]                  [work writing about contact]

[specific claim]                 [current field note]
[proof + CTA]                    [small real artifact]

---------------- featured system ----------------
[product image] [problem -> decision -> measurable result]

[selected writing]              [now / running / experiments]
```

**Signature:** A "system specimen" on every project: an annotated horizontal
strip that connects input, decision, architecture, and result.

**Why it fits:** The existing projects and blog posts already contain debugging
evidence and technical decisions. This direction makes that proof visible
without pretending the portfolio is a SaaS dashboard.

### Direction B: Trail and Terminal

**Idea:** Connect software craft with running and mountaineering through a
daylight editorial system, topographic structure, and purposeful personal
photography.

**Palette:**

- Snow: `#F5F7F6`
- Graphite: `#182321`
- Alpine: `#356B58`
- Trail orange: `#E15D34`
- Sky: `#CFE8F1`
- Stone: `#8A9690`

**Type:**

- Display: Archivo
- Body: Atkinson Hyperlegible
- Utility: Geist Mono

**Layout:**

```text
[Vinay Shah]                              [navigation]

[full-width real trail/workbench photo with literal offer]
[selected work list]         [elevation-like career timeline]
[writing excerpts]           [running and current interests]
```

**Signature:** One continuous elevation line changes function across the site:
section divider, project timeline, and running chart.

**Why it fits:** It gives the personal interests a structural role instead of
adding lifestyle decoration. The risk is letting the metaphor overpower the
engineering proof.

### Direction C: Personal Systems Console

**Idea:** A quiet operational view of the systems Vinay builds and maintains,
using status, logs, and live data sparingly.

**Palette:**

- Canvas: `#F4F7FA`
- Carbon: `#111820`
- Cobalt: `#235ECF`
- Mint: `#2F8B72`
- Amber: `#D78616`
- Fog: `#D8E0E8`

**Type:**

- Display/body: Manrope
- Editorial accents: Newsreader
- Utility/data: Berkeley Mono or IBM Plex Mono

**Layout:**

```text
[identity and availability]               [navigation]
[featured build: large visual + outcome]
[projects / status] [writing / latest] [now / stats]
[case studies as full-width evidence bands]
```

**Signature:** A live "Now" rail joins current work, recent writing, running
progress, and experiments.

**Why it fits:** It unifies otherwise separate routes. The risk is becoming a
generic developer dashboard, so live-data UI should remain secondary.

## Recommended sequence

1. Fix Stats, project-link credibility, mobile navigation, and runtime setup.
2. Adopt Direction A's tokens and typography.
3. Rewrite the homepage around specific positioning and one featured result.
4. Build the project case-study model and add real media.
5. Repair accessibility, article structure, dates, and route metadata.
6. Strengthen About, Stats, and Foolish Enterprises.
7. Add motion, recovery routes, dependency upgrades, and final visual QA.

## Verification plan

- Lint, TypeScript, production build, and dependency review.
- Route smoke test for every public page with and without Strava variables.
- Keyboard-only navigation and visible-focus review.
- Automated accessibility scan plus manual heading/landmark inspection.
- Screenshots at 320x568, 375x812, 390x844, 768x1024, 1440x900, and a wide
  desktop viewport.
- Light mode, dark mode, reduced motion, long content, missing data, and 404.
- Signed-out validation of all external project and social links.
- Social-preview inspection for home, project, and article URLs.

## Implementation outcome

All action items DR-01 through DR-18 were implemented on July 22, 2026 using
the recommended Builder's Field Notes direction.

Final verification:

- `npm run lint`
- `npm run typecheck`
- `NODE_OPTIONS=--no-experimental-webstorage npm run build`
- `npm run verify:design`
- Live route checks with Strava credentials absent
- Six responsive viewports from 320x568 through 1920x1080
- Eleven public routes, including project details, an article, Stats, and the
  LLM Time Blocker privacy policy

The browser verifier found no horizontal overflow and confirmed mobile-menu
behavior, touch-target sizing, skip-link order, route titles, heading
hierarchy, calendar dates, and private-repository messaging.

### Residual dependency advisories

`npm audit --omit=dev` reports five inherited advisories after upgrading to the
latest compatible Next.js 15 patch:

- Next.js pins a vulnerable PostCSS version. The advisory requires
  attacker-controlled CSS to reach PostCSS stringification; this site only
  processes trusted, checked-in CSS at build time.
- Next.js optionally installs Sharp 0.34.5. This site does not accept image
  uploads, remote image URLs, or other user-controlled image input.

Neither dependency has a supported non-breaking fix in this Next.js line.
`npm audit fix --force` currently proposes a breaking downgrade to Next.js
9.3.3, so it was deliberately not applied. Reassess these advisories when
Next.js publishes compatible PostCSS and Sharp updates.
