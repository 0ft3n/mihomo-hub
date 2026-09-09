---
target: frontend (whole app)
total_score: 22
max_score: 40
na_heuristics: 
p0_count: 4
p1_count: 2
target_identity: "file:/Users/dkoften/Documents/Dev/mihomo-hub/frontend/app.tsx"
target_fingerprint: "sha256:b980bb00ded9ab4dff6a57459f62ecb39627c9bdc298f1401c4de5482ed8461a"
target_path: /Users/dkoften/Documents/Dev/mihomo-hub/frontend/app.tsx
timestamp: 2026-09-09T18-59-59Z
slug: frontend-app-tsx
---
Method: dual-agent (A: design review vs craft-floor · B: detector + build evidence)

## Design Health Score — 22/40 (Acceptable)

| # | Heuristic | Score | Key issue |
|---|---|---|---|
| 1 | Visibility of system status | 2 | `.status` "Сервис работает" is static JSX (app.tsx:441), bound to nothing |
| 2 | Match system / real world | 2 | Public page uses operator register: `ПРОФИЛЬ`, two-URL choice, YAML tab |
| 3 | User control and freedom | 1 | rotate / DELETE profile / rules_mode implemented server-side, zero frontend callers. No undo anywhere |
| 4 | Consistency and standards | 3 | Native alert() for admin login; SelectField vs Combobox behave differently at same size |
| 5 | Error prevention | 2 | Proxy modal validation is strong; nothing else. Duplicate rule = silent no-op |
| 6 | Recognition over recall | 3 | Live rule preview is the best interaction; undercut by silent .slice(0,80) |
| 7 | Flexibility and efficiency | 3 | Strong power-user surface, zero keyboard shortcuts, no rule filter |
| 8 | Aesthetic and minimalist | 2 | 8 kickers, hero-metric x7, 3 same-size card grids, decorative glass |
| 9 | Error recovery | 2 | load() logs out on ANY error; transient 502 ejects operator to login |
| 10 | Help and documentation | 2 | "null удаляет ключ" is the entire deep-merge documentation |

## Design Specificity Verdict

Category-interchangeable, with two authored islands.

Welcome screen and public page are the generic SaaS-panel/onboarding template; substituting three labels turns either into an unrelated product. The two authored surfaces are the probe panel (streaming per-route latency with a four-state failure taxonomy distinguishing upstream from target failure) and the override workspace (a rail of the upstream config's real top-level keys, bleeding past the panel edge via negative margin). Both sit three to four levels deep. The product leads with its most generic screens and hides its only specific ones.

Deterministic scan: 7 findings, ALL in style.css, zero across four TSX modules. --no-config identical (nothing suppressed). Hook Stop pass added nothing. The detector found zero of 8 kickers, zero of 7 hero-metrics, zero of 3 card grids — slop is out of its rule scope as a class.

Browser visualization: unavailable. No Playwright/Puppeteer/driver, no docker, no .env. No rendered evidence exists for this run.

### DESIGN.md circularity

DESIGN.md launders the build rather than documenting it. Six verified contradictions: the north-star blur example is absent from the surface it describes (.publicHeader has backdrop-filter:none); "don't blur content cards" is contradicted by three content cards at blur(20px); the banned eyebrow was promoted to a named typography tier; the One-Pixel Rule was written to permit the 2px callout border; the Scarce Signal Rule is violated 7x on the first screen after login; the Inverted Stack Rule's hypothetical light-theme bug has already happened (#713840, #2c171c, #ee7b84, --client-accent with no light peer). DESIGN.md is not usable as a brief in its current state.

## Priority Issues

[P0] Hooks-order crash on first login — FIXED during this run. document.title useEffect sat after the early return; authed false->true changed hook count 3->4. Introduced by a prior pass in this session and pushed.

[P0] Three shipped capabilities have no UI. rotate, DELETE /profiles/{id}, rules_mode: zero callers (verified). account_key stored in localStorage, never displayed; "Выйти" runs localStorage.clear() unguarded, permanently destroying the workspace. Two of three positioning pillars absent from the interface.

[P0] WCAG AA fails at the token layer in both themes on the primary control. .primary white-on-accent = 2.49:1; --accent2 = 3.74:1; --muted on --panel2 = 3.99:1; --client-accent #50d4c5 on light bg = 1.67:1 and it colors the selected-client check.

[P0] Status chip lies and the panel logs out on transient errors. Together: green "Сервис работает" while ejecting the operator to a login screen where they may have no key.

[P1] Public page is designed for the operator. 520px Monaco tab, two-URL choice, 11px muted instructions, and the default client Koala Clash has href:"" so step 1 renders "Уже установлен" with no download link.

[P1] Rule reorder is mouse-only (WCAG 2.1.1 Level A). Rule order is the semantics in Mihomo.

[P2] Kickers, hero-metrics, card grids. Section numbers earn their place (sequence is load-bearing) but the 37px accent tile treatment is the tell; keep the ordinal, drop the tile, use <ol>.

## Persona Red Flags

Screen reader: SelectField is a listbox in name only (no aria-activedescendant, no arrow keys); 16-item tab-through. Metric reads value-before-label. .status has no role="status".
Low vision, light theme: every --muted string below AA, including .link code (the issued URL) at 10px.
Motor impaired: pointer:coarse 44px does not apply to a trackball on a fine-pointer device; icon-only dangerButton 6px from "Настроить" with no confirmation.
Link recipient (Марина, 58, iPhone SE): blank link preview (no OG tags), dark flash on cold load in light theme, step 1 claims the client is installed, half the nav is a code editor.

## Minor Observations

PRODUCT.md documents /sub/{slug}; src.tsx matches /subscription/. Rule-set save confirms in the wrong card. Two persistence models in one admin card. Untranslated "Rule sets сохранены" / "Custom rule sets". Two grid lattices at different pitches (60px repeating-linear-gradient vs 64px background-size). No meta theme-color, no meta description, no OG tags. Profile card lacks the Russian pluralization helper that exists twice elsewhere. Below 700px the operator cannot add a subscription, change theme, or sign out.

## Questions to Consider

1. Why are the only two non-interchangeable screens both four clicks deep behind three template screens?
2. Was this UI built from the API surface, or from a picture of what a control plane looks like?
3. If a document derived from a build can retroactively authorize anything the build does, what is DESIGN.md for?
