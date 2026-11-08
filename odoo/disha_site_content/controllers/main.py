import base64
import json
import logging

import hmac
import re

from odoo import fields, http
from odoo.http import request

_logger = logging.getLogger(__name__)
MODELS = {"text": "disha.site.text", "item": "disha.site.item", "event": "disha.site.event"}
FIELDS = {"text": ("image",), "item": ("image", "file"), "event": ("image",)}


def _json(payload, status=200, cache="public, max-age=15"):
    return http.Response(json.dumps(payload), status=status, content_type="application/json",
                         headers=[("Cache-Control", cache), ("X-Content-Type-Options", "nosniff")])


def _media_url(model, rec, field):
    stamp = int(rec.write_date.timestamp()) if rec.write_date else 0
    return f"/disha/site-media/{model}/{rec.id}/{field}?v={stamp}"


class DishaSiteContent(http.Controller):

    @http.route("/api/disha/site-content", type="http", auth="public", methods=["GET"],
                csrf=False, save_session=False)
    def content(self, **kw):
        """Public website content (everything here is already public on the site)."""
        env = request.env
        texts, images = {}, {}
        for rec in env["disha.site.text"].sudo().search([]):
            if rec.kind == "image":
                if rec.image:
                    images[rec.key] = _media_url("text", rec, "image")
            elif rec.value:
                texts[rec.key] = rec.value
        collections = {name: [] for name, _label in env["disha.site.item"]._fields["collection"].selection}
        for it in env["disha.site.item"].sudo().search([("published", "=", True)]):
            collections[it.collection].append({
                "title": it.title or "", "text": it.text or "", "icon": it.icon or "",
                "image": _media_url("item", it, "image") if it.image else "",
                "file": _media_url("item", it, "file") if it.file else "",
                "year": it.year if it.collection == "gallery" else 0,
                "category": (it.category or "").strip() if it.collection == "gallery" else "",
            })
        region_label = dict(env["disha.site.event"]._fields["region"].selection)
        events = [{
            "id": ev.id, "registration": ev._registration_state(),
            "title": ev.name, "date": fields.Date.to_string(ev.event_date),
            "end_date": fields.Date.to_string(ev.end_date) if ev.end_date else "",
            "time": ev.time_text or "", "location": ev.location or "", "details": ev.details or "",
            "region": ev.region, "region_label": region_label.get(ev.region, ""),
            "image": _media_url("event", ev, "image") if ev.image else "",
        } for ev in env["disha.site.event"].sudo().search([("published", "=", True)], limit=200)]
        # An empty collection is sent as [] so the site can tell "emptied on purpose" from "Odoo down"
        return _json({"texts": texts, "images": images, "collections": collections, "events": events})

    @http.route("/disha/site-media/<string:model>/<int:rec_id>/<string:field>", type="http",
                auth="public", methods=["GET"], csrf=False, save_session=False)
    def media(self, model, rec_id, field, **kw):
        if model not in MODELS or field not in FIELDS[model]:
            return request.not_found()
        rec = request.env[MODELS[model]].sudo().browse(rec_id).exists()
        if not rec or (model in ("item", "event") and not rec.published) or not rec[field]:
            return request.not_found()
        raw = base64.b64decode(rec[field])
        if field == "file":
            mime, extra = "application/pdf", [("Content-Disposition", 'inline; filename="report.pdf"')]
            if raw[:5] != b"%PDF-":
                return request.not_found()
        else:
            mime = ("image/jpeg" if raw[:3] == b"\xff\xd8\xff" else "image/png" if raw[:4] == b"\x89PNG"
                    else "image/gif" if raw[:3] == b"GIF" else "image/webp")
            extra = []
        return http.Response(raw, content_type=mime, headers=[
            ("Cache-Control", "public, max-age=3600"), ("X-Content-Type-Options", "nosniff"),
            ("Content-Security-Policy", "default-src 'none'; img-src 'self'; sandbox"), *extra])


    # ---- public event registration (called by the Next.js server only, Bearer token)
    @http.route("/api/disha/event-registration", type="http", auth="public", methods=["POST"],
                csrf=False, save_session=False)
    def event_registration(self, **kw):
        env = request.env
        configured = env["ir.config_parameter"].sudo().get_param("disha_membership.api_token")
        header = request.httprequest.headers.get("Authorization", "")
        supplied = header[7:] if header.startswith("Bearer ") else ""
        if not configured or not hmac.compare_digest(supplied.encode(), configured.encode()):
            return _json({"ok": False, "error": "unauthorized"}, 401, "no-store")
        raw = request.httprequest.get_data(cache=True)
        try:
            d = json.loads(raw) if len(raw) < 8192 else None
        except ValueError:
            d = None
        if not isinstance(d, dict):
            return _json({"ok": False, "error": "invalid"}, 400, "no-store")

        Reg = env["disha.site.event.registration"].sudo()
        regions = dict(Reg._fields["region"].selection)
        clean = lambda k, n: re.sub(r"[\x00-\x1f]", " ", str(d.get(k) or "")).strip()[:n]  # noqa: E731
        region = clean("region", 40).lower()
        region = region if region in regions else next((k for k, v in regions.items() if v.lower() == region), "")
        vals = {"name": clean("name", 120), "phone": clean("phone", 20), "email": clean("email", 254).lower(),
                "region": region, "place": clean("place", 120)}
        fields_err = {}
        if len(vals["name"]) < 2:
            fields_err["name"] = "Enter your full name."
        if not re.match(r"^\+?[0-9][0-9\s\-()]{6,19}$", vals["phone"]):
            fields_err["phone"] = "Enter a valid phone number."
        if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", vals["email"]):
            fields_err["email"] = "Enter a valid email address."
        if not vals["region"]:
            fields_err["region"] = "Choose your province."
        if not vals["place"]:
            fields_err["place"] = "Enter your place."
        if fields_err:
            return _json({"ok": False, "error": "validation_error", "fields": fields_err}, 422, "no-store")
        try:
            event_id = int(d.get("event_id"))
        except (TypeError, ValueError):
            return _json({"ok": False, "error": "not_found"}, 404, "no-store")
        # Lock the event row so two people cannot take the last seat together
        env.cr.execute("SELECT id FROM disha_site_event WHERE id = %s FOR UPDATE", (event_id,))
        event = env["disha.site.event"].sudo().browse(event_id).exists()
        if not event or not event.published:
            return _json({"ok": False, "error": "not_found"}, 404, "no-store")
        state = event._registration_state()
        if state != "open":
            return _json({"ok": False, "error": state}, 409, "no-store")
        if Reg.search_count([("event_id", "=", event.id), ("email", "=", vals["email"])]):
            return _json({"ok": False, "error": "duplicate"}, 409, "no-store")
        rec = Reg.create(dict(vals, event_id=event.id))
        return _json({"ok": True, "reference": rec.reference}, 200, "no-store")
