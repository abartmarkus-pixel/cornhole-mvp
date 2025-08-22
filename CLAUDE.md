# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `npm run dev` - Start development server with Turbopack (runs on http://localhost:3000)
- `npm run build` - Build production application with Turbopack
- `npm run start` - Start production server
- `npm run lint` - Run ESLint for code quality checks
- `npm test` - Run Vitest test suite (if tests are added)

## Tech Stack & Architecture

This is a Next.js 15 project using:

- **Framework**: Next.js 15 with App Router
- **Build Tool**: Turbopack (enabled for both dev and build)
- **Styling**: Tailwind CSS v4 with PostCSS
- **TypeScript**: Strict mode enabled with path aliases (`@/*` maps to `./src/*`)
- **State Management**: Zustand (for client-side state)
- **Database**: Dexie (IndexedDB wrapper)
- **Validation**: Zod v4
- **Testing**: Vitest
- **Utilities**: date-fns for date manipulation

## Project Structure

- `src/app/` - Next.js App Router pages and layouts
  - `layout.tsx` - Root layout with Geist fonts and global styles
  - `page.tsx` - Home page component
  - `globals.css` - Global styles with CSS custom properties and dark mode support
- `public/` - Static assets (SVG icons)

## Code Conventions

- Uses React 19 with TypeScript in strict mode
- Tailwind CSS with custom CSS variables for theming
- Dark mode support via `prefers-color-scheme`
- Font loading optimized with `next/font/google` (Geist and Geist Mono)
- ESLint configuration extends Next.js core web vitals and TypeScript rules

## Key Dependencies

- **Client State**: Zustand for state management
- **Local Storage**: Dexie for IndexedDB operations
- **Validation**: Zod for runtime type validation
- **Date Handling**: date-fns for date utilities
- **Styling**: Tailwind CSS v4 with PostCSS plugin

## Development Notes

- Project uses Turbopack for faster builds and development
- TypeScript paths are configured for `@/*` imports from `src/`
- Dark mode is handled automatically via CSS media queries
- ESLint ignores build directories and generated files