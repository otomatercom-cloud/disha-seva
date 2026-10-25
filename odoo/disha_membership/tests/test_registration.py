import json

from odoo.exceptions import AccessError
from odoo.tests import HttpCase, TransactionCase, tagged

VALID = {
    "category": "general", "full_name": "Asha Nair", "gender": "female",
    "date_of_birth": "1992-04-12", "nationality": "Indian",
    "mobile": "+966 50 123 4567", "whatsapp": "+966501234567",
    "email": "Asha@Example.com", "blood_group": "O+",
    "qualification": "B.Sc Nursing", "occupation": "Nurse", "organization": "Riyadh Care Hospital",
    "ksa_region": "Central", "ksa_city": "Riyadh", "iqama_number": "2412345678", "passport_number": "P1234567",
    "india_state": "Kerala", "india_district": "Thrissur", "india_village": "Irinjalakuda", "india_pin": "680121",
    "india_address": "Nair House, Irinjalakuda P.O.",
    "ksa_emergency_name": "Ravi Nair", "ksa_emergency_relationship": "Brother", "ksa_emergency_phone": "+966500000001",
    "india_emergency_name": "Lakshmi Nair", "india_emergency_relationship": "Mother", "india_emergency_phone": "+919847000001",
    "why_join": "To serve the community.", "consent": True,
}
URL = "/api/disha/membership-application"


@tagged("post_install", "-at_install")
class TestRegistrationModel(TransactionCase):

    def setUp(self):
        super().setUp()
        self.Reg = self.env["disha.membership.application"]

    def test_create_ok_sequence_and_values(self):
        res = self.Reg.create_from_website(dict(VALID), "k" * 20)
        self.assertTrue(res["ok"])
        rec = self.Reg.search([("name", "=", res["reference"])])
        self.assertTrue(res["reference"].startswith("DISHA-MEM-"))
        self.assertEqual(rec.email, "asha@example.com")
        self.assertEqual(rec.state, "new")
        self.assertEqual(rec.source, "website")
        self.assertEqual(rec.category, "general")
        self.assertEqual(rec.ksa_city, "Riyadh")
        self.assertEqual(rec.india_pin, "680121")
        self.assertTrue(rec.consent_given and rec.consent_date)

    def test_sequence_increments(self):
        a = self.Reg.create_from_website(dict(VALID))["reference"]
        b = self.Reg.create_from_website(dict(VALID))["reference"]
        self.assertNotEqual(a, b)

    def test_required_and_invalid_rejected(self):
        before = self.Reg.search_count([])
        res = self.Reg.create_from_website({"first_name": "", "email": "bad", "mobile": "abc"})
        self.assertFalse(res["ok"])
        for f in ("full_name", "email", "mobile", "consent", "category", "passport_number", "india_pin", "ksa_emergency_phone"):
            self.assertIn(f, res["errors"])
        self.assertEqual(self.Reg.search_count([]), before)

    def test_pin_category_and_blood_group_validated(self):
        res = self.Reg.create_from_website(dict(VALID, india_pin="12345", category="vip", blood_group="Z+"))
        for f in ("india_pin", "category", "blood_group"):
            self.assertIn(f, res["errors"])

    def test_approve_sets_office_fields(self):
        rec = self.Reg.search([("name", "=", self.Reg.create_from_website(dict(VALID))["reference"])])
        rec.action_approve()
        self.assertTrue(rec.approved_on)
        self.assertEqual(rec.approved_by_id, self.env.user)

    def test_sensitive_ids_manager_only(self):
        staff = self.env["res.users"].create({
            "name": "Staff2", "login": "disha_staff2",
            "group_ids": [(4, self.env.ref("disha_membership.group_disha_membership_user").id)],
        })
        rec = self.Reg.search([("name", "=", self.Reg.create_from_website(dict(VALID))["reference"])])
        with self.assertRaises(AccessError):
            rec.with_user(staff).read(["passport_number"])
        self.assertEqual(rec.read(["passport_number"])[0]["passport_number"], "P1234567")

    def test_consent_must_be_true_boolean(self):
        res = self.Reg.create_from_website(dict(VALID, consent="yes"))
        self.assertIn("consent", res["errors"])

    def test_mass_assignment_ignored(self):
        res = self.Reg.create_from_website(dict(VALID, state="approved", internal_notes="x"))
        rec = self.Reg.search([("name", "=", res["reference"])])
        self.assertEqual(rec.state, "new")
        self.assertFalse(rec.internal_notes)

    def test_idempotency_replay_creates_one_record(self):
        key = "idem-key-0123456789"
        first = self.Reg.create_from_website(dict(VALID), key)
        second = self.Reg.create_from_website(dict(VALID), key)
        self.assertEqual(first["reference"], second["reference"])
        self.assertTrue(second["replayed"])
        self.assertEqual(self.Reg.search_count([("idempotency_key", "=", key)]), 1)

    def test_same_email_different_submission_allowed(self):
        self.assertTrue(self.Reg.create_from_website(dict(VALID))["ok"])
        self.assertTrue(self.Reg.create_from_website(dict(VALID))["ok"])
        rec = self.Reg.search([], limit=1)
        self.assertGreaterEqual(rec.duplicate_count, 1)

    def test_workflow(self):
        rec = self.Reg.search([("name", "=", self.Reg.create_from_website(dict(VALID))["reference"])])
        rec.action_review()
        self.assertEqual(rec.state, "under_review")
        rec.action_approve()
        self.assertEqual(rec.state, "approved")
        rec.action_reset()
        self.assertEqual(rec.state, "new")

    def test_display_name_and_search(self):
        res = self.Reg.create_from_website(dict(VALID))
        rec = self.Reg.search([("name", "=", res["reference"])])
        self.assertEqual(rec.display_name, f"{res['reference']} - Asha Nair")
        self.assertIn(rec, self.Reg.search([("full_name", "ilike", "asha")]))

    def test_access_rights(self):
        public_user = self.env.ref("base.public_user")
        with self.assertRaises(AccessError):
            self.Reg.with_user(public_user).search([])
        staff = self.env["res.users"].create({
            "name": "Staff", "login": "disha_staff",
            "group_ids": [(4, self.env.ref("disha_membership.group_disha_membership_user").id)],
        })
        self.Reg.create_from_website(dict(VALID))
        self.assertTrue(self.Reg.with_user(staff).search([]))
        rec = self.Reg.search([], limit=1)
        with self.assertRaises(AccessError):
            rec.with_user(staff).unlink()


