# DISHA Gap Analysis (Production audit)

Date: 2026-11-08 · Baseline: `DISHA-PROJECT-SCOPE.md` (§1–13) + `CLAUDE.md` · Zip `disha-seva21`
Method: static read of source only. No source edited, no DB/API calls, no installs, no service restarts. Odoo code could not be executed (no Odoo in sandbox); `node_modules` absent, so vitest/tsc were **not re-run** in this audit.

Paths below are relative to `/home/claude/work/disha-seva`. Line numbers are from the files as read.

## 0. Summary

| Severity | Count | Theme |
|---|---|---|
| Critical | 0 confirmed (1 conditional, see H-1) | |
| High | 5 | proxy IP / rate-limit bucket, approval workflow bypass, no card revocation, admin token not revocable, PII exposure via shared DB (unverified) |
| Medium | 17 | validations, PII access, performance, tests, docs, headers |
| Low | 12 | polish, SEO, small edge cases |

No Critical finding is confirmed from code alone. **H-1 becomes Critical (site-wide form lockout) if the nginx in front of Next.js is not restoring the real visitor IP.** Check that first (command in H-1).

---

## 1. HIGH

### H-1 (fix prepared: `deploy/cloudflare-realip.sh` + `docs/DEPLOYMENT.md` §3; server step pending) Rate limits key on `X-Real-IP`; behind Cloudflare that is one shared IP (config-dependent)
- `docs/DEPLOYMENT.md:31` tells nginx to send `X-Real-IP $remote_addr`. With Cloudflare in front (production: disha.otomater.com), `$remote_addr` is a Cloudflare edge IP unless nginx uses `real_ip_header CF-Connecting-IP` + `set_real_ip_from <CF ranges>`. The docs do not mention it (grep: no `real_ip`/`CF-Connecting-IP`).
- `web/src/lib/guard.ts:7-9` (`clientIp`) trusts `x-real-ip`; `web/src/lib/rate-limit.ts` is one in-memory Map.
- Effect if not restored: all visitors share one bucket. Membership form limit is 5/10 min (`web/src/app/api/membership-application/route.ts:50`, `.env.example` `RATE_LIMIT_MAX=5`); event registration 10/10 min (`web/src/app/api/event-registration/route.ts:13-14`); admin login 8/10 min (`web/src/app/api/admin/login/route.ts:8`). So the whole site could take only 5 applications per 10 minutes, and 8 wrong passwords from anyone lock every admin out.
- Verify on server (read-only): `grep -rn "real_ip\|CF-Connecting" /etc/nginx/` and compare `X-Real-IP` seen by Next for two different clients.
- Also: the Map is per-process; `pm2 -i max` (cluster) would multiply limits. Fine for one instance (documented in the file header).

### H-2 Admin API can approve an application from any state; the Odoo-side review step is bypassed
- Odoo form only shows Approve for `under_review/contacted` (`odoo/disha_membership/views/registration_views.xml:35-36`).
- Model method has no state guard: `odoo/disha_membership/models/registration.py:147-149`.
- Admin API only blocks "already approved": `odoo/disha_admin_api/controllers/main.py:333-334`. Next UI shows Approve for every state except approved (`web/src/components/admin/applications-editor.tsx:46`), so a `new` or `rejected` application can be approved (member + ID card + email) in one click.
- Fix direction: guard in `action_approve` (allowed from `under_review`/`contacted`, optionally `rejected` with explicit reset), and mirror in the UI.

### H-3 Reject / Reset after approval does not revoke the member or ID card
- `action_reject` / `action_reset` only write `state` (`registration.py:151-155`); the card module overrides only `action_approve` (`odoo/disha_membership_card/models/registration.py:123-128`). `grep` for `action_reject` in the card module finds no override.
- The only test is `test_reject_has_no_card` (`odoo/disha_membership_card/tests/test_card.py:94-99`) which rejects a never-approved record. Rejecting an approved one leaves `member_id` active and the card (QR, token) valid. Reset button is visible on approved records (`views/registration_views.xml:41-42`, `invisible="state == 'new'"`).
- Business rule missing: what happens to member status/card on reject, reset, resignation, expiry (scope §3 says "2 years" but no renewal/expiry job exists in the DISHA modules; `grep expire|renew` finds nothing in `disha_membership_card`). Expiry may live in `association_membership` (not in repo): **unverified**.

### H-4 Admin session cannot be revoked
- Token is stateless HMAC, 8 h (`odoo/disha_admin_api/controllers/main.py:44-58`). Logout only deletes the browser cookie (`web/src/app/api/admin/logout`); a copied token stays valid until expiry. Deactivating the user or removing the group is honoured (`_admin_env`, lines 82-90), but changing the password does not invalidate it, and `database.secret` rotation is the only global kill.
- Mitigation: include a per-user nonce (e.g. password hash / `write_date` of login) in the signed payload; shorten TTL.

