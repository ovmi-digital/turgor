# Blog Light Theme — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Apply the Turgor blog design system — light/white background with dark leaf green accents — to all blog pages. Landing page stays dark.

**Architecture:** New `blog.css` defines blog-specific tokens and overrides. `BlogLayout.astro` switches to it. Blog pages get recolored from dark to light. Hero texture applied as faded background on blog index.

**Tech Stack:** Astro 5, Tailwind v4, Bun

---

### Task 1: Create blog.css with design tokens

**Files:**
- Create: `src/styles/blog.css`

**Step 1:** Create `src/styles/blog.css`. This file imports Tailwind, defines blog-specific tokens, and overrides the body/selection styles for the light theme.

```css
@import "tailwindcss";

@font-face {
  font-family: "Satoshi";
  src: url("/fonts/Satoshi-Variable.woff2") format("woff2");
  font-weight: 300 900;
  font-display: swap;
  font-style: normal;
}

@theme {
  --font-sans: "Satoshi", system-ui, sans-serif;
  --color-blog-bg: #FAFAF8;
  --color-blog-text: #1A1A1A;
  --color-blog-muted: #6B7264;
  --color-blog-accent: #1B4332;
  --color-blog-accent-light: #2D6A4F;
  --color-blog-border: #E2E0DB;
  --color-blog-surface: #F0EFE9;
}

html, body {
  margin: 0;
  padding: 0;
}

body {
  font-family: var(--font-sans);
  background-color: var(--color-blog-bg);
  color: var(--color-blog-text);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

::selection {
  background-color: rgba(27, 67, 50, 0.15);
  color: inherit;
}
```

**Step 2:** `bun run build` — should pass (no pages use it yet).

**Step 3:** Commit.
```bash
git add src/styles/blog.css
git commit -m "feat: add blog.css with light theme design tokens"
```

---

### Task 2: Switch BlogLayout to use blog.css

**Files:**
- Modify: `src/layouts/BlogLayout.astro`

**Step 1:** Change the CSS import from `global.css` to `blog.css`:

Change:
```astro
import "../styles/global.css";
```
To:
```astro
import "../styles/blog.css";
```

**Step 2:** `bun run build` — should pass. All blog pages now use the light theme.

**Step 3:** Commit.
```bash
git add src/layouts/BlogLayout.astro
git commit -m "feat: switch BlogLayout to blog.css light theme"
```

---

### Task 3: Restyle blog index page

**Files:**
- Modify: `src/pages/blog/index.astro`

**Step 1:** Replace all dark-theme color classes with blog design system colors. The full updated page content:

- Header "Turgor" link: change `text-white/50 hover:text-white/90` to `text-[var(--color-blog-accent)] hover:text-[var(--color-blog-accent-light)]`
- "Blog" heading: already uses `font-black tracking-tight` which is fine — it will inherit `--color-blog-text` from body
- Date: change `text-white/30` to `text-[var(--color-blog-muted)]`
- Article title: change `text-white/90 group-hover:text-white` to `text-[var(--color-blog-text)] group-hover:text-[var(--color-blog-accent)]`
- Description: change `text-white/50 group-hover:text-white/70` to `text-[var(--color-blog-muted)] group-hover:text-[var(--color-blog-text)]`
- Footer border: change `border-white/10` to `border-[var(--color-blog-border)]`
- Footer link: change `text-white/30 hover:text-white/60` to `text-[var(--color-blog-muted)] hover:text-[var(--color-blog-accent)]`

**Step 2:** Add the hero texture background. Wrap the existing header in a container with the botanical background:

Before the `<div class="mx-auto max-w-2xl ...">`, add a wrapper for the hero texture area:

```html
<div class="relative">
  <!-- Botanical texture background -->
  <div
    class="absolute inset-x-0 top-0 h-[40vh] bg-cover bg-center"
    style="background-image: url('/images/blog-hero.webp'); opacity: 0.08;"
  ></div>
  <div
    class="absolute inset-x-0 top-0 h-[40vh]"
    style="background: linear-gradient(to bottom, transparent 60%, var(--color-blog-bg) 100%);"
  ></div>

  <!-- Page content (existing div) -->
  <div class="relative mx-auto max-w-2xl px-6 py-12 md:py-20">
    ...existing content...
  </div>
</div>
```

