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
        t = make_token(self.admin.id)
        self.assertEqual(read_token(t), self.admin.id)
        self.assertIsNone(read_token(t + "x"))
        self.assertIsNone(read_token(t, now=10 ** 12))

    def test_requires_server_token_and_admin_token(self):
        self.assertEqual(self.url_open("/api/disha/admin/texts").status_code, 401)
        self.assertEqual(self._get("/api/disha/admin/texts").status_code, 401)
        self.assertEqual(self._get("/api/disha/admin/texts", make_token(self.admin.id)).status_code, 200)

    def test_user_without_group_is_refused(self):
        u = self.env["res.users"].create({"name": "Plain", "login": "plain@x.test", "group_ids": [(6, 0, [self.env.ref("base.group_user").id])]})
        self.assertEqual(self._get("/api/disha/admin/texts", make_token(u.id)).status_code, 401)

    def test_edit_text_theme_validation_and_item_create(self):
        tok = make_token(self.admin.id)
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
