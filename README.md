# DISHA: Next.js website + Odoo 19 membership

DISHA (Dedicated team for Indo Saudi Holistic Alignment). Same architecture as the IOF site, rebuilt for DISHA's content,
logo, colours and the 22-field paper **Membership Application Form** (General / Associate, Indian nationals in KSA).

- `web`: Next.js 15 site (TypeScript, Tailwind v4). Pages: Home, About (formation, vision/mission, structure, office bearers),
  Indians in KSA, Our Activities, Gallery, Partners, Reports, Contact, **Membership application**, **Support + token tracking**, Privacy, Terms.
- `odoo/disha_membership`: applications model, workflow (New → Under Review → Contacted → Approved/Rejected), "For office use" fields, secure API.
- `odoo/disha_membership_card`: on Approve creates the member (type General or Associate), number `DISHA/<year>/#####`, and emails a two-sided PDF ID card with QR verify. Menu *Approved Members*. Uses its OWN report/paperformat/number series and never edits the stock card, so it can share one database with the IOF card addon (`iof_volunteer_card`) or any other organisation using `association_membership`.
- `odoo/disha_site_content`: everything on the website is editable in Odoo (menu *DISHA Website*): texts, gallery, reports, lists/cards, logo.
- `odoo/disha_support_ticket`: support tickets (visa, iqama, passport, labour, medical, legal, emergency) with priority/SLA and a private tracking token.
- `docs`: API contract, deployment.

Depends on the `association_membership` addon (install untouched). Tests: `cd web && npm test`; Odoo: `odoo-bin -d <new db> -i association_membership,disha_membership,disha_membership_card,disha_site_content,disha_support_ticket --test-enable --stop-after-init`.

## Membership form (matches the paper form)
1 Personal information (category, name as in passport, gender, DOB, nationality, mobile, WhatsApp, email, blood group,
qualification, profession, employer, KSA province/city, Iqama, passport) · 2 Permanent address in India (state, district,
village/town, PIN, full address) · 3 Emergency contacts (KSA and India) · 4 Declaration + "why join". Optional passport photo.
Iqama and passport numbers are readable only by *DISHA Membership Applications / Manager*; they never appear on the card.

## Setup notes
- Content: key facts (formation 23 June 2021, vision/mission, committees and unit councils, office bearers, programmes and figures) come from DISHA's profile PDF. Office-bearer phone numbers are intentionally NOT published on the site. Edit anything in Odoo.
- The site has no domain baked in: set `SITE_URL`, `ODOO_BASE_URL`, `ODOO_API_TOKEN` (see `web/.env.example`).
- Card contact line: system parameter `disha_membership_card.contact` (default: dishaindians@gmail.com); `disha_membership_card.zoom` tunes the PDF scale (default 1.27).
- Outgoing mail needs an Odoo Outgoing Mail Server and an Alias Domain (Default From) for the card email.
- Support tickets: reuse the same Bearer token; `disha_support_ticket.site_url` makes emailed links absolute.
- After adding editable texts in `web/src/content/defaults.ts`: `npm run content:export` then `-u disha_site_content`.