### H-5 Passport/Iqama copied to the shared-DB `association.*` models (visibility unverified)
- `odoo/disha_membership_card/models/registration.py:78-79` writes `iqama_number` and `passport_number` into `association.membership.application`. Scope §3 says these are manager-only on the DISHA model. IOF and DISHA share one Odoo DB, and the stock `association_membership` module (not in this repo) decides who can read those fields on `association.member`/`application`. If IOF staff have read access there, DISHA ID numbers are exposed beyond the DISHA manager group. **Unverified; needs a look at the stock module's field `groups` / ACLs.**

---

## 2. MEDIUM

### Requirements vs implementation
- **M-1 Duplicate rule differs from docs.** Scope §13 says unique "event+phone and event+email". Only email is enforced: `odoo/disha_site_content/models/registration.py:19` and controller `odoo/disha_site_content/controllers/main.py:133`. Same phone with another email registers twice.
- **M-2 Event emails carry no registration link.** `odoo/disha_event_notify/models/event.py:62` links only to the site root (`site_url`), not `/events/<id>`; the new registration page is therefore not promoted by the "Email Members" flow.
- **M-3 No confirmation to the registrant.** After a registration only the on-screen reference is shown (`web/src/components/sections/event-register.tsx`); no email/WhatsApp confirmation and no way to cancel. The email is not verified, so a typo or another person's address cannot be detected.
- **M-4 Review details not visible before approval in /admin.** The applications table shows name, province, contact only (`applications-editor.tsx:36-44`); DOB, photo, emergency contacts, India address, "why join" are only in Odoo. Approving from /admin is blind. API also exposes `contact` and `reset` ops (`controllers/main.py:329-330`) with no UI.

### Data model / validation
- **M-5 Required fields enforced only in the website API, not on the model.** `odoo/disha_membership/models/registration.py:63-73` makes only `full_name`, `mobile`, `email`, `category` required; gender, DOB, passport, PIN, emergency contacts, consent, province are checked only in `_clean_payload` (174-258). A manual Odoo entry can skip them and still reach `_issue_card`. No `@api.constrains` for email/phone/PIN on manual input.
- **M-6 Event deletion silently deletes all registrations.** `registration.py:21` `ondelete="cascade"`; `controllers/main.py:269-270` (`unlink`) has no guard and the Next confirm (`events-editor.tsx:49`) doesn't mention the registrations count. PII is destroyed with no audit trail.
- **M-7 Capacity can be set below current registrations** (`event.py:56-60` only checks negative). Result is "full", not an error; acceptable but unflagged in UI.
- **M-8 Event `limit=200` on public API** (`controllers/main.py:57`): beyond 200 published events the oldest drop out and their `/events/<id>` page returns 404.
- **M-9 Admin list endpoints are capped silently**: applications `limit=200` (`admin_api/controllers/main.py:318`), registrations `limit=5000` (line 291), items 1000 (line 204). CSV export (`registrations-editor.tsx`) exports only the loaded rows. No pagination or "showing N of M".

### Security / permissions
- **M-10 Registrant PII visible to content editors.** ACL gives `group_disha_site_editor` read/write/unlink on registrations (`odoo/disha_site_content/security/ir.model.access.csv`, `access_disha_site_event_reg_editor`). Editors (text/photo staff) can read names, phones, emails and edit/delete them. Probably intended for managers only.
- **M-11 No audit trail** on registrations, events or admin deletions: models don't inherit `mail.thread`; delete/attended actions (`controllers/main.py:305-308`) leave nothing. Applications do have tracking.
- **M-12 Missing HTTP security headers.** `web/next.config.ts:3-8` sets nosniff, frame deny, referrer, permissions only. No `Strict-Transport-Security`, no `Content-Security-Policy` (also none in docs). May be set in nginx: **unverified**.
- **M-13 Admin API trusts client int parsing.** `int(kw["event_id"])` (`controllers/main.py:282`) and `int(d.get("id") or 0)` raise `ValueError` for bad input; that is caught by the generic handler (151-153) and returned as HTTP 500 "server" instead of 422.

