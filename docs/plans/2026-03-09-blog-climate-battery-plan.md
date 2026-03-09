# Blog + Climate Battery Article — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a blog to turgor.garden with the climate battery simulator as the first article.

**Architecture:** Blog pages live under `src/pages/blog/`. A reusable `BlogLayout.astro` wraps all articles. The simulator (1,186-line Three.js scene from ovmi-digital) gets adapted into an embeddable block within the article. The landing page gets a subtle CTA.

**Tech Stack:** Astro 5, Tailwind v4, Three.js r162 (CDN importmap), Bun

---

### Task 1: Fix global CSS for scrollable pages

The current `global.css` has `overflow: hidden` on `html, body` which works for the single-page landing but will break scrollable blog pages.

**Files:**
- Modify: `src/styles/global.css`
- Modify: `src/pages/index.astro`

**Step 1:** Move `overflow: hidden` and `height: 100%` off the global `html, body` rule in `src/styles/global.css`. These should only apply to the landing page, not globally.

In `src/styles/global.css`, change:
```css
html, body {
  margin: 0;
  padding: 0;
  height: 100%;
  overflow: hidden;
}
```
To:
```css
html, body {
  margin: 0;
  padding: 0;
}
```

**Step 2:** Add `h-screen overflow-hidden` to the landing page's root `<body>` tag in `src/pages/index.astro` to preserve its current behavior.

Change `<body>` to:
```html
<body class="h-screen overflow-hidden">
```

**Step 3:** Verify landing page still works — `bun run build` should pass.

**Step 4:** Commit.
```bash
git add src/styles/global.css src/pages/index.astro
git commit -m "fix: scope overflow-hidden to landing page only"
```

---

### Task 2: Create BlogLayout component

**Files:**
- Create: `src/layouts/BlogLayout.astro`

**Step 1:** Create `src/layouts/BlogLayout.astro` — a full HTML shell for blog pages with:

- Props: `title`, `description`, `canonicalPath`
- `<head>`: charset, viewport, description, OG tags, twitter card, Satoshi font preload, favicon, canonical URL using `https://turgor.garden` + `canonicalPath`
- `<body>`: slot for page content, no overflow constraints
- Global CSS import
- Same dark theme as landing page (via global.css tokens)

```astro
---
import "../styles/global.css";

interface Props {
  title: string;
  description: string;
  canonicalPath: string;
}

const { title, description, canonicalPath } = Astro.props;
const canonicalUrl = `https://turgor.garden${canonicalPath}`;
---
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="description" content={description} />
    <title>{title}</title>

    <link rel="preload" href="/fonts/Satoshi-Variable.woff2" as="font" type="font/woff2" crossorigin />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <link rel="canonical" href={canonicalUrl} />

    <meta property="og:title" content={title} />
    <meta property="og:description" content={description} />
    <meta property="og:type" content="article" />
    <meta property="og:url" content={canonicalUrl} />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="robots" content="index, follow" />
  </head>
  <body class="min-h-screen">
    <slot />
  </body>
</html>
```

**Step 2:** `bun run build` — should pass with no pages using it yet.

**Step 3:** Commit.
```bash
git add src/layouts/BlogLayout.astro
git commit -m "feat: add reusable BlogLayout component"
```

---

### Task 3: Create blog index page

**Files:**
- Create: `src/pages/blog/index.astro`

**Step 1:** Create `src/pages/blog/index.astro` with:

- Uses `BlogLayout`
- Header: "Turgor" wordmark linking to `/`, "Blog" label
- Article card list (hardcoded array for now — no content collections)
- Each card: title, description, date, link to article
- Dark minimal aesthetic matching landing page
- Footer: link to ovmi.digital

Define the articles array in frontmatter:
```typescript
const articles = [
  {
    title: "The Climate Battery",
    description: "Underground thermal storage for a 4x5m greenhouse. Interactive 3D simulation included.",
    date: "2026-03-09",
    slug: "climate-battery-system",
  },
];
```

**Step 2:** Build and verify — `bun run build` should generate `/blog/index.html`.

**Step 3:** Commit.
```bash
git add src/pages/blog/index.astro
git commit -m "feat: add blog index page"
```

---

### Task 4: Add blog CTA to landing page

**Files:**
- Modify: `src/pages/index.astro`

**Step 1:** Add a subtle "Read the build log" link to the landing page. Place it near the bottom attribution section, between the main content and the footer. Keep it minimal — small text, muted color, hover brightens.

Add before the bottom attribution `<div>`:
```html
<a
  href="/blog"
  class="text-xs font-bold tracking-[0.15em] uppercase
         text-white/40 hover:text-white/80
         transition-opacity duration-300"
>
  Read the build log →