@tagged("post_install", "-at_install")
class TestRegistrationApi(HttpCase):

    def setUp(self):
        super().setUp()
        self.token = self.env["ir.config_parameter"].sudo().get_param(
            "disha_membership.api_token")

    def _post(self, payload, token="use", key=None):
        headers = {"Content-Type": "application/json"}
        if token == "use":
            token = self.token
        if token:
            headers["Authorization"] = f"Bearer {token}"
        if key:
            headers["Idempotency-Key"] = key
        return self.url_open(URL, data=json.dumps(payload), headers=headers)

    def test_token_generated(self):
        self.assertTrue(self.token and len(self.token) > 40)

    def test_unauthorized(self):
        self.assertEqual(self._post(VALID, token="wrong").status_code, 401)
        self.assertEqual(self._post(VALID, token=None).status_code, 401)

    def test_create_and_replay(self):
        key = "http-idem-key-0123456"
        r1 = self._post(VALID, key=key)
        self.assertEqual(r1.status_code, 201)
        ref = r1.json()["reference"]
        r2 = self._post(VALID, key=key)
        self.assertEqual(r2.status_code, 200)
        self.assertEqual(r2.json()["reference"], ref)
        self.assertEqual(self.env["disha.membership.application"].sudo().search_count(
            [("idempotency_key", "=", key)]), 1)

    def test_validation_error_creates_nothing(self):
        before = self.env["disha.membership.application"].sudo().search_count([])
        res = self._post(dict(VALID, email="nope"))
        self.assertEqual(res.status_code, 422)
        self.assertIn("email", res.json()["fields"])
        self.assertEqual(self.env["disha.membership.application"].sudo().search_count([]), before)

    def test_bad_json_and_key(self):
        res = self.url_open(URL, data="{not json", headers={
            "Content-Type": "application/json", "Authorization": f"Bearer {self.token}"})
        self.assertEqual(res.status_code, 400)
        self.assertEqual(self._post(VALID, key="short").status_code, 400)