### Performance / architecture
- **M-14 N+1 queries in public API.** `site-content` builds each event's state via `_registration_state()` → `registration_count` → a separate `_read_group` per event (`odoo/disha_site_content/models/event.py:39-54`, called at `controllers/main.py:51`). Up to 200 events = ~200 queries per cache miss. Same for `duplicate_count` (`registration.py:114-122`: one `search_count` per application, 200 per admin list call, `controllers/main.py:322`) and `recipient_count` (`disha_event_notify/models/event.py:40-43`, one full application search per event record, shown in form only: OK there).
- **M-15 Event email sends synchronously in one request** (`disha_event_notify/models/event.py:89-95`): all recipients created and `.send()` inline. Large member lists can time out the HTTP request (Cloudflare 100 s) and half-send. Use the mail queue (no `.send()`), or batches.
- **M-16 Region list copied in 5 places.** `odoo/disha_membership/models/registration.py:17`, `odoo/disha_site_content/models/event.py:9`, `web/src/lib/validation/membership.ts:7`, `web/src/components/sections/event-register.tsx:9`, plus derived `REG_REGIONS` (`models/registration.py:9`). `CLAUDE.md` lists three of them; the new `event-register.tsx` copy is not covered by the sync test (`test_region_lists_match` covers Odoo only).

### Tests
- **M-17 Coverage gaps** (details in §5). Notably: Odoo suites for the new modules/endpoints were never executed (scope §12 admits login path unexercised; registration code written after the last recorded Odoo run of 43/89 tests), no tests for approval-state rules, cascade delete, phone duplicates, concurrent seat race, or the Next admin editor components and `/events/[id]` page.

---

## 3. LOW

- L-1 No `not-found.tsx` or `error.tsx`: `find web/src -name "not-found*" -o -name "error*"` is empty; unknown URLs show the plain Next 404 (seen in the screenshot of `/events/…`). No `loading.tsx`.
- L-2 No `robots.ts` / `sitemap.ts` (`ls web/src/app`). `/admin` has `robots: noindex` metadata (`web/src/app/admin/layout.tsx`) but no robots.txt disallow.
- L-3 Public pages are ISR (`revalidate=30`); a registration does not revalidate, so "Full" can show up to 30 s late (server still enforces: `controllers/main.py:130-132`). Only admin edits call `revalidatePath` (`web/src/app/api/admin/[res]/route.ts:27`, intentionally skips registrations).
- L-4 Bot honeypot answers fake success `REG-00000` (`event-registration/route.ts:23`). Fine, but the `reference` shown to a real person is `REG-<id>`: predictable, enumerable ids (no data behind them).
- L-5 Event-registration limiter doubles `RATE_LIMIT_MAX` (`route.ts:13-14`); event days with many people on one mobile NAT can trip it (10 per 10 min per IP).
- L-6 Event emails: no unsubscribe link, only "write to <contact>" (`disha_event_notify/models/event.py:67-68`); recipients are all approved applicants, no opt-out flag.
- L-7 Card email resent on every `action_approve` call (`disha_membership_card/models/registration.py:123-128`, `_send_card_email` is not idempotent).
- L-8 Photo handling mismatch: web accepts JPEG only (`web/src/lib/validation/membership.ts:81`), Odoo accepts JPEG/PNG/WebP (card module line 17); without `disha_membership_card` installed the photo is silently dropped (base `_clean_payload` has no `photo`).
- L-9 If an Odoo user has 2FA (auth_totp), `session.authenticate` may not set `uid`; code then returns 403 "forbidden" (`admin_api/controllers/main.py:114-123`), misleading. **Unverified on real Odoo 19.**
- L-10 `.env.example` lacks `ODOO_ADMIN_TIMEOUT_MS`, `LOOKUP_RATE_LIMIT_MAX`, `TICKET_RATE_LIMIT_MAX`, `REPLY_RATE_LIMIT_MAX` (used in code).
- L-11 `docs/API.md` documents only site-content (line 39); missing `/api/disha/event-registration`, the `/api/disha/admin/*` API and the web `/api/event-registration`, `/api/admin/*` routes.
- L-12 `DISHA-PROJECT-SCOPE.md` is stale in places: §7 says 75 tests (now 91 vitest), §11 says gallery year tabs "not ported" then describes them; §2.1 lists no `/events/<id>` page.

---

## 4. Module-by-module status

| Module / area | Status | Notes |
|---|---|---|
| `disha_membership` (application, API) | Implemented; gaps M-5, H-2 | API allowlist, idempotency, honeypot, PII field groups verified in code. Duplicates only flagged (by design). |
| `disha_membership_card` | Implemented; gaps H-3, H-5, L-7 | Own sequence/report/paperformat respected (no stock edits found). |
| `disha_site_content` | Implemented; M-1, M-6, M-8, M-14 | Media endpoint validates PDF magic bytes; image types by sniffing; `nosniff` + CSP sandbox present (`controllers/main.py:78-80`). |
| Event registration | Implemented; M-1, M-2, M-3, M-6, M-10 | Seat lock `FOR UPDATE` present (line 126). Unique per email only. |
| `disha_event_notify` | Implemented; M-2, M-15, L-6 | Manager guard, resend guard, escaping via `Markup` verified (lines 56-69). |
| `disha_admin_api` | Implemented; H-2, H-4, M-9, M-11, M-13 | Server token + signed user token, group re-check per call (lines 82-90). |
| `disha_support_ticket` | Partially read | Controller/token hashing/SLA constants verified (`controllers/main.py`, `models/ticket.py:34-88`). Views, mail templates, cron not read. |
| Next.js public site | Implemented | Pages exist under `src/app/(site)`; 404/error pages missing (L-1). |
| Next.js `/admin` | Implemented | httpOnly SameSite=Strict cookie, same-origin check, resource allowlist verified (`api/admin/[res]/route.ts:7-13`). UI gaps M-4, M-9. |
| Docs/deploy | Partial | H-1, M-12, L-10..L-12. |