</a>
```

**Step 2:** Build and verify.

**Step 3:** Commit.
```bash
git add src/pages/index.astro
git commit -m "feat: add blog CTA to landing page"
```

---

### Task 5: Extract simulator from ovmi-digital

**Files:**
- Create: `src/pages/blog/climate-battery-system.astro`

**Step 1:** Extract the full simulator source from the ovmi-digital branch:
```bash
git -C /Users/ovee/dev/micovi/ovmi-digital show origin/claude/add-climate-battery-case-study-woMxu:src/pages/case-studies/climate-battery-system.astro > /Users/ovee/dev/micovi/turgor/src/pages/blog/climate-battery-system.astro
```

**Step 2:** Verify the raw file is in place — `bun run build` may have errors but the file should exist.

**Step 3:** Commit the raw extraction before modifications.
```bash
git add src/pages/blog/climate-battery-system.astro
git commit -m "feat: extract climate battery simulator from ovmi-digital"
```

---

### Task 6: Adapt simulator into article page

This is the main refactoring task. Transform the full-page simulator into an article with the simulator embedded.

**Files:**
- Modify: `src/pages/blog/climate-battery-system.astro`

**Step 1:** Replace the file's `<head>` and outer structure to use `BlogLayout`. The page structure becomes:

```
BlogLayout (handles <html>, <head>, <body>)
  └── Article header (breadcrumb, title, date)
  └── Article prose (intro sections)
  └── Simulator embed (contained block, ~90vw, 70vh)
  └── Article prose (closing sections)
  └── Footer (blog link, ovmi link)
```

Key changes:
- Remove the standalone `<html>`, `<head>`, `<body>` — use BlogLayout instead
- Remove the simulator's own header bar (article page has breadcrumb)
- Wrap the simulator (viewport + info panel + controls) in a contained `<div>` with `max-w-[90vw] mx-auto` and `h-[70vh]` instead of full-screen
- Add article prose sections before and after the simulator
- Keep the importmap `<script>` tag — move it into the page's frontmatter area or a `<Fragment>` in the head
- Keep all Three.js code, controls, and styles as-is inside the simulator block
- The info panel + viewport layout stays side-by-side within the contained block

**Step 2:** Article content to add (before the simulator):

Section 1 — The Problem:
> Greenhouses trap sunlight during the day. They get hot — sometimes too hot. But the moment the sun sets, all that heat escapes through the glass. By morning, the temperature inside can be barely above freezing. You either burn propane, run electric heaters, or accept dead seedlings after the first hard frost.

Section 2 — The Idea:
> A climate battery stores daytime heat underground and releases it at night. The concept is simple: blow warm greenhouse air through pipes buried in the soil. The soil absorbs the heat. When temperatures drop, the thermal mass radiates warmth back up. No fuel, no grid power, no moving parts beyond a single fan.

Section 3 — How It Works:
> During the day, a thermostat-controlled fan pulls warm air from the greenhouse peak down through a vertical riser into a network of buried corrugated pipes. As air travels through the pipes, it transfers heat to the surrounding soil. The cooled air returns through a second riser on the opposite end. At night, the process reverses — the warm soil heats the cool air passing through.

Section 4 — Our Design:
> We designed this for a 4 × 5 meter greenhouse. Eight 110mm corrugated drainage pipes run the full length in two layers — four at 80cm depth, four at 120cm. A 12V inline fan mounted in the north riser moves air at roughly 100–150 m³/h. The whole system runs off a 50W solar panel and a small battery. No grid connection.

**Step 3:** After the simulator, add closing content:

Section 6 — What We Learned:
> Pipe spacing matters more than pipe count. Too close and the soil between them saturates quickly. Too far and you waste thermal mass. 50cm center-to-center at our scale hits the sweet spot. Airflow speed is counterintuitive — slower is better. The air needs contact time with the pipe walls to transfer heat. A fan that is too powerful pushes warm air straight through without dumping its energy.

Section 7 — What's Next:
> The climate battery is the first piece of Turgor — an autonomous greenhouse control system we are building in the open. Sensors, AI-driven decision making, and safety-first automation. Follow the build at turgor.garden.

**Step 4:** Build and verify — `bun run build` should succeed, page should render at `/blog/climate-battery-system`.

**Step 5:** Commit.
```bash
git add src/pages/blog/climate-battery-system.astro
git commit -m "feat: adapt climate battery simulator into blog article"
```

---

### Task 7: Visual polish and build verification

**Files:**
- Possibly tweak: `src/pages/blog/climate-battery-system.astro`
- Possibly tweak: `src/pages/blog/index.astro`

**Step 1:** Run `bun run build` — fix any build errors.

**Step 2:** Run `bun run preview` and visually verify:
- Landing page: video plays, CTA visible, links to `/blog`
- Blog index: article card shows, links to article
- Article page: prose renders, simulator loads and is interactive, closing content visible
- Responsive: check mobile layout (simulator stacks)

**Step 3:** Fix any visual issues found.

**Step 4:** Final commit.
```bash
git add -A
git commit -m "polish: visual adjustments for blog and article pages"
```

---

### Task 8: Push

**Step 1:** Push to GitHub.
```bash
git push origin main
```

Vercel auto-deploys from main.
