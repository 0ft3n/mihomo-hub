---
name: Mihomo Hub
description: A glass control plane for Clash/Mihomo subscriptions — steel-blue signal over a graphite ground.
colors:
  steel-blue: "#5a86c8"
  steel-blue-deep: "#3f66a4"
  steel-blue-fill: "#2f5288"
  steel-blue-fill-deep: "#24406b"
  accent-text-dark: "#8fb0e0"
  accent-text-light: "#2b5288"
  graphite-00: "#0c1017"
  graphite-01: "#0e131b"
  graphite-02: "#121822"
  graphite-03: "#18202c"
  graphite-line: "#263140"
  paper-00: "#f3f5f8"
  paper-01: "#ffffff"
  paper-02: "#eef1f6"
  paper-line: "#dde2ea"
  text-dark: "#e8edf5"
  text-light: "#131a24"
  muted-dark: "#8b98ab"
  muted-light: "#545e6d"
  live-green: "#26c281"
  live-green-soft: "#3ad6a0"
  alert-coral: "#e87575"
  alert-coral-lit: "#ff8181"
  alert-crimson: "#dc5261"
  caution-amber: "#d5a94c"

typography:
  display:
    fontFamily: "Manrope, system-ui, sans-serif"
    fontSize: "clamp(34px, 5vw, 58px)"
    fontWeight: 800
    lineHeight: 1.08
    letterSpacing: "-0.032em"
  headline:
    fontFamily: "Manrope, system-ui, sans-serif"
    fontSize: "25px"
    fontWeight: 800
    lineHeight: 1.2
    letterSpacing: "-0.6px"
  title:
    fontFamily: "Manrope, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "normal"
  body:
    fontFamily: "Manrope, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.55
    letterSpacing: "normal"
  caption:
    fontFamily: "Manrope, system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 400
    lineHeight: 1.45
    letterSpacing: "normal"
  label:
    fontFamily: "Manrope, system-ui, sans-serif"
    fontSize: "10px"
    fontWeight: 800
    lineHeight: 1.2
    letterSpacing: "1.4px"
  mono:
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "normal"
rounded:
  xs: "6px"
  sm: "7px"
  md: "9px"
  lg: "10px"
  xl: "13px"
  card: "18px"
  pill: "999px"
spacing:
  hair: "4px"
  xs: "7px"
  sm: "9px"
  md: "13px"
  lg: "18px"
  xl: "28px"
  gutter: "34px"
components:
  button-primary:
    backgroundColor: "{colors.steel-blue-fill}"
    textColor: "#ffffff"
    rounded: "{rounded.sm}"
    padding: "10px 15px"
  button-primary-hover:
    backgroundColor: "{colors.steel-blue}"
    textColor: "#ffffff"
  button-secondary:
    backgroundColor: "{colors.graphite-03}"
    textColor: "{colors.text-dark}"
    rounded: "{rounded.sm}"
    padding: "8px 11px"
  button-danger:
    backgroundColor: "{colors.alert-crimson}"
    textColor: "#ffffff"
    rounded: "{rounded.sm}"
    padding: "9px 14px"
  nav-item:
    backgroundColor: "transparent"
    textColor: "{colors.muted-dark}"
    rounded: "{rounded.sm}"
    padding: "10px 12px"
  nav-item-active:
    backgroundColor: "#10342f"
    textColor: "#b9fff6"
    rounded: "{rounded.sm}"
    padding: "10px 12px"
  input:
    backgroundColor: "{colors.graphite-00}"
    textColor: "{colors.text-dark}"
    rounded: "{rounded.sm}"
    padding: "10px 12px"
    height: "38px"
  card:
    backgroundColor: "{colors.graphite-02}"
    textColor: "{colors.text-dark}"
    rounded: "{rounded.lg}"
    padding: "18px"
  card-glass:
    backgroundColor: "{colors.graphite-02}"
    textColor: "{colors.text-dark}"
    rounded: "{rounded.card}"
    padding: "24px 26px"
  chip-live:
    backgroundColor: "#153c32"
    textColor: "#46d9a5"
    rounded: "{rounded.pill}"
    padding: "5px 9px"
    height: "25px"
  callout:
    backgroundColor: "#10302d"
    textColor: "#b9e7e0"
    rounded: "0px"
    padding: "13px"
