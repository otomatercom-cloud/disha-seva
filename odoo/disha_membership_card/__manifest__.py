{
    "name": "DISHA Member ID Card",
    "version": "19.0.1.0.0",
    "summary": "Approved DISHA applicants become members and receive a digital ID card (PDF + QR verify)",
    "author": "Otomater",
    "website": "https://otomater.com",
    "license": "OPL-1",
    "category": "Customizations",
    "depends": ["disha_membership", "association_membership"],
    "data": ["security/security.xml", "data/membership_type_data.xml", "report/card_templates.xml", "views/registration_views.xml", "views/menu.xml"],
    "external_dependencies": {"python": ["qrcode"]},
    "post_init_hook": "post_init_hook",
    "installable": True,
}