Remove the outer `<div class="mx-auto max-w-2xl px-6 py-12 md:py-20">` and use the one inside the wrapper instead.

**Step 3:** `bun run build` — should pass.

**Step 4:** Commit.
```bash
git add src/pages/blog/index.astro
git commit -m "feat: restyle blog index with light theme and hero texture"
```

---

### Task 4: Restyle article page prose and chrome

**Files:**
- Modify: `src/pages/blog/climate-battery-system.astro`

**Step 1:** Update the article header and prose sections (lines 10-72). Change:

- Breadcrumb nav: `text-white/40 hover:text-white/80` → `text-[var(--color-blog-accent)] hover:text-[var(--color-blog-accent-light)]`
- Title h1: inherits from body `--color-blog-text`, no change needed
- Date: `text-white/30` → `text-[var(--color-blog-muted)]`
- Prose body: `text-white/70` → `text-[var(--color-blog-text)]` with `opacity-80` or just use `text-[var(--color-blog-muted)]` for body paragraphs. Better: use `text-[var(--color-blog-text)]` for paragraphs.
- Section h2: `text-white/90` → `text-[var(--color-blog-accent)]`

Specific changes in the article header (line 12-28):
```html
<nav class="flex items-center gap-2 text-xs font-bold tracking-[0.15em] uppercase text-[var(--color-blog-accent)] mb-6">
  <a href="/" class="hover:text-[var(--color-blog-accent-light)] transition-colors duration-300">Turgor</a>
  <span class="text-[var(--color-blog-muted)]">/</span>
  <a href="/blog" class="hover:text-[var(--color-blog-accent-light)] transition-colors duration-300">Blog</a>
</nav>
```

Date (line 23-27):
```html
<time ... class="block mt-4 text-xs font-bold tracking-[0.15em] uppercase text-[var(--color-blog-muted)]">
```

Prose section wrapper (line 31):
```html
<div class="prose-section space-y-8 text-sm leading-relaxed text-[var(--color-blog-text)]">
```

Each h2 (lines 33, 43, 53, 63):
```html
<h2 class="text-base font-black text-[var(--color-blog-accent)] mb-3">
```

**Step 2:** Update the simulator container border (line 77):
Change `border-white/10` to `border-[var(--color-blog-border)]`.

**Step 3:** Update the closing content section (lines 267-305):

Prose wrapper (line 269):
```html
<div class="prose-section space-y-8 text-sm leading-relaxed text-[var(--color-blog-text)]">
```

Each h2 (lines 271, 285):
```html
<h2 class="text-base font-black text-[var(--color-blog-accent)] mb-3">
```

Footer (line 294):
Change `border-white/10` to `border-[var(--color-blog-border)]`.

Footer links (lines 296-305):
- "Back to blog": `text-white/40 hover:text-white/80` → `text-[var(--color-blog-accent)] hover:text-[var(--color-blog-accent-light)]`
- "An Ovmi project": `text-white/30 hover:text-white/60` → `text-[var(--color-blog-muted)] hover:text-[var(--color-blog-accent)]`

**Step 4:** `bun run build` — should pass.

**Step 5:** Commit.
```bash
git add src/pages/blog/climate-battery-system.astro
git commit -m "feat: restyle article page with light blog theme"
```

---

### Task 5: Visual verification

**Files:**
- Possibly tweak: any blog file

**Step 1:** `bun run build` — must pass.

**Step 2:** `bun run preview` and visually verify:
- Landing page: still dark, video plays, CTA works
- Blog index: light background, green accents, hero texture visible as subtle background, article card works
- Article page: light background, green breadcrumb/headings, simulator renders correctly, closing content readable
- Check mobile (375px) and desktop (1440px)

**Step 3:** Fix any visual issues found.

**Step 4:** Commit if changes made.
```bash
git add -A
git commit -m "polish: visual adjustments for blog light theme"
```

---

### Task 6: Commit hero image and push

**Step 1:** Stage and commit the hero image:
```bash
git add public/images/blog-hero.webp
git commit -m "feat: add botanical hero texture for blog"
```

**Step 2:** Push to GitHub (confirm with user first).
```bash
git push origin main
```

Vercel auto-deploys from main.
