import base64
import io
import json

from PIL import Image

from odoo.exceptions import AccessError, UserError, ValidationError
from odoo.tests import HttpCase, TransactionCase, tagged


def _png():
    buf = io.BytesIO()
    Image.new("RGB", (20, 20), (200, 80, 10)).save(buf, "PNG")
    return base64.b64encode(buf.getvalue())


@tagged("post_install", "-at_install")
class TestSiteContent(TransactionCase):

    def test_seed_loaded(self):
        Text, Item = self.env["disha.site.text"], self.env["disha.site.item"]
        self.assertGreater(Text.search_count([]), 100)
        t = Text.search([("key", "=", "home.hero.title_main")])
        self.assertEqual(t.value, t.default_value)
        self.assertFalse(t.is_changed)
        self.assertEqual(Item.search_count([("collection", "=", "pillars")]), 4)

    def test_edit_and_reset(self):
        t = self.env["disha.site.text"].search([("key", "=", "site.email")])
        t.value = "hello@example.org"
        self.assertTrue(t.is_changed)
        t.action_reset()
        self.assertEqual(t.value, "dishaindians@gmail.com")
        self.assertFalse(t.is_changed)

    def test_svg_and_fake_images_rejected(self):
        for payload in (b"<svg xmlns='http://www.w3.org/2000/svg'><script>alert(1)</script></svg>", b"not an image"):
            with self.assertRaises(UserError):
                self.env["disha.site.item"].create({
                    "collection": "gallery", "title": "x", "image": base64.b64encode(payload)})

    def test_pdf_only(self):
        with self.assertRaises(ValidationError):
            self.env["disha.site.item"].create({
                "collection": "reports", "title": "r", "file": base64.b64encode(b"MZ-not-pdf")})
        rec = self.env["disha.site.item"].create({
            "collection": "reports", "title": "r", "file": base64.b64encode(b"%PDF-1.4 test")})
        self.assertTrue(rec.file)

    def test_editor_cannot_create_text_keys(self):
        user = self.env["res.users"].create({
            "name": "Editor", "login": "site_editor_t",
            "group_ids": [(6, 0, [self.env.ref("disha_site_content.group_disha_site_editor").id])]})
        Text = self.env["disha.site.text"].with_user(user)
        with self.assertRaises(AccessError):
            Text.create({"key": "x.y", "page": "X", "label": "L"})
        Text.search([("key", "=", "site.name")]).value = "DISHA Test"  # editing allowed


@tagged("post_install", "-at_install")
class TestSiteContentHttp(HttpCase):

    def test_api_and_media(self):
        t = self.env["disha.site.text"].search([("key", "=", "home.hero.title_main")])
        t.value = "Edited headline"
        logo = self.env["disha.site.text"].search([("key", "=", "site.logo")])
        logo.image = _png()
        shown = self.env["disha.site.item"].create({"collection": "gallery", "title": "Visible", "image": _png()})
        hidden = self.env["disha.site.item"].create(
            {"collection": "gallery", "title": "Hidden", "image": _png(), "published": False})
        self.env.cr.flush()
        res = self.url_open("/api/disha/site-content")
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.content)
        self.assertEqual(data["texts"]["home.hero.title_main"], "Edited headline")
        self.assertIn("site.logo", data["images"])
        titles = [i["title"] for i in data["collections"]["gallery"]]
        self.assertIn("Visible", titles)
        self.assertNotIn("Hidden", titles)
        self.assertEqual(len(data["collections"]["pillars"]), 4)
        # media
        ok = self.url_open(data["images"]["site.logo"])
        self.assertEqual(ok.status_code, 200)
        self.assertEqual(ok.headers["Content-Type"], "image/png")
        self.assertEqual(ok.headers["X-Content-Type-Options"], "nosniff")
        self.assertEqual(self.url_open(f"/disha/site-media/item/{hidden.id}/image").status_code, 404)
        self.assertEqual(self.url_open(f"/disha/site-media/item/{shown.id}/secret").status_code, 404)
        self.assertEqual(self.url_open(f"/disha/site-media/res.users/1/image").status_code, 404)


@tagged("post_install", "-at_install")
class TestSiteEvents(HttpCase):

    def test_event_rules_and_api(self):
        Event = self.env["disha.site.event"]
        with self.assertRaises(ValidationError):
            Event.create({"name": "Bad", "event_date": "2026-11-10", "end_date": "2026-11-09"})
        with self.assertRaises(ValidationError):
            Event.create({"name": "Bad img", "event_date": "2026-11-10", "image": base64.b64encode(b"<svg onload=x>")})
        past = Event.create({"name": "Old camp", "event_date": "2020-01-05"})
        multi = Event.create({"name": "Long fest", "event_date": "2020-01-01", "end_date": "2999-01-01"})
        self.assertFalse(past.is_upcoming)
        self.assertTrue(multi.is_upcoming)
        self.assertIn(multi, Event.search([("is_upcoming", "=", True)]))
        self.assertNotIn(multi, Event.search([("is_upcoming", "=", False)]))
        shown = Event.create({"name": "Blood camp", "event_date": "2999-02-02", "time_text": "6 PM", "region": "eastern",
                              "location": "Riyadh", "details": "Join us", "image": _png()})
        hidden = Event.create({"name": "Secret", "event_date": "2999-03-03", "image": _png(), "published": False})
        self.env.cr.flush()
        data = json.loads(self.url_open("/api/disha/site-content").content)
        titles = [e["title"] for e in data["events"]]
        self.assertIn("Blood camp", titles)
        self.assertNotIn("Secret", titles)
        ev = next(e for e in data["events"] if e["title"] == "Blood camp")
        self.assertEqual((ev["date"], ev["time"], ev["location"]), ("2999-02-02", "6 PM", "Riyadh"))
        self.assertEqual((ev["region"], ev["region_label"]), ("eastern", "Eastern Province"))
        self.assertEqual(self.url_open(ev["image"]).status_code, 200)
        self.assertEqual(self.url_open(f"/disha/site-media/event/{hidden.id}/image").status_code, 404)
        self.assertEqual(self.url_open(f"/disha/site-media/event/{shown.id}/secret").status_code, 404)
