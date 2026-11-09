# DISHA Website + Odoo 19 System: Full Scope and Handover

Read this first when opening the project in a new session. Owner/developer: Otomater (Odoo 19 custom modules, OPL-1 licence). Reply style for the owner: Manglish (Malayalam in English letters, technical words in English), concise and professional; address him respectfully ("ningal"), never informal "nee/ninte". Do not waste usage.

## 1. What this is

**DISHA** = *Dedicated team for Indo Saudi Holistic Alignment*, a KSA-based Indian socio-cultural organisation (inaugurated 23 June 2021; regional committees announced 27 Oct 2021 at its first National Conference; works with the Embassy of India Riyadh, Saudi Yoga Committee, Arab Yoga Foundation). Contact: dishaindians@gmail.com.

This project is a fresh clone of the IOF Seva stack, rebranded and re-scoped for DISHA using DISHA's logo, profile PDF (47 pages) and paper **Membership Application Form** (22 fields). (The "cultural circular" PDF's text was unreadable; only its logo was used.)

Goal: a premium public website where people apply for membership online, the DISHA team approves them in Odoo, approved members get a digital ID card by email, the team manages all website content and events from Odoo, and members of a province get event emails.

## 2. Scope delivered

### 2.1 Public website (Next.js 15, App Router, TypeScript, Tailwind v4)
Pages: Home, About, Indians in KSA, Seva Activities (activities), Gallery, Collaborations, Reports, Contact, **Membership** (application form), Support (+ Track ticket), Privacy Policy, Terms.
- Home: full-screen **photo slideshow hero** (crossfade 5 s, pause on hover/focus, dots, prev/next, play/pause, no autoplay under reduced motion; falls back to dot-grid when no photos), services strip, intro, four pillars, impact, **Events block**, photo moments, CTA, reports, contact.
- About: formation story, key figures, vision/mission, structure (committees), key office bearers (no phone numbers).
- Membership form (4 sections matching the paper form): category (General / Associate), personal details, KSA details (province dropdown: Central/Western/Eastern/Northern/Southern, city), India details (state, district, village, PIN, address), two emergency contacts (KSA + India), passport (Iqama optional), blood group, qualification/occupation, why join, photo (JPEG ≤ 400 KB), consent.
- Events block: upcoming first (soonest), then past (latest first), max 6 on home; card shows date badge, title, date/time/place + province, details, optional photo; "Upcoming"/"Past event" label; empty-state message when none.
- Gallery with full-screen viewer; 8 local photos in `web/public/gallery` until real photos are uploaded in Odoo.
- Support tickets: raise (visa, iqama, passport, labour, medical, legal, emergency, other), get ticket number, track/reply through a private hashed-token link.
- Logo `web/public/disha-logo.png`; colours navy `#0c1b5e`, orange `#f26a0a`, green `#15803d`.

