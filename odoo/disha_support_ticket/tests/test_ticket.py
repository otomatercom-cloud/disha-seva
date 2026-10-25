import json

from odoo.tests import HttpCase, TransactionCase, tagged

from ..models.ticket import TOKEN_RE

VALID = {
    "requester_name": "Asha Nair", "email": "Asha@Example.com", "mobile": "+966 50 123 4567",
    "category": "visa", "urgency": "normal", "subject": "Exit re-entry visa expired",
    "description": "My exit re-entry visa expired while I was in India.", "consent": True,
}
KEY = "k" * 20


@tagged("post_install", "-at_install")
class TestTicketModel(TransactionCase):

    def setUp(self):
        super().setUp()
        self.T = self.env["disha.support.ticket"]

    def _make(self, **extra):
        res = self.T.create_from_website({**VALID, **extra})
        self.assertTrue(res["ok"], res)
        return res

    def test_create_returns_reference_and_token(self):
        res = self._make()
        self.assertTrue(res["reference"].startswith("DISHA-TKT-"))
        self.assertRegex(res["token"], TOKEN_RE)
        rec = self.T.search([("name", "=", res["reference"])])
        self.assertEqual(rec.email, "asha@example.com")
        self.assertEqual(rec.priority, "1")
        self.assertEqual(rec.state, "new")
        self.assertNotIn(res["token"], rec.token_hash or "")  # stored hashed
        self.assertNotEqual(rec.token_hash, res["token"])

    def test_priority_rules(self):
        self.assertEqual(self.T.search([("name", "=", self._make(urgency="low")["reference"])]).priority, "0")
        med = self.T.search([("name", "=", self._make(category="medical", urgency="low")["reference"])])
        self.assertEqual(med.priority, "2")  # medical floor
        emg = self.T.search([("name", "=", self._make(category="emergency", urgency="low")["reference"])])
        self.assertEqual(emg.priority, "3")
        top = self.T.search([("name", "=", self._make(urgency="emergency")["reference"])])
        self.assertEqual(top.priority, "3")

    def test_deadline_follows_priority(self):
        rec = self.T.search([("name", "=", self._make(urgency="emergency")["reference"])])
        hours = (rec.deadline - rec.create_date).total_seconds() / 3600
        self.assertAlmostEqual(hours, 4, delta=0.1)

    def test_validation(self):
        for patch in ({"email": "bad"}, {"mobile": "abc"}, {"category": "nope"}, {"subject": ""},
                      {"consent": False}, {"urgency": "x"}):
            res = self.T.create_from_website({**VALID, **patch})
            self.assertFalse(res["ok"], patch)
            self.assertTrue(res["errors"])

    def test_unknown_fields_ignored(self):
        res = self._make(state="closed", priority="3", user_id=1, name="HACK")
        rec = self.T.search([("name", "=", res["reference"])])
        self.assertEqual((rec.state, rec.priority), ("new", "1"))

    def test_idempotent(self):
        a = self.T.create_from_website(dict(VALID), KEY)
        b = self.T.create_from_website(dict(VALID), KEY)
        self.assertEqual(a["reference"], b["reference"])
        self.assertTrue(b["replayed"])
        self.assertIsNone(b["token"])  # token is shown once

    def test_lookup_and_wrong_token(self):
        res = self._make()
        ok = self.T.lookup_by_token(res["token"].lower())  # case-insensitive
        self.assertTrue(ok["ok"])
        self.assertEqual(ok["ticket"]["reference"], res["reference"])
        for bad in ("AAAA-AAAA-AAAA", "", "x", None, res["reference"], "' OR 1=1 --"):
            self.assertFalse(self.T.lookup_by_token(bad)["ok"])
        view = ok["ticket"]
        for leaked in ("email", "mobile", "requester_name", "user_id", "token"):
            self.assertNotIn(leaked, view)

    def test_staff_reply_visible_internal_hidden_and_requester_followup(self):
        res = self._make()
        rec = self.T.search([("name", "=", res["reference"])])
        Msg = self.env["disha.support.message"]
        Msg.create({"ticket_id": rec.id, "author_type": "staff", "body": "Please send your passport copy.", "is_public": True})
        Msg.create({"ticket_id": rec.id, "author_type": "staff", "body": "INTERNAL: check Absher", "is_public": False})
        self.assertEqual(rec.state, "in_progress")
        view = self.T.lookup_by_token(res["token"])["ticket"]
        bodies = [m["body"] for m in view["messages"]]
        self.assertIn("Please send your passport copy.", bodies)
        self.assertNotIn("INTERNAL: check Absher", bodies)
        rec.action_wait()
        r = self.T.reply_by_token(res["token"], "Sent on WhatsApp.")
        self.assertTrue(r["ok"])
        self.assertEqual(rec.state, "in_progress")  # reopened by the requester reply
        self.assertEqual(r["ticket"]["messages"][-1]["author"], "You")

    def test_reply_rules(self):
        res = self._make()
        rec = self.T.search([("name", "=", res["reference"])])
        self.assertFalse(self.T.reply_by_token(res["token"], "   ")["ok"])
        self.assertFalse(self.T.reply_by_token("AAAA-AAAA-AAAA", "hi")["ok"])
        rec.action_close()
        self.assertEqual(self.T.reply_by_token(res["token"], "hi")["error"], "closed")


@tagged("post_install", "-at_install")
class TestTicketHttp(HttpCase):

    def _post(self, path, body, token=True, headers=None):
        h = {"Content-Type": "application/json"}
        if token:
            h["Authorization"] = "Bearer " + self.env["ir.config_parameter"].sudo().get_param("disha_support_ticket.api_token")
        h.update(headers or {})
        return self.url_open(path, data=json.dumps(body), headers=h)

    def test_requires_token(self):
        self.assertEqual(self._post("/api/disha/support/ticket", VALID, token=False).status_code, 401)
        r = self.url_open("/api/disha/support/ticket/lookup", data="{}", headers={
            "Content-Type": "application/json", "Authorization": "Bearer wrong"})
        self.assertEqual(r.status_code, 401)

    def test_full_flow(self):
        r = self._post("/api/disha/support/ticket", VALID, headers={"Idempotency-Key": "f" * 24})
        self.assertEqual(r.status_code, 200, r.text)
        data = r.json()
        again = self._post("/api/disha/support/ticket", VALID, headers={"Idempotency-Key": "f" * 24}).json()
        self.assertEqual(again["reference"], data["reference"])
        look = self._post("/api/disha/support/ticket/lookup", {"token": data["token"]})
        self.assertEqual(look.status_code, 200)
        self.assertEqual(look.json()["ticket"]["status_code"], "new")
        miss = self._post("/api/disha/support/ticket/lookup", {"token": "AAAA-BBBB-CCCC"})
        self.assertEqual(miss.status_code, 404)
        rep = self._post("/api/disha/support/ticket/reply", {"token": data["token"], "message": "Any update?"})
        self.assertEqual(rep.status_code, 200)
        self.assertEqual(self._post("/api/disha/support/ticket/reply", {"token": data["token"], "message": ""}).status_code, 422)

    def test_validation_and_limits(self):
        bad = self._post("/api/disha/support/ticket", {**VALID, "email": "nope"})
        self.assertEqual(bad.status_code, 422)
        self.assertIn("email", bad.json()["fields"])
        big = self._post("/api/disha/support/ticket", {**VALID, "description": "x" * 40000})
        self.assertEqual(big.status_code, 413)
        self.assertEqual(self._post("/api/disha/support/ticket", VALID, headers={"Idempotency-Key": "bad key!"}).status_code, 400)