---

# Design System: Mihomo Hub

## Overview

**Creative North Star: "The Glass Control Plane"**

Mihomo Hub looks like what it is: infrastructure you can see through. Translucent panels float above a faint technical grid, and the grid never fully disappears behind them — a 64px lattice bleeds through the public page, the panel's `backdrop-filter: blur(16px)` header lets the page scroll underneath itself, and modal chrome frosts rather than blocks. The metaphor is a control plane rendered in glass: the machinery is visible, the interface is the pane you reach through to touch it.

Depth is read from the surface stack, not from shadow. Everything rises out of an almost-black blue-green ground (`#071116`) through three progressively lighter tints, and lightness alone tells you what sits on top of what. Hairline borders draw the structure; large soft shadows are atmosphere, never the thing that separates a card from its background. The stack inverts to paper-white and the neutral hierarchy still reads — but neutrals were the only half that inverted cleanly, and every accent and semantic colour needed its own light-theme peer before the light theme actually held.

Color is scarce on purpose. The near-black is the resting state and steel blue appears only where something is genuinely live, selected, focused, or succeeding. The palette was teal until 2026-09-09; a rendered scan flagged cyan-on-dark as one of the most recognisable generated-UI signatures across 38 elements on the public page alone, so the whole system was rotated to a blue-grey hue that carries the same infrastructure register without the tell. The density is tight and instrument-like: 38px controls, 14px body, 10px uppercase labels, `ui-monospace` wherever the user is looking at real config. The register is an operator's console — not a consumer VPN app, and never a growth dashboard.

**Key Characteristics:**
- Tonal surface stack (four steps) as the primary depth signal; shadows are ambient only
- Steel blue as a scarce signal against a graphite ground
- Hairline 1px borders (`--line`) doing all structural separation
- Glass as chrome: backdrop blur on headers, modals, and sticky footers, not on content
- Instrument density — 38px controls, tight 6–13px gaps, monospace for anything real
- Spring-eased micro-response: 0.965 press scale, 3px focus rings, 0.18–0.28s transitions
- Two themes driven from one custom-property layer, at equal quality

## Colors

An almost-black blue-green ground with a single lit teal signal, plus a narrow set of semantic states. The whole system runs on ten custom properties redeclared per theme; everything else is derived with `color-mix()`.

### Primary

- **Steel Blue** (`#5a86c8`): the signal color. Focus rings, active tabs, selected menu items, progress fills, the accent on every icon that means "this is the thing". Used flat, never as a glow — zero-offset coloured halos were removed from the system.
- **Steel Blue Deep** (`#3f66a4`): the lighter companion for borders and tinted fills.
- **Steel Blue Fill** (`#2f5288`) / **Fill Deep** (`#24406b`): the primary-button gradient and the logo tile. White text clears AA on both stops (7.83:1 and 10.39:1).

### Secondary

- **Route Blue** (`#4f9cff`): appears only on the public subscription page, in the card's top hairline gradient and the traffic-meter fill, where teal alone would flatten. It is a second voice on one surface, not a system-wide secondary.

### Tertiary

- **Live Green** (`#26c281`) and **Live Green Soft** (`#3ad6a0` / `#46d9a5`): service status dots, the active-profile tag, "installed" confirmations. Deliberately distinct from teal so "running" never reads as "selected".
- **Caution Amber** (`#d5a94c`): the single warning hue, used where upstream data is unavailable rather than wrong.
- **Alert Coral** (`#e87575` / `#ff8181`) and **Alert Crimson** (`#dc5261`): destructive and failed states. Coral for inline errors and destructive affordances, crimson for the committed destructive action.

### Neutral

- **Graphite 00** (`#0c1017`): the page ground, and also the recessed fill inside inputs, code boxes, and nested cards. The darkest step appears both behind everything and inside everything — recession and background share a value.
- **Graphite 01** (`#0e131b`): the sidebar and override key-list rail.
- **Graphite 02** (`#121822`): the default panel and card surface.
- **Graphite 03** (`#18202c`): the raised step — secondary buttons, toggles, sticky footers, hovered menu rows.
- **Graphite Line** (`#263140`): every structural border, divider, and rule in the dark theme.
- **Text** (`#eaf2f5`) and **Muted** (`#81939d`): primary and secondary text. Muted carries all captions, labels, hints, and code previews.
- **Paper 00–02** (`#f2f6f7` / `#ffffff` / `#edf5f5`) with **Paper Line** (`#dbe6e8`): the light theme's inverted stack, with text at `#14252c` and muted at `#687b84`.

