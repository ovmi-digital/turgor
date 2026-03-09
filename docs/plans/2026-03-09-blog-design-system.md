# Turgor Blog Design System + Light Theme

**Goal:** Give the blog its own visual identity — light/white with dark leaf green accents — while keeping the landing page dark/cinematic. Generate a botanical hero texture via Replicate.

## Color Palette

| Token | Value | Usage |
|-------|-------|-------|
| `--color-blog-bg` | `#FAFAF8` | Page background — warm white |
| `--color-blog-text` | `#1A1A1A` | Primary text |
| `--color-blog-muted` | `#6B7264` | Secondary text, dates, captions — green-tinted gray |
| `--color-blog-accent` | `#1B4332` | Links, headings accent, borders — deep forest green |
| `--color-blog-accent-light` | `#2D6A4F` | Hover states |
| `--color-blog-border` | `#E2E0DB` | Dividers — warm gray |
| `--color-blog-surface` | `#F0EFE9` | Card backgrounds, code blocks |

## Typography

Satoshi Variable. Same font as landing page.

- **900 (Black)** — page titles, article titles
- **700 (Bold)** — section headings, UI labels, nav
- **400 (Regular)** — body text, descriptions

## Architecture

- `global.css` stays dark (landing page only)
- New `src/styles/blog.css` defines blog tokens and light-theme overrides
- `BlogLayout.astro` imports `blog.css`, sets light bg on body
- `::selection` uses green highlight (`rgba(27, 67, 50, 0.15)`)

## Hero Image

- Abstract botanical texture (close-up leaf veins / soil pattern)
- Generated via Replicate using a quality image model
- Saved to `public/images/blog-hero.webp`
- Used as a background on the blog index, ~10% opacity, covering the top ~40vh
- Fades out to solid `--color-blog-bg` via CSS gradient overlay
- Article pages do not use the hero — content is the focus

## Blog Index Layout

```
[botanical texture, ~10% opacity, top ~40vh background]

  TURGOR (link → /, accent green, small caps)

  Blog (near-black, font-black, clamp)

────────────────────────────────────────────

  MARCH 9, 2026 (muted green-gray, uppercase)
  The Climate Battery (near-black, font-black)
  Description (muted)

  ──── warm gray divider ────

  (future articles)

────────────────────────────────────────────

  AN OVMI PROJECT (muted, small caps)
```

- Article cards: clean typography, dividers between, no boxes
- Hover: title shifts to `--color-blog-accent`
- Texture fades to solid bg via gradient

## Article Page Layout

- Same light background, no hero texture
- Breadcrumb: `Turgor / Blog` in accent green
- Title in near-black, date in muted
- h2 section headings in accent green
- Body text in `--color-blog-text`
- Simulator block: self-contained, keeps its own scene colors
- Footer: accent green links

## Selection Style

```css
::selection {
  background-color: rgba(27, 67, 50, 0.15);
  color: inherit;
}
```
