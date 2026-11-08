import json

from odoo.tests import HttpCase, tagged

from ..controllers.main import make_token, read_token


@tagged("post_install", "-at_install", "disha_admin_api")
class TestAdminApi(HttpCase):

    def setUp(self):
        super().setUp()
        self.env["ir.config_parameter"].sudo().set_param("disha_membership.api_token", "tok-123")
        self.admin = self.env.ref("base.user_admin")
        self.hdr = {"Authorization": "Bearer tok-123", "Content-Type": "application/json"}

    def _get(self, path, token=None):
        h = dict(self.hdr)
        if token:
            h["X-Admin-Token"] = token
        return self.url_open(path, headers=h)

    def _post(self, path, data, token=None):
        h = dict(self.hdr)
        if token:
            h["X-Admin-Token"] = token
        return self.url_open(path, data=json.dumps(data), headers=h)

    def test_token_roundtrip_and_expiry(self):
        t = make_token(self.env, self.admin.id)
        self.assertEqual(read_token(self.env, t), self.admin.id)
        self.assertIsNone(read_token(self.env, t + "x"))
        self.assertIsNone(read_token(self.env, t, now=10 ** 12))

    def test_logout_revokes_the_token(self):
        t = make_token(self.env, self.admin.id)
        self.assertEqual(self._get("/api/disha/admin/texts", t).status_code, 200)
        self.assertEqual(self._post("/api/disha/admin/logout", {}, t).status_code, 200)
        self.assertEqual(self._get("/api/disha/admin/texts", t).status_code, 401)   # same token is dead
        fresh = make_token(self.env, self.admin.id, now=__import__("time").time() + 5)
        self.assertEqual(self._get("/api/disha/admin/texts", fresh).status_code, 200)  # a new sign-in works

    def test_password_change_revokes_the_token(self):
        t = make_token(self.env, self.admin.id)
        self.assertEqual(read_token(self.env, t), self.admin.id)
        self.admin.password = "A-new-Passw0rd!x"
        self.assertIsNone(read_token(self.env, t))

    def test_requires_server_token_and_admin_token(self):
        self.assertEqual(self.url_open("/api/disha/admin/texts").status_code, 401)
        self.assertEqual(self._get("/api/disha/admin/texts").status_code, 401)
        self.assertEqual(self._get("/api/disha/admin/texts", make_token(self.env, self.admin.id)).status_code, 200)

    def test_user_without_group_is_refused(self):
        u = self.env["res.users"].create({"name": "Plain", "login": "plain@x.test", "group_ids": [(6, 0, [self.env.ref("base.group_user").id])]})
        self.assertEqual(self._get("/api/disha/admin/texts", make_token(self.env, u.id)).status_code, 401)

    def test_edit_text_theme_validation_and_item_create(self):
        tok = make_token(self.env, self.admin.id)
        t = self.env["disha.site.text"].search([("key", "=", "home.hero.title_main")])
        r = self._post("/api/disha/admin/texts", {"op": "save", "id": t.id, "value": "Hello"}, tok)
        self.assertEqual(r.status_code, 200)
        self.assertEqual(t.value, "Hello")
        theme = self.env["disha.site.text"].search([("key", "=", "theme.primary")])
        if theme:
            bad = self._post("/api/disha/admin/texts", {"op": "save", "id": theme.id, "value": "red"}, tok)
            self.assertEqual(bad.status_code, 422)
        r = self._post("/api/disha/admin/items", {"op": "create", "vals": {"collection": "services", "title": "New service"}}, tok)
        self.assertEqual(r.status_code, 200)
        self.assertTrue(self.env["disha.site.item"].search([("title", "=", "New service")]))

    def test_event_registrations_dashboard(self):
        tok = make_token(self.env, self.admin.id)
        ev = self.env["disha.site.event"].create({"name": "Camp", "event_date": "2099-01-01", "capacity": 1})
        self.env["disha.site.event.registration"].create(
            {"event_id": ev.id, "name": "Ann Lee", "phone": "0551234567", "email": "A@x.test", "region": "central", "place": "Riyadh"})
        r = json.loads(self._get("/api/disha/admin/registrations", tok).content)
        row = next(e for e in r["events"] if e["id"] == ev.id)
        self.assertEqual((row["total"], row["by_region"]), (1, {"central": 1}))
        lst = json.loads(self._get(f"/api/disha/admin/registrations?event_id={ev.id}", tok).content)
        self.assertEqual(lst["registrations"][0]["email"], "a@x.test")