### Named Rules

**The Scarce Signal Rule.** Steel blue marks state, never decoration. It is legal on focus rings, active tabs, selected rows, live progress, and primary actions — and nowhere else. If a screen has more than one accent-filled surface competing for the eye, one of them is wrong.

**The Derived Tint Rule.** Never introduce a new accent hex. Every tinted surface, border, and glow is `color-mix(in srgb, var(--accent) N%, ...)` — 5–10% for fills, 34–55% for borders, 13–15% for focus rings. The accent has exactly one source of truth per theme.

**The Two Signals Rule.** Blue means *selected*; green means *running*. They never substitute for one another. A status dot is green; a chosen tab is blue.

**The Inverted Stack Rule.** No color is written directly into a component. Both themes redeclare the same ten properties on `:root` and `html[data-theme=light]`; a component that hardcodes `#0d1b22` is a light-theme bug that has not happened yet.

## Typography

**Display / Body Font:** Manrope (weights 400, 500, 600, 700, 800), falling back to `system-ui`
**Mono Font:** `ui-monospace, SFMono-Regular, Menlo, monospace`

**Character:** Manrope is the whole voice — a geometric sans with enough warmth to stay readable at 10px and enough weight range (400→800) to build hierarchy without changing family. It is set tight and negative at display sizes (`-2.4px` tracking) and wide and heavy at label sizes (`800` weight, `+1.4px` tracking); the contrast between those two extremes is the type system's signature. Monospace is not a stylistic choice here — it appears exactly where the user is reading machine truth (rules, YAML, URLs, proxy servers), and its presence is a signal in itself.

### Hierarchy

- **Display** (800, `clamp(34px, 5vw, 58px)`, 1.08, `-0.032em`): public page hero only. Tight, but above the `-0.04em` floor.
- **Headline** (800, 25px, `-0.6px`): section heads on the public page.
- **Title** (700, 17px): page titles in the app header, card headings, modal titles.
- **Body** (400, 14px, 1.55): the base. Descriptive paragraphs cap around 510–620px.
- **Caption** (400, 11px, 1.45): hints, muted descriptions, secondary card text.
- **Label** (800, 9–11px, `+1.2–1.4px`, uppercase): reserved for structural labels that are not headings — nav group headers and column captions. Never as an overline above a heading.
- **Mono** (400, 10–12px, 1.6): rules, YAML previews, subscription URLs, server addresses, proxy identifiers.

### Named Rules

**The Machine Truth Rule.** Anything the user could copy, paste, or type into a config file is set in `ui-monospace`. Anything the interface says about it is set in Manrope. Mixing them inverts the signal.

**The Two Extremes Rule.** Hierarchy comes from the distance between 800-weight/negative-tracked display and 800-weight/positive-tracked micro-labels. The middle of the scale stays at 400–700 with normal tracking. Do not add tracking to body text.

**The Cyrillic Fit Rule.** Copy is Russian; Cyrillic runs 10–15% longer than the equivalent English. Every label, button, and tab must survive its longest realistic Russian string without truncation — test with the real word, not a placeholder.

## Layout

A two-column app shell: a 260px sticky sidebar at full height beside a fluid main column, with a 73px header row that both columns align to (the brand block and the page header share that exact height, so the top rule reads as one continuous line across the shell).

Content sits in a `.page` container at `28px 34px` padding, capped at 1440px and centered. Card grids are 3-up for profiles and 4-up for metrics at desktop, with a consistent 13px gutter. The public subscription page uses a narrower measure — `min(1120px, 100% - 40px)` — and centers its hero at 760px max.

Spacing is a tight, slightly irregular scale inherited from hand-tuning rather than a strict 8px grid: 4 / 7 / 9 / 13 / 18 / 28 / 34. Controls standardize on **38px height** almost everywhere (inputs, selects, comboboxes, toggles, geo fields), which is the single most important dimensional constant in the system.

