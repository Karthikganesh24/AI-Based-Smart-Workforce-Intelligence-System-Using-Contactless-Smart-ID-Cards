# Design — SmartWorkforce Dashboard

A locked design system for this app. Every page redesign reads this file before
emitting code. Do not regenerate per page — extend or amend this file when the
system needs to grow.

## Genre
modern-minimal

## Macrostructure family

- **Dashboard pages** (Overview, Analytics): Workbench — data-dense, tabular, function-first
- **Monitoring pages** (RoomOccupancy, Attendance): Stat-Led — metrics up front, detail on demand  
- **Management pages** (Employees, Terminal, History): Long Document — list/table primary

## Theme

Light theme (default):

- `--color-paper`     oklch(100% 0 0)        /* pure white */
- `--color-paper-2`   oklch(98% 0.002 260)   /* very light gray */
- `--color-paper-3`   oklch(95% 0.005 260)   /* light gray for hover */
- `--color-ink`       oklch(20% 0.02 260)    /* dark text */
- `--color-ink-2`     oklch(45% 0.02 260)    /* medium text */
- `--color-ink-3`     oklch(65% 0.02 260)    /* light text */
- `--color-rule`      oklch(90% 0.005 260)   /* subtle borders */
- `--color-accent`    oklch(58% 0.18 280)    /* purple-blue, brand */
- `--color-accent-hover` oklch(52% 0.18 280) /* darker on hover */
- `--color-focus`     oklch(58% 0.18 280)    /* focus rings */
- `--color-success`   oklch(55% 0.15 145)    /* green */
- `--color-warning`   oklch(60% 0.15 75)     /* amber */
- `--color-error`     oklch(55% 0.20 25)     /* red */

## Typography

- Display: Inter, weight 600, style normal, tracking -0.02em
- Body: Inter, weight 400, tracking 0
- Mono: JetBrains Mono, weight 400 (for metrics, codes, timestamps)
- Display tracking: -0.02em
- Type scale anchor: `--text-display` = clamp(1.75rem, 2vw, 2.25rem)

**No gradient text.** Headings are solid `--color-ink`. Emphasis via weight or accent underline only.

## Spacing

4-point named scale. Pages must use tokens, never raw values.

- `--space-2xs`: 0.25rem (4px)
- `--space-xs`: 0.5rem (8px)
- `--space-sm`: 0.75rem (12px)
- `--space-md`: 1rem (16px)
- `--space-lg`: 1.5rem (24px)
- `--space-xl`: 2rem (32px)
- `--space-2xl`: 3rem (48px)
- `--space-3xl`: 4rem (64px)

## Motion

- Easings: `--ease-out` = cubic-bezier(0.16, 1, 0.3, 1)
- Reveal pattern: None — content loads instantly, no scroll-triggered fades
- State transitions: 200ms on hover/focus, instant on `:active`
- Reduced-motion fallback: all motion disabled via `@media (prefers-reduced-motion)`

**No staggered grid delays.** No glassmorphism. No neon glows.

## Microinteractions stance

- Silent success (no celebratory toasts for routine actions)
- Hover delay 200ms (not 800ms — this is a work tool)
- Focus delay 0ms (instant)
- Optimistic updates where possible
- Undo over confirmation dialogs

## CTA voice

- Primary CTA: Solid `--color-accent` fill, `--radius-md` (0.5rem), padding `--space-sm` `--space-lg`
- Secondary CTA: `--color-rule` border, transparent background, same radius/padding
- Copy pattern: Verb + object ("Add employee", "Export data"), not vague ("Get started", "Learn more")

## Component rules

**No emoji icons.** Use text labels or minimal line-art SVG. Emoji are a crutch.

**No inline style attributes for color.** All colors via CSS tokens.

**Cards:** Solid backgrounds (`--color-paper-2`), 1px border (`--color-rule`), shadow only on `:hover`

**Metrics:** Display via `--font-mono` at `--text-3xl`, label via `--font-body` at `--text-sm`

**Tables:** Zebra striping via `nth-child`, row hover via `--color-paper-3`, no borders between cells

## Per-page allowances

- Dashboard pages: May use small data visualizations (Recharts), no decorative enrichment
- Monitoring pages: May use progress meters, status badges, live-updating numbers
- Management pages: Typography only, no charts

