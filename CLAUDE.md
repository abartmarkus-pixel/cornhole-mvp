
# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

BildungsCORNsulting is a comprehensive cornhole scoring and tournament management application built with modern web technologies. The app features complete game management, player statistics tracking, visual score progression charts, and detailed game analysis.

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
  - `page.tsx` - Main application component with all game screens
  - `types.ts` - TypeScript interfaces for Player, Game, GameObject, etc.
  - `utils/gameUtils.ts` - Game logic utilities (scoring, shuffling, game end detection)
  - `hooks/useLocalStorage.ts` - Custom hook for persistent local storage
  - `globals.css` - Global styles with CSS custom properties and dark mode support
- `public/` - Static assets including cornhole bag and ball images for different states

## Code Conventions

- Uses React 19 with TypeScript in strict mode
- Tailwind CSS with custom CSS variables for theming
- Dark mode support via `prefers-color-scheme`
- Font loading optimized with `next/font/google` (Geist and Geist Mono)
- ESLint configuration extends Next.js core web vitals and TypeScript rules

## Key Dependencies

- **Client State**: React useState hooks for component state management
- **Local Storage**: Custom useLocalStorage hook for persistent data (players, game history)
- **Validation**: Zod for runtime type validation
- **Date Handling**: date-fns for date utilities
- **Styling**: Tailwind CSS v4 with PostCSS plugin
- **Animations**: canvas-confetti for game end celebrations
- **Charts**: Custom SVG-based chart implementation for score progression

## Development Notes

- Project uses Turbopack for faster builds and development
- TypeScript paths are configured for `@/*` imports from `src/`
- Dark mode is handled automatically via CSS media queries
- ESLint ignores build directories and generated files
- Hydration issues resolved with client-side rendering guard
- All game data persisted in localStorage for offline functionality

## Application Features

### Game Flow
1. **Player Selection**: Add/manage players with persistent statistics
2. **Object Configuration**: Choose number of bags and balls per player
3. **Game Configuration**: Set target points (preset or custom)
4. **Live Game**: Real-time scoring with object state tracking
5. **Game End**: Winner celebration with confetti animation
6. **Statistics**: Detailed game analysis and player statistics

### Player Management
- Create and delete players
- Track lifetime statistics (games played, wins, total points, throws)
- Detailed object statistics (bags/balls: missed, on board, sunk)
- Average points per game and per round calculations
- Expandable player detail views in statistics

### Game Statistics & Analysis
- **Live Score Tracking**: Real-time leaderboard during games
- **Game History**: Complete record of all played games
- **Clickable Game Details**: Click any game to view detailed statistics
- **Score Progression Charts**: Visual curves showing point progression per round
- **Object Performance Analysis**: Detailed breakdown of bags vs balls performance
- **Consistent Player Colors**: Each player has a consistent color across all games

### Data Persistence
- All player data and game history stored in localStorage
- Automatic save/load of current game state
- Game history with timestamp and duration tracking
- Statistics calculated from complete game history