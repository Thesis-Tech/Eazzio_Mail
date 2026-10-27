---
name: Eazzio Mail Premium Design System
colors:
  surface: '#F8FAFC'
  surface-dim: '#EDF2F7'
  surface-bright: '#FFFFFF'
  surface-container-lowest: '#FFFFFF'
  surface-container-low: '#F8FAFC'
  surface-container: '#F1F5F9'
  surface-container-high: '#E2E8F0'
  surface-container-highest: '#CBD5E1'
  on-surface: '#0F172A'
  on-surface-variant: '#475569'
  inverse-surface: '#090D16'
  inverse-on-surface: '#F8FAFC'
  outline: '#E2E8F0'
  outline-variant: '#CBD5E1'
  surface-tint: '#0D9488'
  primary: '#0D9488'
  on-primary: '#FFFFFF'
  primary-container: '#F0FDFA'
  on-primary-container: '#134E4A'
  inverse-primary: '#5EEAD4'
  secondary: '#1E293B'
  on-secondary: '#FFFFFF'
  secondary-container: '#F1F5F9'
  on-secondary-container: '#0F172A'
  tertiary: '#6366F1'
  on-tertiary: '#FFFFFF'
  tertiary-container: '#EEF2FF'
  on-tertiary-container: '#312E81'
  error: '#E11D48'
  on-error: '#FFFFFF'
  error-container: '#FFE4E6'
  on-error-container: '#9F1239'
  background: '#F8FAFC'
  on-background: '#0F172A'
  surface-variant: '#F1F5F9'
typography:
  display-lg:
    fontFamily: Geist
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Geist
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Geist
    fontSize: 20px
    fontWeight: '600'
    lineHeight: '1.35'
  title-lg:
    fontFamily: Geist
    fontSize: 18px
    fontWeight: '600'
    lineHeight: '1.4'
  title-md:
    fontFamily: Geist
    fontSize: 16px
    fontWeight: '600'
    lineHeight: '1.4'
  body-lg:
    fontFamily: Geist
    fontSize: 15px
    fontWeight: '400'
    lineHeight: '1.5'
  body-md:
    fontFamily: Geist
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
  label-md:
    fontFamily: Geist
    fontSize: 13px
    fontWeight: '500'
    lineHeight: '1.4'
  label-sm:
    fontFamily: Geist
    fontSize: 12px
    fontWeight: '500'
    lineHeight: '1.4'
    letterSpacing: 0.01em
  mono-data:
    fontFamily: Geist Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: '1.0'
    letterSpacing: 0.03em
rounded:
  sm: 0.375rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.25rem
  full: 9999px
spacing:
  container-margin: 1.5rem
  stack-gap: 0.75rem
  section-gap: 1.5rem
  card-padding: 1.25rem
  input-height: 42px
---

# Design System: Eazzio Mail (Enterprise High-Agency Edition)

## 1. Visual Theme & Atmosphere
A balanced, distraction-free productivity canvas fusing the mathematical precision of Swiss typography with contemporary ergonomic email architecture. The mood is calm, reliable, and premium — avoiding aggressive neon glows or childish roundedness in favor of crisp borders, layered surfaces, and micro-motion.

- **Density:** 6/10 (Balanced High-Efficiency Daily App)
- **Variance:** 5/10 (Offset Asymmetric Reading Pane & Thread Scanners)
- **Motion:** 6/10 (Fluid Spring Physics with Tactile Push Feedback)

## 2. Color Calibration & Roles
- **Canvas Neutral** (`#F8FAFC`) — Foundations and outer backdrop
- **Pure Surface** (`#FFFFFF`) — High-focus card surfaces and reading panels
- **Deep Slate Anchor** (`#0F172A`) — Primary typography, headers, and active high-contrast weights
- **Muted Slate** (`#64748B`) — Body descriptions, timestamps, and secondary metadata
- **Hairline Divider** (`#E2E8F0`) — 1px crisp structural divisions
- **Eazzio Teal Accent** (`#0D9488`) — Singular high-intent focus color for CTAs, active folders, focus rings, and selection indicators. Strict restraint: never used as ambient background flood.
- **Banned Aesthetics:** No oversaturated violet/purple neon glows, no harsh pure blacks (`#000000`), no generic pastel gradients.

## 3. Typographic Architecture
- **Display & Headlines:** `Geist` — Track-tight, controlled scale with crisp mathematical weights.
- **Body & Interface:** `Geist` — Clean vertical metrics, relaxed line heights for lengthy email correspondence.
- **Data & Metadata:** `Geist Mono` — For timestamps, thread message counts, storage gauges, and keyboard shortcuts.
- **Banned:** Generic `Inter` and legacy serif faces (`Times`, `Georgia`) are forbidden in core mail dashboards.

## 4. Component Stylings
- **Buttons:** Tactile -1px push translation on active click. Subtle ambient shadow, 10px corner radius.
- **Thread Rows:** Crisp 1px division, 3px left active indicator for selected thread, background transition with 150ms spring easing.
- **Search Header:** 12px corner radius, inset icon with muted placeholder, soft ambient focus ring (`rgba(13, 148, 136, 0.18)`).
- **Security & Phishing Banners:** Full-width tonal alert banners with clear dual-action buttons (Report Phishing / Mark Safe) that clearly communicate risk without visual clutter.
- **Compose Modal:** Clean floating dock with resizable canvas, chip autocompletion for email recipients, and zero-flicker hook architecture.

## 5. Anti-Patterns (Banned)
- No emojis anywhere in system chrome.
- No pure black backgrounds (`#000000`).
- No neon button halos or multi-colored gradient borders.
- No broken external image links — use inline SVG avatars with computed initials.
- No overlapping text or absolute coordinate collision.