## What pages MUST share

- The Inter + JetBrains Mono font pairing
- The accent color (`--color-accent`) and its 5% placement limit
- The card treatment (solid, bordered, hover-shadow)
- The button voice (solid primary, outlined secondary)
- Section heading hierarchy (no numbered eyebrows, direct headings)

## What pages MAY differ on

- Macrostructure within the page-type family
- Data visualization type (bar vs line chart)
- Table column count

## Exports

### tokens.css

```css
:root {
  /* Color — Light theme */
  --color-paper:        oklch(100% 0 0);
  --color-paper-2:      oklch(98% 0.002 260);
  --color-paper-3:      oklch(95% 0.005 260);
  --color-ink:          oklch(20% 0.02 260);
  --color-ink-2:        oklch(45% 0.02 260);
  --color-ink-3:        oklch(65% 0.02 260);
  --color-rule:         oklch(90% 0.005 260);
  --color-accent:       oklch(58% 0.18 280);
  --color-accent-hover: oklch(52% 0.18 280);
  --color-focus:        oklch(58% 0.18 280);
  --color-success:      oklch(55% 0.15 145);
  --color-warning:      oklch(60% 0.15 75);
  --color-error:        oklch(55% 0.20 25);

  /* Typography */
  --font-display: Inter, -apple-system, system-ui, sans-serif;
  --font-body:    Inter, -apple-system, system-ui, sans-serif;
  --font-mono:    "JetBrains Mono", "SF Mono", Consolas, monospace;

  /* Type scale */
  --text-xs:      0.75rem;
  --text-sm:      0.875rem;
  --text-md:      1rem;
  --text-lg:      1.125rem;
  --text-xl:      1.25rem;
  --text-2xl:     1.5rem;
  --text-3xl:     2rem;
  --text-4xl:     2.5rem;
  --text-display: clamp(1.75rem, 2vw, 2.25rem);

  /* Spacing */
  --space-2xs: 0.25rem;
  --space-xs:  0.5rem;
  --space-sm:  0.75rem;
  --space-md:  1rem;
  --space-lg:  1.5rem;
  --space-xl:  2rem;
  --space-2xl: 3rem;
  --space-3xl: 4rem;

  /* Radius */
  --radius-sm:   0.25rem;
  --radius-md:   0.5rem;
  --radius-lg:   0.75rem;
  --radius-full: 9999px;

  /* Motion */
  --ease-out:  cubic-bezier(0.16, 1, 0.3, 1);
  --dur-short: 200ms;
}
```

### Tailwind v4 `@theme`

```css
@theme {
  --color-paper:   oklch(15% 0.02 260);
  --color-ink:     oklch(95% 0.01 260);
  --color-accent:  oklch(68% 0.18 280);
  --font-display:  Inter, sans-serif;
  --font-body:     Inter, sans-serif;
  --spacing-md:    1rem;
  --text-md:       1rem;
  --ease-out:      cubic-bezier(0.16, 1, 0.3, 1);
}
```

### DTCG `tokens.json`

```json
{
  "color": {
    "paper":  { "$value": "oklch(15% 0.02 260)", "$type": "color" },
    "ink":    { "$value": "oklch(95% 0.01 260)", "$type": "color" },
    "accent": { "$value": "oklch(68% 0.18 280)", "$type": "color" }
  },
  "font": {
    "display": { "$value": "Inter", "$type": "fontFamily" },
    "body":    { "$value": "Inter", "$type": "fontFamily" },
    "mono":    { "$value": "JetBrains Mono", "$type": "fontFamily" }
  },
  "space": {
    "md": { "$value": "1rem", "$type": "dimension" }
  }
}
```

### shadcn/ui CSS variables

```css
:root {
  --background:        15  0.02  260;   /* paper */
  --foreground:        95  0.01  260;   /* ink */
  --primary:           68  0.18  280;   /* accent */
  --primary-foreground: 15  0.02  260;   /* paper (on accent bg) */
  --muted:             30  0.02  260;   /* rule */
  --muted-foreground:  55  0.02  260;   /* ink-3 */
  --border:            30  0.02  260;   /* rule */
  --input:             30  0.02  260;   /* rule */
  --ring:              68  0.18  280;   /* focus */
  --radius:            0.5rem;
}
```