**Responsive behavior** happens at four breakpoints:

- **1100–1000px**: admin rows collapse to one column; the sidebar becomes a 76px icon rail (`font-size: 0` hides labels while keeping active-item text).
- **900px**: the public subscription card, client grid, custom-proxy list, and rule-set heads all go single-column; the proxy form drops from 4 to 2 columns.
- **700px**: the shell stops being a grid entirely. The sidebar becomes a fixed 60px bottom tab bar with icon-only items; `.page` gains 80px of bottom padding to clear it; every multi-column grid flattens; the Monaco override workspace stacks its key rail above the editor.
- **620–560px**: public header actions shed their labels; the hero switches from centered to left-aligned; the proxy form goes fully single-column.

### Named Rules

**The 38px Control Rule.** Every interactive field — input, select trigger, combobox, option toggle, platform picker — is 38px tall. New controls match it or they visibly break the row.

**The Bottom Rail Rule.** Below 700px the sidebar is a bottom tab bar, not a hamburger drawer. Navigation stays permanently visible and thumb-reachable; anything that would require opening a menu to see where you are is wrong for this product.

**The Aligned Rule Rule.** The 73px header height is shared by the sidebar brand block and the main header so their bottom borders form one unbroken hairline. Changing one without the other breaks the shell's most visible alignment.

## Elevation & Depth

**Depth is tonal.** The four-step surface stack — `--bg` → `--panel` → `--panel2`, with `--side` as the sidebar's own step — is what tells the eye which plane it is looking at. Lightness does the work; a card is a card because it is lighter than the ground, not because it casts a shadow.

Two techniques support it and neither may replace it:

- **Hairlines.** A single `1px solid var(--line)` border is the structural separator throughout. Every panel, card, input, divider, and rail uses it, and it survives both themes because it is a token.
- **Glass.** `backdrop-filter: blur()` is reserved for *chrome that floats over content* — the sticky app header (16px), modal backdrops (10px), and the custom-proxy modal's sticky footer (12px). Content surfaces are never glass — the public page's cards were translucent at 20px with nothing scrolling beneath them, which is decoration, and they are now opaque.

Shadows exist but are atmospheric. `--shadow` is a wide, very soft, low-opacity drop (`0 18px 50px #0004` dark / `0 16px 40px #16434a12` light) that gives cards presence without implying they are lifted. The only shadows with real force are on genuinely floating layers — the select menu (`0 18px 50px #0008`) and the modal (`0 30px 90px #0009`).

### Shadow Vocabulary

- **Ambient card** (`box-shadow: var(--shadow)`, `0 6px 14px`): default on panels and profiles. Deliberately shallow — a 1px border paired with a 50px blur reads as a generated-UI signature, so the system commits to the edge and keeps the shadow faint.
- **Card hover** (`box-shadow: 0 18px 45px #0005`, plus border → `color-mix(in srgb, var(--accent) 35%, var(--line))`): the border shift is the real signal; the shadow just deepens with it.
- **Floating menu** (`box-shadow: 0 18px 50px #0008`): dropdowns and comboboxes.
- **Modal** (`box-shadow: 0 30px 90px #0009`): dialogs only.
- **Focus ring** (`box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 15%, transparent)`): every focused input, select, and combobox. Paired with `border-color: var(--accent)`.
- **Accent glow:** removed 2026-09-09. Zero-offset coloured halos are decoration, not depth; the craft floor requires an offset and a soft blur. The phosphor character now comes from the accent itself, not from a halo behind it.

### Named Rules

**The Tonal-First Rule.** If a new surface needs to read as "on top", give it the next step up the stack. Reach for shadow only after tonal separation and a hairline have both been tried.

**The Glass-Is-Chrome Rule.** `backdrop-filter` belongs to things that float over scrolling content — headers, modals, sticky action bars. A content card that blurs its background is imitating chrome it isn't.

**The Border-Speaks-First Rule.** On hover and selection, the border changes before anything else. `color-mix(in srgb, var(--accent) 35–70%, var(--line))` is the vocabulary; background tint (5–10% accent) follows, and shadow follows that.

