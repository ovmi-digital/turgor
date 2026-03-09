# Turgor Blog + Climate Battery Article

**Date:** 2026-03-09
**Status:** Design approved

## Overview

Add a blog to turgor.garden. First article: Climate Battery System — an interactive Three.js simulation explaining underground thermal storage for greenhouses. The coming-soon landing page stays as the front door with a subtle CTA to the blog.

## Site Structure

```
turgor.garden/
├── /                             # Existing coming-soon hero (untouched)
├── /blog                         # Blog index page
└── /blog/climate-battery-system  # First article
```

## Landing Page Change

One subtle CTA linking to `/blog`. No nav bar, no layout changes.

## Blog Index (`/blog`)

Minimal grid of article cards. Dark aesthetic matching the landing page. Each card: title, one-line description, date. No categories, tags, or pagination. Link back to home.

## Article Layout (`/blog/[slug]`)

Reusable layout:
- Header: "Turgor" wordmark (links home) + "Blog" breadcrumb
- Article title (large, black weight)
- Date + reading context line
- Body: prose content, max-width ~720px
- Simulator embed zone: breaks out of prose width, ~90vw, ~70vh height
- More prose below simulator
- Footer: link to blog index + ovmi.digital

## Climate Battery Article Content

Tone: curious builder — explain the concept, show the thinking, approachable without dumbing down.

1. The problem — greenhouses lose heat overnight
2. The idea — soil as thermal storage (what a climate battery is)
3. How it works — fan, buried pipes, day/night cycle
4. Our design — 4x5m greenhouse, 8 pipes in 2 layers, solar fan, key decisions
5. [SIMULATOR EMBED] — interactive 3D simulation
6. What we learned — insights, tradeoffs
7. What's next — tease the bigger Turgor system

## Simulator Adaptation

Source: `origin/claude/add-climate-battery-case-study-woMxu` in ovmi-digital repo (1,186-line `.astro` file).

Changes:
- Remove `overflow-hidden` full-page layout
- Strip the header (article page has its own)
- Contain viewport + info panel in a block (~90vw, ~70vh)
- Preserve all functionality: day/night, time slider, cutaway, labels, raycasting, particles
- Controls bar stays at bottom of simulator block
- Future: further cleanup and improvements (separate pass)

## Visual Style

Dark aesthetic — Satoshi font, near-black background, white text, minimal color. Simulator lighting provides visual interest.

## Tech

- Astro 5 + Tailwind v4 (existing stack)
- Three.js via CDN importmap (as original)
- No new dependencies
- New files: blog layout component, blog index page, article page
