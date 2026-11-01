from datetime import timedelta

from odoo import fields
from odoo.exceptions import AccessError, UserError
from odoo.tests import TransactionCase, tagged

from odoo.addons.disha_membership.models.registration import KSA_REGIONS
from odoo.addons.disha_site_content.models.event import EVENT_REGIONS


@tagged("post_install", "-at_install")
class TestEventNotify(TransactionCase):

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        App = cls.env["disha.membership.application"]
        base = {"category": "general", "gender": "male", "date_of_birth": "1990-01-01", "nationality": "Indian",
                "mobile": "+966500000000", "ksa_city": "X", "passport_number": "P1", "india_state": "K",
                "india_district": "D", "india_village": "V", "india_pin": "680121", "india_address": "A",
                "ksa_emergency_name": "A", "ksa_emergency_relationship": "B", "ksa_emergency_phone": "+966500000001",
                "india_emergency_name": "A", "india_emergency_relationship": "B", "india_emergency_phone": "+919847000001"}
        rows = [("Ann", "ann@x.org", "central", "approved"), ("Bob", "bob@x.org", "central", "new"),
                ("Cid", "cid@x.org", "eastern", "approved"), ("Dee", "ANN@x.org", "central", "approved"),
                ("Eve", "eve@x.org", "western", "approved")]
        for name, mail, region, state in rows:
            App.create(dict(base, full_name=name, email=mail, ksa_region=region, state=state))
        cls.future = fields.Date.context_today(cls.env["disha.site.event"]) + timedelta(days=10)

    def _event(self, **kw):
        return self.env["disha.site.event"].create(dict({"name": "Yoga Meet", "event_date": self.future}, **kw))

    def _sent(self):
        return self.env["mail.mail"].sudo().search([("subject", "ilike", "DISHA event: Yoga Meet")])

    def test_region_lists_match(self):
        self.assertEqual([r[0] for r in EVENT_REGIONS if r[0] != "all"], [r[0] for r in KSA_REGIONS])

    def test_recipients_by_province(self):
        central = self._event(region="central")
        self.assertEqual(sorted(m for m, _n in central._recipient_emails()), ["ann@x.org"])  # approved, unique
        self.assertEqual(central.recipient_count, 1)
        self.assertEqual(sorted(m for m, _n in self._event(region="eastern")._recipient_emails()), ["cid@x.org"])
        self.assertEqual(len(self._event(region="all")._recipient_emails()), 3)
        self.assertEqual(self._event(region="northern")._recipient_emails(), [])

    def test_send_once_then_resend(self):
        ev = self._event(region="central", details="Bring a mat", location="Riyadh")
        ev.action_notify_members()
        self.assertTrue(ev.notified_on)
        with self.assertRaises(UserError):
            ev.action_notify_members()
        before = self.env["mail.mail"].sudo().search_count([])
        ev.action_notify_members_again()
        self.assertTrue(ev.notified_by_id)

    def test_body_and_guards(self):
        ev = self._event(region="eastern", details="Bring a mat <b>x</b>", location="Dammam", time_text="6 PM")
        body = str(ev._notify_body("Cid"))
        self.assertIn("Eastern Province", body)
        self.assertIn("Dammam", body)
        self.assertNotIn("<b>x</b>", body)  # details are escaped
        with self.assertRaises(UserError):
            self._event(region="central", published=False).action_notify_members()
        with self.assertRaises(UserError):
            self._event(region="central", event_date=self.future - timedelta(days=400)).action_notify_members()
        with self.assertRaises(UserError):
            self._event(region="northern").action_notify_members()

    def test_only_managers_can_send(self):
        user = self.env["res.users"].create({
            "name": "Editor", "login": "ed@x.org",
            "group_ids": [(6, 0, [self.env.ref("disha_site_content.group_disha_site_editor").id])]})
        with self.assertRaises(AccessError):
            self._event(region="central").with_user(user).action_notify_members()