## Shapes

Radii scale with the surface's importance and size, forming a clear ladder: **6–7px** for small controls and inline actions, **8–9px** for inputs, selects, toggles, and icon tiles, **10px** for panels and metric cards, **13px** for public-page step articles, **18–20px** for the largest glass cards, and **999px** for pills. The two extremes matter most — a 7px button inside an 18px card reads correctly; a 16px button inside it does not.

Icon tiles are a recurring silhouette: a square with an 8–15px radius, `display: grid; place-items: center`, sized 31/34/37/38/42/47px depending on context, filled either with a tinted accent surface (`#12342f`) or the full identity gradient. They appear as the logo, metric icons, panel icons, device markers, modal icons, public status icons, and step numbers — one form doing many jobs.

Borders are always exactly 1px and always `var(--line)` or a `color-mix()` derived from it. There is no 2px border in the system except the tab underline (`border-bottom: 2px solid var(--accent)`) and the callout's left rule (`border-left: 2px solid var(--accent)`), both of which are marks rather than containers.

Dashed borders (`1px dashed var(--line)`) mean *add something here* — the "add subscription" nav item and the empty custom-proxy state both use it.

### Named Rules

**The Radius Ladder Rule.** Radius is a function of size: 6–7px small, 8–9px medium, 10px panel, 13px feature, 18–20px hero card, 999px pill. A component's radius must sit below its container's.

**The One-Pixel Rule.** Structural borders are 1px, with no exceptions for enclosures. The single 2px stroke is the active-tab underline, which is an indicator and not a container. A coloured `border-left` thicker than 1px on a card, list item, callout or alert is a recognisable generated-UI tell and is banned outright.

**The Dashed-Means-Empty Rule.** A dashed border means an affordance to create or a slot with nothing in it. It never decorates a filled surface.

## Components

The feel across the board is **precise and responsive**: small targets, hairline borders, immediate spring feedback. Nothing has weight; everything answers.

### Buttons

- **Shape:** gently rounded (7px), with 8px on modal actions and glass-page buttons.
- **Primary:** the identity gradient (`linear-gradient(135deg, var(--accent), var(--accent2))`) with white text, `10px 15px` padding, no border. Gradient is what makes a button primary — a flat teal fill is not the same component.
- **Secondary:** `--panel2` fill, 1px `--line` border, `8px 11px` padding, inherited text color. This is the default action shape and by far the most common.
- **Destructive:** coral text (`#e87575`) on a secondary shell for the affordance; the *committed* destructive button escalates to a crimson gradient (`linear-gradient(135deg, #dc5261, #a92d40)`) with white text and a `#b94050` border. Two distinct steps, deliberately.
- **Hover:** `filter: brightness(1.08)` universally, plus a border shift to accent-mixed on bordered variants.
- **Active:** `transform: scale(.965)` at `0.08s` — the press is fast and small.
- **Disabled:** `opacity: .35–.55` with `cursor: not-allowed` (or `wait` while probing).

### Inputs and Fields

- **Style:** `--bg` fill (recessed below the panel they sit on), 1px `--line` border, 7px radius, `10px 12px` padding, 38px height.
- **Focus:** `border-color: var(--accent)` plus a 3px accent-at-15% ring. Composite fields (URL box, combobox, rule field) apply the same treatment via `:focus-within` on the wrapper so the whole control lights, not the bare input.
- **Labels** sit above at 11px/700, or at 10px in muted for dense grid forms.
- **Mono fields** — rules, imports, server addresses, resource URLs — switch to `ui-monospace` at 11–12px.

### Select and Combobox

A custom control, not a native `<select>`: a 38px trigger with a chevron that rotates 180° on open, a fixed transparent dismiss layer beneath, and a menu that animates in with `selectOpen` (`0.2s`, spring). Menu rows are 36px, hover to `--panel2`, and the selected row takes accent text on a 10% accent fill with a check. The combobox variant adds free typing and a scrollable 245px menu with a muted empty state.

### Cards and Panels

