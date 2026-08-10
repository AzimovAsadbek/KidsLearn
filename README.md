# KidsLearn

An interactive learning platform for children aged 1–7 — with a playful child app, a data-rich
parent dashboard and a full content admin, all built on one design system.

> **Learning that feels like playing.**

---

## Three experiences, one product

| Surface    | Route prefix | Character                                                                      |
| ---------- | ------------ | ------------------------------------------------------------------------------ |
| **Child**  | `/kids`      | Playful, colourful, touch-first. Big targets, minimal text, sound and confetti. |
| **Parent** | `/dashboard` | Modern SaaS. Progress analytics, AI recommendations, family management.        |
| **Admin**  | `/admin`     | Professional CMS. Content workflow, media library, platform analytics.         |

They share tokens, typography and components — but never the same tone of voice.

---

## Feature map

**Child** — home with mascot, lesson player, six game engines (Color Match, Animal Sounds,
Letter Match, Number Game, Puzzle, Memory), books, videos, activities, profile, rewards, star
shop, medals, voice control.

**Parent** — dashboard with family switcher, weekly progress charts, subject strength, AI
recommendation, activity feed, children management with a three-step add-child flow, per-child
profile, progress and statistics with filters, achievements, rewards, leaderboard, notification
centre with push opt-in, printable certificates, eight settings sections.

**Admin** — dashboard with platform metrics, users / parents / children tables, lesson and game
management with a draft → review → published → archived workflow, subjects, categories, media
library (grid + list, upload, preview drawer), AI image generator with a review queue,
achievements, rewards, announcements, leaderboard moderation, certificates, advanced analytics
(DAU/WAU/MAU, retention, completion rates), platform settings with feature flags.

**Platform** — light/dark themes, Uzbek/Russian/English, PWA with offline support, push
notification flow, voice assistant, and loading / empty / error / offline states throughout.

---

## Design system

Tokens live in [`src/app/globals.css`](src/app/globals.css) in three layers:

1. **Primitives** (`@theme`) — brand ramp plus eight supporting hues, radii, easings.
2. **Semantic tokens** (`:root` / `.dark`) — `surface`, `content`, `border`, `primary`, `success`…
   Dark mode is a re-designed deep-indigo surface stack, not an inversion.
3. **Recipes** — focus ring, scrollbars, the kid canvas, the tactile press.

Features never reach for a raw hue. They pick a **tone** from
[`src/lib/tone.ts`](src/lib/tone.ts), which decides the tint, ink, fill, border, gradient and the
hex used by SVG charts — so a subject's colour is identical on a badge, a stat card, a lesson
tile and a chart series.

Typography is a fixed scale (`.t-display` → `.t-overline`) with **Plus Jakarta Sans** for UI and
**Baloo 2** for display and child surfaces.

---

## Architecture

```
src/
├── app/                  # routes, grouped by experience
│   ├── (auth)/           # landing, login, register, reset
│   ├── (parent)/         # dashboard, children, progress, rewards, settings…
│   ├── (child)/kids/     # kid home, lessons, games, books, profile…
│   └── (admin)/admin/    # console: people, content, engagement, platform
├── components/
│   ├── ui/               # primitives: button, card, field, overlay, data-table…
│   ├── charts/           # hand-built SVG: area, bar, multi-line, donut, heat grid
│   ├── layout/           # shell, sidebar, header, command search
│   ├── kid/              # mascot, kid shell, kid loading/error
│   ├── platform/         # install prompt, service worker, feature strip
│   └── providers/        # theme
├── features/             # domain slices: auth, parent, child, lessons, games,
│                         # rewards, catalog, certificates, admin, voice
├── data/                 # typed demo domain (deterministic, SSR-safe)
├── hooks/                # sound, speech, voice control, media query, online status
├── i18n/                 # flat typed dictionaries + provider
├── config/               # navigation
├── lib/                  # tone system, utilities, theme
└── types/                # domain model
```

Charts are hand-built SVG rather than a charting dependency: full control over tokens, dark mode
and accessibility, and every series is also readable as text.

---

## Running it

```bash
npm install
npm run dev
```

Then open <http://localhost:3000> and pick an experience. Useful entry points:

- `/` — role selection
- `/dashboard` — parent
- `/kids` — child (grown-up PIN to exit: `2468`)
- `/admin` — admin console

```bash
npm run build   # production build
npm run lint    # eslint
npx tsc --noEmit
```

---

## Notes on honesty

This is a complete **frontend**. Data comes from a typed, deterministic fixture layer in
`src/data/` — the same shapes a real API would return — so every screen shows realistic content
and server/client renders always agree.

Two capabilities are explicitly marked in the UI rather than faked:

- **AI image generation** runs in preview mode and says so; the prompt controls, review queue and
  approval flow are real, and a provider endpoint is configurable in admin settings.
- **Voice control** uses the Web Speech API where the browser supports it, and hides itself
  (never showing a dead button) where it doesn't. Every voice action also has a visible control.

---

## Accessibility

Semantic HTML, labelled controls, a visible focus ring, keyboard-navigable tabs, menus, dialogs
and tables, focus trapping and restoration in overlays, `aria-live` for game and lesson feedback,
and charts that carry their data as text. State is never encoded in colour alone — correct and
incorrect answers also change icon and wording. `prefers-reduced-motion` removes confetti,
floating and transitions globally.

---

## Tech

Next.js 16 (App Router) · React 19 · TypeScript (strict) · Tailwind CSS v4 · Zustand ·
lucide-react
