{
    "name": "DISHA Member ID Card",
    "version": "19.0.2.0.0",
    "summary": "DISHA members, subscriptions (renew / suspend / cancel) and the digital ID card (PDF + QR verify). Standalone: no other organisation's modules needed.",
    "author": "Otomater",
    "website": "https://otomater.com",
    "license": "OPL-1",
    "category": "Customizations",
    "depends": ["disha_membership", "mail"],
    "data": ["security/security.xml", "security/ir.model.access.csv", "data/sequence_data.xml",
             "report/card_templates.xml", "views/member_views.xml", "views/registration_views.xml", "views/menu.xml"],
    "installable": True,
}