## 5. Test coverage (counted from files)

- Odoo: membership 19, card 12, site_content 9, event_notify 5, admin_api 5, support 12 test methods. Registration is covered by one test (`odoo/disha_site_content/tests/test_content.py:129`); admin registrations by one (`odoo/disha_admin_api/tests/test_admin_api.py:58`).
- Vitest: 91 passing at last run (admin 6, route 12, validation 9, content 5, event-registration 7, events 5, gallery 3, hero 4, membership-form 7, support 13, year-gallery 3 + setup).
- **Missing tests:** approve from `new`/`rejected` (H-2); reject/reset after approval (H-3); admin token revocation (H-4); phone-duplicate rule (M-1); concurrent last-seat registration; event delete cascade (M-6); applications/events/items CRUD through the admin API; admin editor components (`events-editor`, `registrations-editor`, `applications-editor`, `items-editor`, `texts-editor`, `admin-app`) and the pages `/events/[id]`, `/admin/events/[id]`; CSV escaping (`csvCell`); `clientIp` behind proxy headers; region-list sync for the web copies (M-16).

## 6. UI functionality / broken interactions (from code, not a browser)

- Reported live: `/events/<id>` showed the generic 404 on the server. Code path (`web/src/app/(site)/events/[id]/page.tsx`) renders for any published event id returned by the API; live API listed `1 closed Blood collection` (owner's curl), so the 404 points to a build without the new route or to a different id. **Not yet reproduced; deployed build unverified.**
- Event card title links to `/events/<id>` only when `id > 0` (`sections/events.tsx`); with an un-upgraded Odoo the link is absent (by design).
- Registrations table has no empty-state for the "all events" overview when `events` is empty beyond a text line; no pagination/virtualisation (M-9).
- `confirm()` dialogs are used for destructive actions (works; not accessible-styled).
- Admin "Approve" shown for rejected/new (H-2); no "Contacted/Reset" buttons although API supports them (M-4).

## 7. Unverified (not analysed or cannot be verified here)

1. Live server config: nginx/Cloudflare real-IP, headers, `client_max_body_size`, pm2 mode, deployed build version.
2. Execution of any Odoo test or upgrade (`-u disha_site_content,disha_admin_api`); real login via `request.session.authenticate` (L-9); mail server/alias domain (scope §9).
3. Stock `association_membership` internals: field groups for passport/iqama (H-5), card verification/QR endpoint, expiry/renewal (H-3).
4. `disha_support_ticket` views, mail templates, cron/escalation; `disha_membership_card/report/card_templates.xml` rendering and `disha_membership_card.zoom` tuning.
5. Remaining web components not read line-by-line: `membership-form.tsx`, `support-form.tsx`, `track-form.tsx`, `home.tsx`, `photo-gallery.tsx`, `year-gallery.tsx`, `texts-editor.tsx`, `items-editor.tsx` (apart from grep), `content/defaults.ts` copy accuracy.
6. Accessibility, mobile layout, Lighthouse, browser compatibility, wkhtmltopdf output on a real device.
7. Data protection obligations (retention, consent text, Saudi PDPL / Indian DPDP): no retention/deletion policy found in code or docs.
8. `seed.xml` integrity vs `defaults.ts` (generated, 2020 lines), data migration of old free-text `ksa_region` (scope §9).

## 8. Suggested fix order (awaiting your approval; nothing changed)

1. H-1: confirm nginx real-IP (read-only check), then document + fix config.
2. H-2 + H-3 (+ tests): state guards on approve/reset/reject, revoke/suspend member on reject/reset.
3. H-4: revocable admin token. H-5: check stock field groups.
4. M-1, M-5, M-6, M-10, M-11: data rules, ACL for registrations, audit trail.
5. M-2, M-3, M-15: event email link, registrant confirmation, queued sending.
6. M-9, M-14: pagination and query batching.
7. M-12, L-1, L-2, L-10..L-12: headers, error pages, robots/sitemap, docs.
8. Tests listed in §5; then run the real Odoo suite on a scratch DB.
