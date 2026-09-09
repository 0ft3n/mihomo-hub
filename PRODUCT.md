# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Two first-class audiences, deliberately weighted equally, with very different skill levels:

**The panel operator.** A technically confident self-hoster running Mihomo Hub on their own domain. They already hold one or more upstream Clash.Meta/Mihomo subscriptions and want more control over them than the provider gives: routing rules, YAML overrides, GeoData behavior, their own proxy servers. They work at a desk, usually alongside the raw upstream YAML, and they are comfortable with protocol vocabulary (VLESS, Trojan, Shadowsocks, Hysteria2, VMess, grpc/ws/xhttp, SNI, fingerprint). They enter through the panel and never see the public page except to hand a link over.

**The link recipient.** Someone the operator shares a config with — typically a friend or family member, typically on a phone, typically not technical. They arrive at a public `/sub/{slug}` page with no account and no context, and their entire job is: understand what this is, pick their platform, get a working client installed, and load the config. They do not read YAML and will not troubleshoot.

The panel is an Operate surface for the first user. The public subscription page is a hand-off surface for the second and must be designed for someone who has never heard of Clash.

## Product Purpose

Mihomo Hub takes an upstream Clash.Meta/Mihomo subscription and turns it into a set of independently modified, independently rotatable subscription links — one per device or per person — without touching the provider or asking anyone to edit config files.

Success is: the operator changes routing once in the panel and every device they issued a link to picks it up on the next refresh; and the person holding a link never has to know that happened.

## Positioning

The position is the combination, not any single part — a neighboring tool has one or two, not all three:

1. **No-account self-hosting.** There is no signup. Pasting an upstream subscription URL creates the workspace; an access key recovers it. One `install.sh` on Debian/Ubuntu provisions Docker, the domain, and automatic HTTPS via Caddy.
2. **Deep config surgery.** Routing rules with prepend/replace modes, recursive deep-merge YAML `overrides` where `null` deletes a key, GeoData format and mode control, proxy-group replacement, custom rule sets served as YAML providers, hand-built or link-imported custom proxies, upstream-node chaining, and automatic selection of the fastest working dialer via live latency probing.
3. **Per-device link issuing.** One upstream subscription fans out into many profiles, each with its own random public URL (long slug, short slug, and config slug), each rotatable on demand.

## Operating Context

- The operator runs this on their own VPS behind their own domain, deployed with Docker Compose and PostgreSQL. Production assumes HTTPS, strong `.env` values, a firewall, and backups of the `postgres_data` volume.
- The upstream subscription is the source of truth the operator does not own. Mihomo Hub refetches it on request and falls back to the last valid cached YAML when the provider fails — so "stale but working" is a normal, expected state that the interface has to represent honestly.
- Work in the panel is iterative and YAML-adjacent: the operator edits a profile, reads the generated config, adjusts, re-reads. A Monaco editor is part of the workflow, not an escape hatch.
- Adding a custom proxy involves probing candidate dialer routes and comparing measured latency; this is a live, streaming, sometimes-slow operation the UI must make legible while it runs.
- The recipient's context is a phone browser, cold, possibly on a bad connection, with no client installed yet. Clients are cross-platform and external (Koala Clash, Clash Verge Rev, FlClash across Windows / macOS / Linux / Android).
- Admin work — templates for new subscriptions, default profiles, global custom rule sets, cross-account subscription management — is a separate password-gated area of the same panel.

## Capabilities and Constraints

**Confirmed capabilities**

- Import by upstream URL; recovery by account key; multiple upstream subscriptions per account; multiple profiles per subscription.
- Per profile: `rules` + `rules_mode` (`prepend` / `replace`), `geo`, `overrides` (deep-merged, `null` deletes), `custom_proxies`, optional `proxy_groups`.
- Custom proxies: VLESS, Trojan, Shadowsocks, Hysteria2, VMess — via constructor, via `vless://` / `trojan://` / `hysteria2://` / `ss://` / `vmess://` link import, or as raw YAML.
- Live proxy probing that measures candidate dialer routes and picks the fastest working one.
- Three public URL forms per profile (`/sub/{slug}`, `/s/{short}`, `/c/{config}`) plus a YAML provider endpoint, all rotatable.
- Custom rule sets served as YAML providers at `/rule-sets/{name}.list`.
- Admin overview, editable profile templates for new subscriptions, and administrator access to a subscription's upstream secrets when managing it.
- Public subscription page showing quota/usage, expiry, proxy/group/rule counts, protocol types, and platform-filtered client recommendations.

