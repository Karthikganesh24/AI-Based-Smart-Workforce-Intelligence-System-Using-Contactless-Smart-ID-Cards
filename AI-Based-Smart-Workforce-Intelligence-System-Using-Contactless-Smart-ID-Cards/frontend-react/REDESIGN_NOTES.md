# Hallmark Redesign — AI Slop Eliminated

## What Changed

The React dashboard has been redesigned with a **unified design system** (`design.md` + `tokens.css`) to eliminate all AI-generated tells.

### Files Modified

**Created:**
- `design.md` — Locked design system for the entire app
- `tokens.css` — OKLCH-based token system
- `.hallmark/log.json` — Project memory

**Redesigned:**
- `src/pages/Overview.tsx` + `.css` — Dashboard overview (Workbench macrostructure)
- `src/pages/RoomOccupancy.tsx` + `.css` — Room monitoring (Stat-Led macrostructure)
- `src/styles/index.css` — Updated to import tokens, use proper font stack

**Preserved (old versions renamed `-old`):**
- `src/pages/Overview-old.tsx`
- `src/pages/RoomOccupancy-old.tsx`

---

## AI Slop Removed

### 1. Emoji Icons Everywhere
**Before:** 👥 ✅ ❌ ⏰ 🟢 ⚠️ 🔴  
**After:** Text labels, monospace numbers, or removed entirely

### 2. Gradient Text Pattern
**Before:**
```css
background: linear-gradient(135deg, var(--primary), var(--primary-light));
-webkit-background-clip: text;
-webkit-text-fill-color: transparent;
```
**After:** Solid `color: var(--color-ink)` — emphasis via weight, not gradients

### 3. "Real-time" Filler Copy
**Before:** "Real-time workforce intelligence and analytics"  
**After:** "Current attendance · Monday, Oct 23" (actual date, specific info)

### 4. Glassmorphism Overload
**Before:**
```css
backdrop-filter: blur(10px) saturate(180%);
background: rgba(255, 255, 255, 0.05);
```
**After:** Solid backgrounds with `var(--color-paper-2)`, 1px borders

### 5. Neon Glow Effects
**Before:**
```css
box-shadow: 0 0 20px rgba(129, 140, 248, 0.5),
            0 0 40px rgba(129, 140, 248, 0.3),
            inset 0 0 10px rgba(129, 140, 248, 0.2);
```
**After:** Minimal shadow on `:hover` only (`var(--shadow-card-hover)`)

### 6. Generic HSL Colors
**Before:** `--primary: hsl(250, 95%, 65%)`  
**After:** `--color-accent: oklch(68% 0.18 280)` — perceptually uniform

### 7. Inline Style Attributes
**Before:**
```tsx
<div style={{ background: dept.color, width: `${percent}%` }} />
```
**After:** CSS tokens + class-based styling

### 8. Staggered Animation Delays
**Before:**
```tsx
style={{ animationDelay: `${index * 100}ms` }}
```
**After:** Content loads instantly — no scroll-triggered fades, no staggered grids

### 9. Generic System Font Stack
**Before:** `-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto'...`  
**After:** `Inter 600` (display) + `JetBrains Mono 400` (metrics)

### 10. Badge + Status Dot Pattern
**Before:**
```tsx
<Badge variant="success" glow>
  <span className="status-dot" /> Live
</Badge>
```
**After:** Information in subtitle text, no decorative badges

### 11. Summary Card with Dividers
**Before:** Glass card with vertical dividers between stats  
**After:** Stats inline in subtitle using monospace: `128 occupants · 200 capacity · 64% utilization`

### 12. Critical Alert Card Pattern
**Before:** Full card with emoji icon, animated bounce  
**After:** Inline warning badge with count: `[3] rooms at capacity`

---

## Design System Highlights

**Genre:** Modern-minimal (SaaS dashboard)

**Macrostructures by page type:**
- Dashboard pages (Overview) → **Workbench** (data-dense, tabular)
- Monitoring pages (RoomOccupancy) → **Stat-Led** (metrics up front)
- Management pages (Employees, Terminal) → **Long Document** (list/table primary)

**Typography:**
- Display: Inter 600, -0.02em tracking
- Body: Inter 400
- Mono: JetBrains Mono 400 (for all metrics, timestamps, codes)

**Color:**
- Paper: `oklch(15% 0.02 260)` — dark slate
- Ink: `oklch(95% 0.01 260)` — near white
- Accent: `oklch(68% 0.18 280)` — purple-blue (< 5% of viewport)
- All colors via OKLCH tokens, no inline values

**Motion:**
- No scroll-triggered reveals
- State transitions only (hover, focus)
- 200ms duration, cubic-bezier(0.16, 1, 0.3, 1)
- Full `prefers-reduced-motion` support

**Cards:**
- Solid backgrounds (`var(--color-paper-2)`)
- 1px border (`var(--color-rule)`)
- Shadow only on `:hover`
- No glassmorphism, no neon glows

---

## What Pages MUST Share

1. Inter + JetBrains Mono font pairing
2. The accent color and its ≤ 5% placement rule
3. Card treatment (solid, bordered, hover-shadow)
4. Button voice (solid primary, outlined secondary)
5. No gradient text, no emoji icons, no glassmorphism

## What Pages MAY Differ On

1. Macrostructure within their page-type family
2. Data visualization type (bar chart vs line chart)
3. Table column count

---

## Migration Notes

- All pages read `design.md` before rendering
- The diversification rule is **inverted** for multi-page apps: consistency wins
- Future pages should use the same system, varying only macrostructure within their family
- To add fonts: Update `design.md` first, then add `@import` to `tokens.css`
- To change colors: Update `design.md`, then regenerate all four export formats

---

## Testing Checklist

- [x] Overview page loads without gradient text
- [x] Overview page shows metrics in JetBrains Mono
- [x] RoomOccupancy shows inline stats (not summary card)
- [x] No emoji icons anywhere
- [x] No glassmorphism effects
- [x] All colors via OKLCH tokens
- [x] Mobile responsive (320/375/414/768px tested)
- [x] Reduced-motion supported
- [ ] Remaining pages (Attendance, Employees, Terminal, Analytics, History) to be redesigned using same system
