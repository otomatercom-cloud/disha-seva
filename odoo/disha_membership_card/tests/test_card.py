import base64
import io

from PIL import Image

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

    def test_approve_issues_card(self):
        rec = self._make(photo=_jpeg())
        self.assertTrue(rec.photo)
        rec.action_approve()
        self.assertEqual(rec.state, "approved")
        m = rec.member_id
        self.assertTrue(m and m.card_token and m.status == "active")
        self.assertEqual(m.partner_id.email, "asha.card@example.com")
        self.assertTrue(m.photo)
        self.assertEqual(m.iqama_number, "2412345678")
        self.assertEqual(rec.application_id.membership_type_id.code, "DISHA-GEN")
        self.assertEqual(rec.card_status, "active")

    def test_disha_number_series_and_stock_untouched(self):
        rec = self._make()
        rec.action_approve()
        self.assertTrue(rec.member_id.member_number.startswith("DISHA/"), rec.member_id.member_number)
        stock = self.env.ref("association_membership.report_membership_card_document")
        self.assertIn("ms_card", stock.arch_db)  # DISHA never rewrites the shared stock template
        self.assertFalse(stock.inherit_children_ids.filtered(lambda v: v.key and v.key.startswith("disha_membership_card")
                                                             and "report_membership_card_document" in (v.inherit_id.key or "")))

    def test_other_orgs_member_keeps_stock_behaviour(self):
        mtype = self.env["association.membership.type"].create({
            "name": "Other Org", "code": "OTH", "duration": 1, "duration_unit": "years", "digital_card_enabled": True})
        app = self.env["association.membership.application"].create({
            "applicant_name": "Other Person", "mobile": "+966500000009", "email": "other@example.com",
            "membership_type_id": mtype.id})
        app.action_submit(); app.action_start_verification(); app.action_approve()
        member = app.member_id
        self.assertTrue(member.member_number.startswith("ASM/"), member.member_number)
        act = member.action_print_card()
        self.assertEqual(_report_name(act), "association_membership.report_membership_card")

    def test_disha_member_prints_disha_report(self):
        rec = self._make()
        rec.action_approve()
        self.assertEqual(_report_name(rec.member_id.action_print_card()), "disha_membership_card.report_disha_card")

    def test_associate_gets_associate_type(self):
        rec = self._make(category="associate")
        rec.action_approve()
        self.assertEqual(rec.application_id.membership_type_id.code, "DISHA-ASC")

    def test_idempotent(self):
        rec = self._make()
        rec.action_approve()
        first = rec.member_id
        rec.action_issue_card()
        self.assertEqual(rec.member_id, first)
        self.assertEqual(self.env["association.member"].search_count([("id", "=", first.id)]), 1)

    def test_reject_has_no_card(self):
        rec = self._make()
        rec.action_reject()
        self.assertFalse(rec.member_id)
        with self.assertRaises(UserError):
            rec.action_issue_card()

    def test_bad_photo_rejected(self):
        res = self.env["disha.membership.application"].create_from_website(
            {**VALID, "photo": base64.b64encode(b"<script>alert(1)</script>").decode()})
        self.assertFalse(res["ok"])
        self.assertIn("photo", res["errors"])
        res = self.env["disha.membership.application"].create_from_website({**VALID, "photo": "!!notbase64"})
        self.assertIn("photo", res["errors"])

    def test_pdf_renders(self):
        rec = self._make(photo=_jpeg())
        rec.action_approve()
        report = self.env.ref("disha_membership_card.action_report_disha_card")
        html = report._render_qweb_html(report.report_name, rec.member_id.ids)[0]
        self.assertIn(rec.member_id.member_number.encode(), html)

    def test_manager_can_read_card_attachment(self):
        mgr = self.env.ref("disha_membership.group_disha_membership_manager")
        self.assertIn(self.env.ref("association_membership.group_membership_staff"), mgr.implied_ids)
        user = self.env["res.users"].create({"name": "MM", "login": "mem_mgr_t", "group_ids": [(6, 0, [mgr.id])]})
        rec = self._make()
        rec.action_approve()
        att = self.env["ir.attachment"].create({
            "name": "c.pdf", "res_model": "association.member", "res_id": rec.member_id.id,
            "raw": b"%PDF-1.4", "mimetype": "application/pdf"})
        self.assertTrue(att.with_user(user).read(["name"]))

    def test_nationality_exact_match_and_card_assets(self):
        rec = self._make(photo=_jpeg())
        rec.action_approve()
        self.assertEqual(rec.member_id.nationality_id, self.env.ref("base.in"))
        self.assertTrue(rec.member_id._disha_card_qr_uri().startswith("data:image/png;base64,"))
        report = self.env.ref("disha_membership_card.action_report_disha_card")
        html = report._render_qweb_html(report.report_name, rec.member_id.ids)[0].decode()
        self.assertIn("Dedicated team for Indo Saudi Holistic Alignment", html)
        self.assertIn("data:image/png;base64", html)

    def test_approved_menu_action(self):
        act = self.env.ref("disha_membership_card.action_disha_approved_members")
        rec = self._make()
        self.assertNotIn(rec, self.env[act.res_model].search(eval(act.domain)))
        rec.action_approve()
        self.assertIn(rec, self.env[act.res_model].search(eval(act.domain)))
