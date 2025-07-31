# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Korean dividend stock information website built with Next.js 15, React 19, TypeScript, and Tailwind CSS v4. The project focuses on YieldMax ETFs dividend information, providing distribution rates, SEC yields, and payment dates to help investors make informed decisions.

## Development Commands

- **Development server**: `npm run dev` (uses Turbopack for faster builds)
- **Build**: `npm run build`
- **Production server**: `npm start`
- **Linting**: `npm run lint`

Note: This project uses npm as the package manager.

## Project Structure

- **`src/app/`**: Next.js App Router structure
  - `layout.tsx`: Root layout with Geist fonts, dark mode theme provider
  - `page.tsx`: Main YieldMax ETF listing page with search/sort functionality
  - `globals.css`: Global styles with Tailwind CSS v4 and Toss-style design system
- **`src/components/`**: Reusable UI components
  - `ui/`: shadcn/ui components (Button, Card, Dialog, Input, Badge, etc.)
  - `theme-provider.tsx`: next-themes integration for dark mode
  - `theme-toggle.tsx`: Dark/light mode toggle component
- **`src/assets/data/`**: Static data files
  - `list.json`: YieldMax ETF data (distribution rates, SEC yields, payment dates)
- **`src/shared/utils/`**: Utility functions (referenced in button.tsx)
- **`docs/PRD.md`**: Comprehensive Korean PRD for dividend investment app features

## Key Technologies & Architecture

- **Next.js 15** with App Router (not Pages Router)
- **React 19** with client-side state management
- **TypeScript** with strict mode and path aliases (`@/*` → `./src/*`)
- **Tailwind CSS v4** with inline theme configuration and PostCSS
- **Design System**: Custom Toss-style components with `.toss-*` CSS classes
- **UI Library**: shadcn/ui components with Radix UI primitives
- **Styling**: CSS custom properties for theming, oklch color space
- **Icons**: Lucide React icons
- **Fonts**: Geist Sans and Mono via next/font/google

## Component Architecture

- **Layout Pattern**: Root layout with theme provider wrapper
- **State Management**: React useState for search/sort/modal state
- **Data Flow**: Static JSON data imported and filtered/sorted in component
- **Modal System**: Radix Dialog for ETF detail views
- **Responsive Design**: Mobile-first with grid layouts and responsive text sizing
- **Theme System**: CSS variables with light/dark mode support via next-themes

## Toss-Style Design System

The app implements a custom Toss-inspired design system:
- `.toss-card`: Rounded cards with hover effects
- `.toss-button-primary/secondary`: Styled buttons with active states
- `.toss-input`: Form inputs with focus states
- `.toss-metric-card`: Gradient metric display cards
- `.toss-text-gradient`: Blue gradient text styling

## Data Structure

ETF data structure includes:
- `id`, `name`, `ticker`: Basic identifiers
- `distributionRate`, `secYield`: Key financial metrics (percentages)
- `strategy`: Investment strategy category
- `nextPaymentDate`: Next dividend payment date

## Product Context

Current implementation shows YieldMax ETF data. The broader vision (per PRD) includes:
- Portfolio management dashboard
- High-dividend stock analysis and simulation
- Dividend goal calculator
- Principal recovery tracking
- Investment news hub

However, current codebase is focused specifically on ETF information display rather than the full dividend investment app described in the PRD.

## Task Master AI Instructions
**Import Task Master's development workflow commands and guidelines, treat as if import is in the main CLAUDE.md file.**
@./.taskmaster/CLAUDE.md
