import base64
import io

from PIL import Image

from datetime import date

from dateutil.relativedelta import relativedelta

from odoo.exceptions import UserError
from odoo.tests import TransactionCase, tagged

VALID = {
    "category": "general", "full_name": "Asha Nair", "gender": "female",
    "date_of_birth": "1992-04-12", "nationality": "Indian",
    "mobile": "+966 50 123 4567", "whatsapp": "+966501234567",
    "email": "asha.card@example.com", "blood_group": "O+",
    "qualification": "B.Sc Nursing", "occupation": "Nurse", "organization": "Riyadh Care Hospital",
    "ksa_region": "central", "ksa_city": "Riyadh", "iqama_number": "2412345678", "passport_number": "P1234567",
    "india_state": "Kerala", "india_district": "Thrissur", "india_village": "Irinjalakuda", "india_pin": "680121",
    "india_address": "Nair House, Irinjalakuda P.O.",
    "ksa_emergency_name": "Ravi Nair", "ksa_emergency_relationship": "Brother", "ksa_emergency_phone": "+966500000001",
    "india_emergency_name": "Lakshmi Nair", "india_emergency_relationship": "Mother", "india_emergency_phone": "+919847000001",
    "why_join": "To serve the community.", "consent": True,
}


def _report_name(act):
    return act.get("report_name") or act.get("context", {}).get("report_action", {}).get("report_name")


def _jpeg(size=(60, 80)):
    buf = io.BytesIO()
    Image.new("RGB", size, (30, 90, 160)).save(buf, "JPEG")
    return base64.b64encode(buf.getvalue()).decode()


@tagged("post_install", "-at_install")
class TestMemberCard(TransactionCase):

    def _make(self, **extra):
        res = self.env["disha.membership.application"].create_from_website({**VALID, **extra})
        self.assertTrue(res["ok"], res)
        return self.env["disha.membership.application"].search([("name", "=", res["reference"])])

    def _approved(self, **extra):
        rec = self._make(**extra)
        rec.action_review()
        rec.action_approve()
        return rec

    def test_approve_creates_member_with_first_term(self):
        rec = self._approved(photo=_jpeg())
        m = rec.disha_member_id
        self.assertTrue(m and m.card_token and m.status == "active")
        self.assertTrue(m.member_number.startswith("DISHA/"), m.member_number)
        self.assertEqual(m.email, "asha.card@example.com")
        self.assertTrue(m.photo)
        self.assertEqual(len(m.term_ids), 1)
        self.assertEqual(m.expiry_date, m.start_date + relativedelta(years=2) - relativedelta(days=1))
        self.assertEqual(rec.card_status, "active")
        self.assertEqual(rec.member_number, m.member_number)

    def test_idempotent(self):
        rec = self._approved()
        first = rec.disha_member_id
        rec.action_issue_card()
        self.assertEqual(rec.disha_member_id, first)
        self.assertEqual(self.env["disha.member"].search_count([("application_id", "=", rec.id)]), 1)

    def test_renew_extends_from_current_expiry(self):
        m = self._approved().disha_member_id
        before = m.expiry_date
        m.action_renew(1)
        self.assertEqual(m.expiry_date, before + relativedelta(years=1))
        self.assertEqual(len(m.term_ids), 2)
        self.assertEqual(m.term_ids.sorted("id")[-1].kind, "renewal")
        with self.assertRaises(UserError):
            m.action_renew(0)

    def test_renew_after_lapse_starts_today(self):
        m = self._approved().disha_member_id
        m.term_ids.write({"start_date": date(2020, 1, 1), "end_date": date(2021, 12, 31)})
        self.assertEqual(m.card_status, "expired")
        m.action_renew(1)
        self.assertEqual(m.card_status, "active")
        self.assertEqual(m.term_ids.sorted("id")[-1].start_date, date.today())

    def test_suspend_reactivate_cancel(self):
        m = self._approved().disha_member_id
        m.action_suspend()
        self.assertEqual(m.card_status, "suspended")
        with self.assertRaises(UserError):
            m.action_suspend()
        m.action_reactivate()
        self.assertEqual(m.card_status, "active")
        m.action_cancel()
        self.assertEqual(m.card_status, "cancelled")
        with self.assertRaises(UserError):
            m.action_renew(1)
        with self.assertRaises(UserError):
            m.action_print_card()
        m.action_reactivate()
        self.assertEqual(m.status, "active")

    def test_approved_cannot_be_rejected_or_reset(self):
        rec = self._approved()
        with self.assertRaises(UserError):
            rec.action_reject()
        with self.assertRaises(UserError):
            rec.action_reset()
        self.assertTrue(rec.disha_member_id and rec.state == "approved")

    def test_reject_has_no_card(self):
        rec = self._make()
        rec.action_reject()
        self.assertFalse(rec.disha_member_id)
        with self.assertRaises(UserError):
            rec.action_issue_card()

    def test_bad_photo_rejected(self):
        res = self.env["disha.membership.application"].create_from_website(
            {**VALID, "photo": base64.b64encode(b"<script>alert(1)</script>").decode()})
        self.assertFalse(res["ok"])
        self.assertIn("photo", res["errors"])
        res = self.env["disha.membership.application"].create_from_website({**VALID, "photo": "!!notbase64"})
        self.assertIn("photo", res["errors"])

    def test_print_action_and_pdf_html(self):
        m = self._approved(photo=_jpeg()).disha_member_id
        self.assertEqual(_report_name(m.action_print_card()), "disha_membership_card.report_disha_card")
        self.assertTrue(m._disha_card_qr_uri().startswith("data:image/png;base64,"))
        report = self.env.ref("disha_membership_card.action_report_disha_card")
        html = report._render_qweb_html(report.report_name, m.ids)[0].decode()
        self.assertIn(m.member_number, html)
        self.assertIn("Dedicated team for Indo Saudi Holistic Alignment", html)

    def test_verify_url_contains_token_only(self):
        m = self._approved().disha_member_id
        self.assertIn("/disha/verify/" + m.card_token, m.card_verify_url)
        self.assertNotIn(VALID["mobile"], m.card_verify_url)

    def test_managers_manage_users_read_only(self):
        mgr = self.env.ref("disha_membership.group_disha_membership_manager")
        usr = self.env.ref("disha_membership.group_disha_membership_user")
        u_mgr = self.env["res.users"].create({"name": "MM", "login": "mem_mgr_t", "group_ids": [(6, 0, [mgr.id])]})
        u_usr = self.env["res.users"].create({"name": "UU", "login": "mem_usr_t", "group_ids": [(6, 0, [usr.id])]})
        m = self._approved().disha_member_id
        m.with_user(u_mgr).write({"mobile": "+966500000777"})
        self.assertTrue(m.with_user(u_usr).read(["name"]))
        with self.assertRaises(Exception):
            m.with_user(u_usr).write({"mobile": "+966500000888"})

    def test_works_without_association_membership(self):
        manifest = self.env["ir.module.module"].search([("name", "=", "disha_membership_card")])
        self.assertNotIn("association_membership", manifest.dependencies_id.mapped("name"))
