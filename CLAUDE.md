# DISHA project: instructions for Claude

Read `DISHA-PROJECT-SCOPE.md` first (full scope, rules, open items).

- Owner writes Malayalam: reply in Manglish with technical words in English, concise, respectful ("ningal"), never "nee/ninte". Professional Odoo 19 / Next.js; do not waste usage.
- Odoo 19 errors that occur must be recorded as rules (section 8 of the scope file).
- IOF and DISHA share one Odoo DB: never edit stock `association_membership` views or sequences; DISHA keeps its own report, paperformat and number series.
- Keep province lists in sync: `KSA_REGIONS` (odoo/disha_membership), `EVENT_REGIONS` (odoo/disha_site_content), `REGIONS` (web/src/lib/validation/membership.ts).
- Verify before saying done: `cd web && npx vitest run && npx tsc --noEmit`; Odoo tests per section 7 of the scope file.
