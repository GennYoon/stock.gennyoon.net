# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Korean dividend stock information website built with Next.js 15, React 19, TypeScript, and Tailwind CSS v4. The project aims to provide dividend stock information including dividend amounts, ex-dividend dates, and dividend payment dates to help investors make informed decisions.

## Development Commands

- **Development server**: `npm run dev` (uses Turbopack for faster builds)
- **Build**: `npm run build`
- **Production server**: `npm start`
- **Linting**: `npm run lint`

Note: This project uses pnpm as the package manager (evidenced by pnpm-lock.yaml).

## Project Structure

- **`src/app/`**: Next.js App Router structure
  - `layout.tsx`: Root layout with Geist font configuration
  - `page.tsx`: Main homepage (currently default Next.js template)
  - `globals.css`: Global styles with Tailwind CSS v4 and custom CSS variables
- **`docs/PRD.md`**: Product Requirements Document in Korean detailing the dividend stock features
- **`public/`**: Static assets (SVG icons)

## Key Technologies

- **Next.js 15** with App Router
- **React 19** 
- **TypeScript** with strict mode enabled
- **Tailwind CSS v4** with PostCSS integration
- **Geist fonts** (Sans and Mono variants)
- Path alias `@/*` maps to `./src/*`

## Product Requirements

Based on docs/PRD.md, the application should provide:
- Dividend stock search by name or stock code
- Filtering and sorting by dividend amount, ex-dividend date, payment date
- Detailed stock information display
- User-friendly interface

## Architecture Notes

- Uses Next.js App Router (not Pages Router)
- TypeScript configuration includes strict mode and path aliases
- Tailwind CSS v4 with inline theme configuration
- Dark mode support via CSS custom properties and `prefers-color-scheme`
- Font optimization using `next/font/google`