# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `npm run dev` - Start development server on http://localhost:3000
- `npm run build` - Build production version
- `npm run start` - Start production server
- `npm run lint` - Run ESLint checks

## Architecture Overview

This is a Next.js 15 personal website using the App Router architecture with the following key structure:

### Core Structure
- **App Router**: Uses `src/app/` directory structure with TypeScript
- **Styling**: TailwindCSS with dark mode support via CSS classes
- **Font**: Inter font loaded via `next/font/google`
- **Analytics**: Vercel Speed Insights integration

### Page Organization
- `/` - Homepage with personal introduction and recent work
- `/about` - About page
- `/projects` - Projects showcase
- `/stats` - Strava fitness statistics integration

### Component Architecture
- **Layout**: Root layout in `src/app/layout.tsx` with consistent header/footer
- **Navigation**: Client-side navigation component with active state highlighting
- **Shared Components**: Located in `src/components/` (Footer, Navigation, StravaStats)

### API Integration
- **Strava API**: Complete integration for fetching athlete statistics and activities
- **API Routes**: Located in `src/app/api/strava/` with TypeScript interfaces
- **Environment Variables**: Requires `STRAVA_CLIENT_ID`, `STRAVA_CLIENT_SECRET`, `STRAVA_REFRESH_TOKEN`

### Key Technical Details
- Uses TypeScript with strict typing for all components and API responses
- Client components marked with `'use client'` directive where needed
- SEO optimized with comprehensive metadata including OpenGraph and Twitter cards
- Responsive design with mobile-first approach
- Dark mode implementation using Tailwind's dark: prefixes

### External Dependencies
- Next.js 15 with React 19
- TailwindCSS for styling
- Vercel Speed Insights for performance monitoring
- Strava API integration for fitness data

### File Patterns
- Page components: `src/app/*/page.tsx`
- API routes: `src/app/api/*/route.ts`
- Shared components: `src/components/*.tsx`
- Utilities/libs: `src/lib/*.ts`