### 2.2 Odoo 19 addons (`odoo/`)
| Module | Depends | Purpose |
|---|---|---|
| `disha_membership` | base, mail | Model `disha.membership.application` (applications), API controller, approval workflow, groups, sequence `DISHA-MEM-00001` |
| `disha_membership_card` | disha_membership, **association_membership** (user's own addon, install untouched) | On approval creates an `association.member`, ID card PDF (86×54 mm, two-sided, QR), email, portal link |
| `disha_site_content` | base | All website content editable in Odoo (menu *DISHA Website*): texts, lists/cards, gallery, reports, logo, hero photo, **Events** (`disha.site.event`); public `GET /api/disha/site-content` |
| `disha_event_notify` | disha_site_content, disha_membership, mail | **Email Members** button on an event: sends to approved members of the event's province (or all) |
| `disha_admin_api` | disha_site_content, disha_membership | Back-end of the Next.js `/admin`: login with Odoo users (group *Website Admin (Next.js /admin)*), edit texts/lists/gallery/events/theme, approve applications |
| `disha_support_ticket` | base, mail | Support tickets with category/urgency → priority, SLA, private tracking token |

Install order: `association_membership, disha_membership, disha_membership_card, disha_site_content, disha_admin_api, disha_event_notify, disha_support_ticket`.

## 3. Key behaviour and rules

**Membership application** (`disha.membership.application`)
- Required: category, full_name, gender, date_of_birth, nationality, mobile, email, ksa_region (selection), ksa_city, passport_number, india state/district/village/PIN (`^[1-9][0-9]{5}$`)/address, KSA + India emergency name/relationship/phone, consent.
- Optional: whatsapp, blood_group (A+..O-), qualification, occupation, organization, iqama_number, why_join, photo.
- `ksa_region` is a Selection (keys `central, western, eastern, northern, southern`); the API also accepts the label text case-insensitively. Constant `KSA_REGIONS` (disha_membership) must stay in sync with `EVENT_REGIONS` (disha_site_content, adds `all`) and `REGIONS` in `web/src/lib/validation/membership.ts`; a test in disha_event_notify checks Odoo lists match.
- `iqama_number` and `passport_number` fields use `groups="disha_membership.group_disha_membership_manager"`: only managers see them; never printed on the card or in the QR.
- Strict allowlist in `_clean_payload`; idempotency by `Idempotency-Key` (same key replays, different submissions with the same email/mobile are accepted and flagged "possible duplicate" for staff).
- Status flow is enforced in the model (`_require_state`): new → under_review/contacted → approved; reject only from new/under_review/contacted; reset only from under_review/contacted/rejected; **approved is final** (it already has a member + ID card: suspend/cancel the member in Membership instead). Odoo form and Next.js /admin show only the allowed buttons.
- `action_approve` sets `approved_on`/`approved_by_id`; the card module's override creates the member (type `DISHA-GEN` General or `DISHA-ASC` Associate, fee 0, 2 years), issues the card and emails it (best effort).
- Groups: *DISHA Membership Applications* User (view/edit) and Manager (approve/reject/delete/configure, sees ID numbers).

**ID card / numbering (shared-DB safe)**
- DISHA member numbers use own sequence `disha.association.member`, prefix `DISHA/%(year)s/`, padding 5. IOF members keep the stock `ASM/` series.
- DISHA has its own report `report_disha_card`, paperformat `paperformat_disha_card`, template; it never edits the stock `association_membership` card template (IOF and DISHA run in ONE Odoo DB; a second xpath-replace of `ms_card` breaks installs).
- `action_print_card` / `action_email_card` are overridden: DISHA members → DISHA report, others → `super()`. Portal PDF link patched for DISHA types.
- wkhtmltopdf: no flex/grid, absolute positioning, zoom wrapper parameter `disha_membership_card.zoom` (default 1.27); QR is a data URI (`pip install qrcode`).
- Parameters: `disha_membership_card.org_name`, `.contact`, `.zoom`.

**Events and province emails**
- Event fields: title, date, end date, time text, province (All/…), place, details, photo, Published, computed `is_upcoming`. Odoo menu *Website Content > Events* (default filter Upcoming, group by Province).
- `disha_event_notify`: form shows "Members in this province: N"; **Email Members** (manager groups only) → UserError if unpublished, already over, already emailed (use **Email again**), or no recipients. Recipients = approved applications with valid email, unique case-insensitive, region match (or all). Sends via `mail.mail` (details escaped), records `notified_on/by/count`. Needs Outgoing Mail Server + company Alias Domain. Optional ICPs: `disha_event_notify.site_url` (link in email), `disha_event_notify.contact`.

**Website content from Odoo**
- API `GET /api/disha/site-content` returns `{texts, images, collections, events}`; Next.js fetches with ISR (`CONTENT_REVALIDATE_S`, default 30 s) and falls back to `web/src/content/defaults.ts` if Odoo is down.
- Root layout has `export const revalidate = 30` so pages refresh even if the site was built with Odoo unreachable.
- After adding editable texts/collections in `defaults.ts`: `cd web && npm run content:export` (regenerates `odoo/disha_site_content/data/seed.xml`), then `-u disha_site_content`.
- Collections: services, goals, pillars, impact, forums (committees), team, stats, support, activities, helps, faq, reports, steps, gallery.
- Media served from `/disha/site-media/<model>/<id>/<field>` (published only; images validated by magic bytes, SVG rejected).

**Security (summary)**: honeypot, Idempotency-Key, per-IP rate limit (needs `X-Real-IP`), same-origin check, Bearer token (`disha_membership.api_token` in system parameters, server-side only), hashed support tokens, magic-byte photo validation, role-based groups, generic error messages, no PII/tokens in logs.

## 4. Environment variables (`web/.env.example`)
`ODOO_BASE_URL`, `ODOO_DATABASE` (needed when Odoo hosts several DBs and no dbfilter), `ODOO_API_TOKEN` (= `disha_membership.api_token`, DISHA's own, not IOF's), `ODOO_TIMEOUT_MS`, `SITE_URL`, `RATE_LIMIT_MAX`, `RATE_LIMIT_WINDOW_MS`, `CONTENT_REVALIDATE_S`, `CONTENT_TIMEOUT_MS`, `ODOO_PUBLIC_URL` (photo host if different; next/image remotePatterns derive from it). No domain is baked in (placeholder `YOUR_DOMAIN`).

## 5. API (details in `docs/API.md`)
- Browser → Next: `POST /api/membership-application`, `/api/support-ticket`, `/api/support-ticket/lookup`, `/api/support-ticket/reply`, `GET /api/health`.
- Next → Odoo: `POST /api/disha/membership-application` (Bearer), `GET /api/disha/health`, support-ticket routes, public `GET /api/disha/site-content`.

## 6. Deployment (details in `docs/DEPLOYMENT.md`)
1. Copy the five `odoo/disha_*` folders next to `association_membership`; `pip install qrcode`.
2. `-i` the modules above (or `-u` for upgrades); read token in Settings > Technical > System Parameters.
3. Assign staff groups; set Outgoing Mail Server + Alias Domain.
4. Next.js: `cd web && cp .env.example .env.production` (fill), `npm ci && npm run build && pm2 start "npm start -- -p 3000" --name disha-web`; Nginx reverse proxy with `X-Real-IP`, `Host`, `X-Forwarded-Host`; HTTPS via certbot.
5. Known target: the owner's demo server `demo.elysians360.in` where IOF and DISHA share ONE Odoo database (DISHA modules installed at `/opt/disha-seva/odoo`).

## 7. Tests and how to run
- Web: `cd web && npm ci && npx vitest run` (75 tests pass: forms, validation, route, content, events, gallery, hero slideshow, support); `npx tsc --noEmit` clean; `npm run build` OK.
- Odoo (sandbox layout used so far): Odoo source `/home/claude/odoo-src`, addons path `addons,<repo>/odoo,/home/claude/am-src` (am-src = `association_membership`), Postgres user `odoo`/`odoo` (`service postgresql start`, export `PGPASSWORD=odoo` before `dropdb`). Example:
  `python3 odoo-bin --addons-path=addons,/path/disha-seva/odoo,/path/am-src -d d_dev -i disha_membership,disha_membership_card,disha_site_content,disha_event_notify,disha_support_ticket --test-tags /disha_membership,/disha_membership_card,/disha_site_content,/disha_event_notify --stop-after-init --db_host=localhost --db_user=odoo --db_password=odoo --without-demo=all` → last result 43 tests, 0 failures. Also verified IOF + DISHA modules installed together in one DB (89 tests, 0 failures).

## 8. Odoo 19 rules learned (avoid repeating)
- `assertRaises` takes one exception class, not a tuple. `fields.Image` raises UserError on non-image data before constraints.
- `res.partner` has no `mobile`; use `phone`.
- Boolean search on a non-stored computed field: needs `search=` method and may arrive as `('in', [True])` as well as `('=', True)`.
- View inheritance cannot use `@string` as an xpath selector; select by field name or `//sheet` position inside.
- Never inherit-and-xpath-replace the same stock block from two addons (second install fails "xpath cannot be located"); give each org its own report/paperformat/sequence. Never rename the shared `ASM/` sequence in a post_init_hook.
- Odoo 19 mail: From comes from the company's Alias Domain (Settings > Technical > Email > Alias Domains, Default From, then set on the Company); `mail.default.from`/`mail.catchall.domain` ICPs are ignored. A `mail.mail` with attachments tied to a model fails on Retry for users without that model's group.
- `odoo shell -u` does not upgrade modules; use `odoo-bin -u <module> --stop-after-init`.
- wkhtmltopdf renders mm at ~80%: zoom wrapper + zero margins + absolute positioning + data-URI QR.
- Next.js built without `ODOO_BASE_URL` makes pages fully static; keep `revalidate` in the root layout and build with the env present.
- Tailwind v4: an unlayered global `h1` rule beats utilities; keep base rules in `@layer base`.
- Shell hygiene: `pkill -f "[o]doo-bin"` kills your own shell if the same command text contains "odoo-bin" (run it in its own call); use `fuser -k PORT/tcp` for Next servers; `dropdb` without `PGPASSWORD` hangs on a password prompt.

## 9. Open items / not yet verified
- Owner has not confirmed the latest zip installed cleanly on `demo.elysians360.in` (check the earlier failed partial install left nothing behind in Apps).
- Real-device QA (phone/browser) of the site and the ID card print; tune `disha_membership_card.zoom` if the PDF looks scaled.
- Outgoing Mail Server + Alias Domain not configured yet (needed for ID card + event emails).
- Existing free-text `ksa_region` values (if any data existed before the province dropdown) must be mapped to the new selection keys.
- Upload real gallery/hero photos in Odoo; DISHA to review Privacy Policy and Terms drafts; set real social links; DNS/domain unknown.
- Unreadable "cultural circular" PDF: its text content was never used.
- Ideas not requested: province filter chips on the public Events block; auto-send on publish; opt-out link in event emails.

## 10. Repository map
```
disha-seva/
  README.md  DISHA-PROJECT-SCOPE.md  CLAUDE.md
  docs/API.md  docs/DEPLOYMENT.md
  odoo/disha_membership  disha_membership_card  disha_site_content  disha_event_notify  disha_support_ticket
  web/   (Next.js: src/app pages + api routes, src/components, src/content/defaults.ts, src/lib, tests, scripts/export-content-seed.mjs, public/)
```

## 11. Site v2 design (Nov 2026)
Production Next.js re-skinned from `disha-site_2` static mockup: green theme (primary #1d6b52, dark #0f3d2e, accent #f58b1f), Outfit + Poppins (@fontsource), topbar, orange marquee, glass hero stats strip, count-up reach section, green membership CTA, dark page banners. Token names (navy/saffron/seva) kept, values remapped in `globals.css`. Accent #f58b1f is decorative/on-dark only; buttons with white text use saffron-600/700 for contrast. Not ported: gallery year tabs (no year field in Odoo gallery collection).
Gallery is year-wise with year + category filters (`year-gallery.tsx`); Odoo `disha.site.item` has `year` (int) and `category` (char) for gallery items, exposed by `/api/disha/site-content` (run `-u disha_site_content`). Hero shows rotating Vision/Mission panel (`vision-mission.tsx`, texts `about.vision.*` / `about.mission.*`, editable in Odoo). 78 web tests.

## 12. Next.js Admin (/admin)
- Login = Odoo username/password, user must be in group *Website Admin (Next.js /admin)* (`disha_admin_api.group_disha_web_admin`, implies site-content Manager + membership Manager). Odoo returns an HMAC-signed 8 h token (key `database.secret`); Next stores it in an httpOnly SameSite=Strict cookie `disha_admin`. Every call re-checks the user and group; Next also sends the server Bearer token. Login rate-limited 8 / 10 min / IP.
- Tabs: Page texts & images, Lists & cards, Gallery (bulk upload with year + category), Events, Menu/logo/footer (+ `navshow.*` show/hide toggles), Colours (`theme.*` -> CSS variables via `src/lib/theme.ts`, only #rrggbb accepted), Membership applications (Approve = member + ID card + email through disha_membership_card).
- All data stays in Odoo (`disha.site.*`, `disha.membership.application`), so Odoo UI and /admin edit the same records. After an admin save the public site is revalidated at once.
- Public pages live in `src/app/(site)/` (header/footer layout); `/admin` has no public chrome.
- After upgrading: `npm run content:export` (done), then `odoo -u disha_site_content,disha_admin_api`; add users to the new group. Odoo `request.session.authenticate(env, credential)` login path not yet exercised on a real Odoo 19 (no Odoo in the build sandbox): test login first.

## 13. Event registrations
- Each event has *Online registration* + *Seats* (0 = unlimited) in /admin → Events. Public "Register" button opens a form: name, phone, email, province, place (honeypot, same-origin check, rate limit). States: open / full / closed (past, unpublished or registration off).
- Odoo model `disha.site.event.registration` (unique event+phone and event+email; event row locked `FOR UPDATE` while counting seats). Public endpoint `/api/disha/event-registration`; admin resource `registrations`.
- /admin → *Event registrations*: totals, one card per event (count, seat bar, province split) → click for the list with search, province filter, attended tick, remove, CSV download (formula-injection safe).
- Deploy: `odoo-bin -d demo -u disha_site_content,disha_admin_api --stop-after-init`, restart Odoo, then `npm ci && npm run build && pm2 restart disha-web`.
- Links: public registration page `/events/<id>` (details + Register + copy-share link; event titles on cards link to it). Admin dashboard per event `/admin/events/<id>` (login required, bookmarkable); also linked from Events and Event registrations tabs. Registrant data is never public.
- Admin sessions: token = signed claims (user, issued-at, expiry 8 h, password fingerprint). It stops working when the user signs out (`/api/disha/admin/logout` stores a revoke time), changes password, is deactivated or loses the group. `make_token/read_token` need an `env` (no `request` dependency).
- Admin **Page editor** (default tab): pick a page, pick a section (grouped from the text keys: hero, intro, impact…), edit its fields, and see the real page in a live preview (desktop/tablet/mobile). Clicking any text or picture in the preview selects its field; choosing a section scrolls the preview to it. Preview is a same-origin iframe, so `X-Frame-Options` is `SAMEORIGIN` (not DENY). The flat search editor stays as "All texts (search)". Hero cards/tick-list/slideshow photos remain in Lists & cards / Gallery.