- **Corner:** 10px for panels, metrics, and profiles; 18px for the public subscription card.
- **Background:** `--panel`, with nested content boxes dropping to `--bg`.
- **Border:** 1px `--line`, shifting to 35% accent on hover.
- **Shadow:** ambient `--shadow`; see Elevation.
- **Padding:** 18–20px (24–28px on the public glass cards).
- **Entrance:** `cardEnter` (0.42s spring, `backwards`) with 0.04s stagger across the first four siblings.

### Navigation

Sidebar items are 17px icons beside 14px labels at `10px 12px` with a 7px radius, muted at rest. Hover fills to `--panel2`, brings text to full, and slides `translateX(3px)`. The active item is the system's most saturated non-button surface: `#b9fff6` on `#10342f` (light theme: `#087c71` on `#daf5f1`). Group headers are 10px/800 uppercase at `+1.4px`. Tabs are underline-only: muted text, `2px` transparent bottom border that becomes `var(--accent)` when active.

### Modals

Backdrop is `#02080cc2` with a 10px blur, fading in over 0.2s. The dialog is `min(500px, 100%)`, 16px radius, 28px padding, `0 30px 90px #0009`, entering with `modalIn` (0.32s spring, from `translateY(14px) scale(.96)`). Every modal opens with a 42px gradient icon tile above its title, and a 34px bordered close button sits at `right/top: 16px`. Actions right-align at the bottom and stack to a 2-column grid below 700px. The large custom-proxy modal makes its action bar sticky with a blurred translucent backing.

### Motion

Two easings define everything: `--ease-spring` (`cubic-bezier(.22,1,.36,1)`) for anything that enters, presses, or reveals, and `--ease-smooth` (`cubic-bezier(.4,0,.2,1)`) for color, border, and theme transitions. Durations sit at 0.18–0.28s for interaction, 0.32–0.42s for entrances, 0.55–0.65s for the hero. Theme switching transitions `background-color`, `border-color`, `color`, and `box-shadow` at 0.22–0.28s across every surface, so toggling themes reads as one coordinated move rather than a flash. A `prefers-reduced-motion` block collapses all animation and transition durations to `0.01ms`.

### Signature Component: The Network Progress Bar

A 3px fixed bar at the very top of the viewport, `z-index: 1000`, holding a 38% wide gradient sliver (`transparent → var(--accent) → #6cf4d9 → transparent`) with a 7px accent drop-shadow, sliding from `-110%` to `365%` on a 1.05s loop. It fades in and out at 0.18s driven by a global `mihomo-loading` event. This is the system's ambient answer to "is the server doing something" and it is the purest expression of the phosphor metaphor — a lit trace crossing a dark plane.

### Signature Component: The Probe Panel

The live latency-measurement surface. A tinted container (`5% accent on --bg`, 34% accent border) holding a summary row that shifts between three states — `running` (accent border and text, with a pulsing icon), `success` (45% accent border, 8% accent fill), and `failed` (`#74333b` border, `#421e24` fill, `#ef7f8c` text) — above a 4px determinate progress bar and a 2-column scrollable grid of 36px result rows. Pending results pulse their latency label; the chosen route takes an accent border and 10% fill. It is the one place in the system where teal is allowed to be busy, because measurement in progress is exactly the state teal exists to show.

## Design Debt

These were present in the incumbent build and were recorded here as if intentional. They are debt, not identity, and later passes must not cite this document to protect them.

- **Kickers and eyebrows** (`ПАНЕЛЬ УПРАВЛЕНИЯ`, `SELF-HOSTED CONTROL PLANE`, `ПРОФИЛЬ`, `БЫСТРЫЙ СТАРТ`, `.publicEyebrow`) — removed 2026-09-09. The craft floor bans them outright; an earlier revision of this file had promoted them to a named typography tier.
- **The hero-metric row** (`.metric` × 7) — replaced 2026-09-09 with a single line of fact, so the space above the fold goes to the profile cards.
- **Decorative glass** on the three public content cards — removed 2026-09-09; nothing scrolled beneath them.
- **The 2px accent `border-left` on `.callout`** — removed 2026-09-09.
- **Decorative backgrounds** — removed 2026-09-09: the `.welcome` radial haze plus its two 60px `repeating-linear-gradient` lattices, and the two radial spotlights on `.publicSubPage`. A rendered scan flagged the radial haze as a spotlight glow and the lattices as decorative stripes.
- **Zero-offset accent glows** on the logo, modal icons, brand mark and status dots — removed 2026-09-09.
- **The 49px icon tile above the Welcome heading** — removed 2026-09-09; a rounded-square icon container above an h1 is the universal generated feature-card shape.
- **Functional text below 11px** — 34 declarations at 9-10px raised 2026-09-09.
- **The teal palette itself** — replaced 2026-09-09 with steel blue on graphite. A rendered scan flagged cyan-on-dark 38 times on the public page and 33 on the panel; three candidate palettes were built and scanned before choosing, and the replacement scores zero on that rule with every contrast pair above AA.
- **Still open:** the `.publicGrid` 64px lattice (60px `repeating-linear-gradient` on `.welcome`, 64px `background-size` on `.publicGrid`); the detector flags the second as a generated-UI signature. Two authored surfaces (probe panel, override workspace) remain buried three to four levels deep behind template screens.