**Durable constraints**

- **Russian-only UI.** No i18n layer is planned. Interface copy is Russian; protocol and technical identifiers stay in Latin (VLESS, grpc, SNI, `overrides`). Russian pluralization is hand-written where needed.
- **Dark-first, both themes real.** The teal-on-near-black dark theme is the identity. The light theme is a fully supported peer driven by the same custom properties, never a degraded afterthought.
- **Single-file frontend.** The frontend stays `frontend/src.tsx` + `frontend/style.css` — no CSS framework, no component library. Styling is hand-written CSS with custom properties on `:root` and `html[data-theme=light]`. Monaco and lucide-react are the only UI dependencies.
- **Small-scale self-host.** Built for one operator serving a handful of people. No billing, no user management, no multi-tenant or scale-out surfaces.
- Security constraints that are product-visible: upstream URLs pointing at local/reserved IPs are refused, upstream responses are capped at 10 MB, and public profile URLs are random rather than guessable.

## Brand Commitments

- Name: **Mihomo Hub**. Wordmark is set alongside a route/branch glyph (currently lucide `Route`) in a teal gradient tile.
- Existing identity in code: Manrope typeface; teal accent (`#14b8a6` / `#0d9488`, gradient `#1cd1bd → #087e78`) against a near-black blue-green ground (`#071116`).
- Voice: plain, direct Russian. Second-person, no marketing inflation, no exclamation. Existing hero line — «Ваша подписка. *Ваши правила.*» — sets the register: short, possessive, calm.
- Positioned in copy as a self-hosted control plane, not a service.

## Evidence on Hand

- Repository: FastAPI + SQLAlchemy backend, React 19 / Vite frontend, PostgreSQL, Docker Compose, Caddy for TLS. Backend tests exist for YAML, probe, and defaults services.
- `frontend/public/favicon.svg`, README (Russian), `install.sh`, `mihomo-probe.yaml`.
- **No** testimonials, customers, benchmark numbers, press, pricing, license claims, or usage statistics exist. Future work must not fabricate any of these. The screenshots, logos, and marketing imagery a Persuade surface would need do not exist yet and must be requested rather than invented.
- Public GitHub source referenced in the README: `0ft3n/mihomo-hub`.

## Product Principles

1. **The operator's power is the product; hide none of it.** Rules, overrides, YAML, and probing are why someone chose this over their provider's default. Progressive disclosure is fine; dumbing down is not.
2. **The two audiences never share a design register.** Panel copy may say `overrides` and `dialer`. The public page may not say either. What is precision on one surface is a wall on the other.
3. **Represent upstream truth honestly.** Cached fallback, stale refreshes, failed probes, and expired quotas are normal states, not errors to hide. The interface must let the operator tell "working" from "working on old data" at a glance.
4. **Destructive and irreversible actions are named, not implied.** Rotating a link breaks every device using it; deleting a subscription takes its profiles and issued links with it. These need explicit, specific confirmation — never a generic "Are you sure?".
5. **Both themes ship at the same quality.** Every color, shadow, and state is defined through the token layer so the light theme is never discovered broken.

## Accessibility & Inclusion

**WCAG 2.1 AA is a committed standard**, held across both the dark and light themes.

Practically this binds: AA contrast for text and meaningful non-text (including the teal accent on both grounds, the muted `--muted` text, and status indicators); full keyboard operability of the sidebar, comboboxes, Monaco surfaces, and modals with visible focus; modal focus trapping and Escape-to-close; status conveyed by more than color alone (probe results, service status, enabled/disabled profiles); and accessible names on the many icon-only controls.