## Do's and Don'ts

### Do:

- **Do** derive every tinted surface from `color-mix(in srgb, var(--accent) N%, ...)` rather than introducing a new teal hex — 5–10% for fills, 34–55% for borders, 13–15% for focus rings.
- **Do** give new interactive controls a **38px height** and a 7–9px radius so they align with the existing field rows.
- **Do** reach for the next tonal step (`--bg` → `--panel` → `--panel2`) before reaching for a shadow when something needs to read as raised.
- **Do** pair `border-color: var(--accent)` with the 3px accent-at-15% ring on every focusable control, and apply it via `:focus-within` on composite fields so the whole control lights.
- **Do** set anything copyable or machine-authored — rules, YAML, URLs, server addresses — in `ui-monospace` at 10–12px.
- **Do** escalate destructive actions in two steps: coral text on a secondary shell for the affordance, crimson gradient for the committed confirm.
- **Do** define every new color through the `:root` / `html[data-theme=light]` property pair, and check the light theme in the same pass.
- **Do** test every label with its longest realistic Russian string; Cyrillic runs long and the interface is dense.
- **Do** stagger sibling card entrances at 0.04s with `cardEnter` so grids assemble rather than appear.
- **Do** keep `backdrop-filter` on floating chrome — headers, modal backdrops, sticky action bars, public glass cards.

### Don't:

- **Don't** use steel blue as decoration. It marks live, selected, focused, or succeeding state, and if two accent-filled surfaces compete on one screen, one is wrong.
- **Don't** substitute the accent for green. Blue is *selected*; green is *running*. A status indicator is never teal.
- **Don't** hardcode a hex into a component. Both themes redeclare the same ten custom properties; a literal color is a light-theme bug waiting to be found.
- **Don't** make shadows structural. `--shadow` is atmosphere; if a card only separates from its background because of its shadow, the tonal step is missing.
- **Don't** introduce a 2px structural border, and never a coloured `border-left` above 1px on a card, callout or alert. The active-tab underline is the system's only 2px stroke.
- **Don't** blur a content card's background. Glass is chrome; content surfaces are opaque tonal steps.
- **Don't** track display type tighter than `-0.04em`. The hero previously sat at `-2.4px` (≈`-0.07em` at the mobile clamp floor), which a rendered scan flags as extreme negative tracking; both heroes are now `-0.032em`.
- **Don't** replace the mobile bottom rail with a hamburger drawer. Below 700px navigation stays permanently visible; hiding where-you-are behind a menu is wrong for this product.
- **Don't** place a kicker, eyebrow or uppercase overline above a heading. The heading carries its own weight.
- **Don't** reach for the hero-metric template — a big number over a small label in a row of equal cards. State the fact in a sentence.
- **Don't** design in the consumer-VPN register: no giant glowing shield, no flag grids, no single hero connect-button, no reassurance copy. The operator wants controls, not comfort.
- **Don't** add a CSS framework, utility classes, or a component library. The system is hand-written CSS custom properties in one stylesheet, and that is a durable constraint.
- **Don't** colour text or a meaningful icon with `var(--accent)`. The bright accent is for fills and borders; text and icons take `var(--accent-text)`, which has a real light-theme peer.
- **Don't** ship a motion effect without confirming the `prefers-reduced-motion` block still neutralizes it.
