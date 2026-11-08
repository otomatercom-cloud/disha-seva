import base64
import binascii
import hashlib
import hmac
import json
import logging
import re
import time

from odoo import _, http
from odoo.exceptions import AccessDenied, UserError, ValidationError
from odoo.http import request

_logger = logging.getLogger(__name__)

API_TOKEN_PARAM = "disha_membership.api_token"
GROUP = "disha_admin_api.group_disha_web_admin"
TOKEN_TTL = 8 * 3600
MAX_BODY = 24 * 1024 * 1024  # base64 of an 8 MB image / 15 MB PDF fits
HEX = re.compile(r"^#[0-9a-fA-F]{6}$")

ITEM_VALS = ("title", "text", "icon", "year", "category", "sequence", "published")
EVENT_VALS = ("name", "event_date", "end_date", "time_text", "region", "location", "details", "published",
              "registration_open", "capacity")


def _json(payload, status=200):
    return http.Response(json.dumps(payload, default=str), status=status, headers=[
        ("Content-Type", "application/json"), ("Cache-Control", "no-store"), ("X-Content-Type-Options", "nosniff")])


def _err(code, status):
    return _json({"ok": False, "error": code}, status)


def _secret():
    return (request.env["ir.config_parameter"].sudo().get_param("database.secret") or "").encode()


def _sign(payload: bytes):
    return hmac.new(_secret(), payload, hashlib.sha256).hexdigest()


def make_token(uid, now=None):
    body = base64.urlsafe_b64encode(json.dumps({"u": uid, "e": int((now or time.time()) + TOKEN_TTL)}).encode()).decode()
    return f"{body}.{_sign(body.encode())}"


def read_token(token, now=None):
    """Return uid for a valid, unexpired token, else None."""
    try:
        body, sig = token.split(".", 1)
        if not hmac.compare_digest(sig, _sign(body.encode())):
            return None
        data = json.loads(base64.urlsafe_b64decode(body.encode()))
        return int(data["u"]) if data["e"] > (now or time.time()) else None
    except (ValueError, KeyError, TypeError, binascii.Error):
        return None


def _b64(value, limit):
    """Validate a base64 string from the browser; returns it without any data: prefix."""
    if not isinstance(value, str) or len(value) > limit * 4 // 3 + 16:
        raise ValidationError(_("File is too large."))
    value = value.split(",", 1)[-1]
    try:
        base64.b64decode(value, validate=True)
    except (ValueError, binascii.Error):
        raise ValidationError(_("Invalid file data."))
    return value


class DishaAdminApi(http.Controller):

    # ---- auth helpers
    def _server_ok(self):
        configured = request.env["ir.config_parameter"].sudo().get_param(API_TOKEN_PARAM)
        header = request.httprequest.headers.get("Authorization", "")
        supplied = header[7:] if header.startswith("Bearer ") else ""
        return bool(configured) and hmac.compare_digest(supplied.encode(), configured.encode())

    def _admin_env(self):
        """Env of the logged-in admin user (ACLs apply) or None."""
        uid = read_token(request.httprequest.headers.get("X-Admin-Token", ""))
        if not uid:
            return None
        user = request.env["res.users"].sudo().browse(uid).exists()
        if not user or not user.active or not user.has_group(GROUP):
            return None
        return request.env(user=uid)

    def _body(self):
        raw = request.httprequest.get_data(cache=True)
        if len(raw) > MAX_BODY:
            raise ValidationError(_("Request too large."))
        try:
            data = json.loads(raw or b"{}")
        except ValueError:
            raise ValidationError(_("Invalid JSON."))
        if not isinstance(data, dict):
            raise ValidationError(_("Invalid JSON."))
        return data

    # ---- login
    @http.route("/api/disha/admin/login", type="http", auth="public", methods=["POST"], csrf=False, save_session=False)
    def login(self, **kw):
        if not self._server_ok():
            return _err("unauthorized", 401)
        try:
            data = self._body()
            login, password = str(data.get("login") or ""), str(data.get("password") or "")
            if not login or not password or len(login) > 200 or len(password) > 500:
                return _err("invalid_credentials", 401)
            request.session.authenticate(request.env, {"type": "password", "login": login, "password": password})
            uid = request.session.uid
        except (AccessDenied, ValidationError):
            return _err("invalid_credentials", 401)
        except Exception:  # never leak details of an auth failure
            _logger.exception("DISHA admin login failed unexpectedly")
            return _err("invalid_credentials", 401)
        user = request.env["res.users"].sudo().browse(uid)
        if not uid or not user.has_group(GROUP):
            return _err("forbidden", 403)
        return _json({"ok": True, "token": make_token(uid), "name": user.name, "expires_in": TOKEN_TTL})

    @http.route("/api/disha/admin/me", type="http", auth="public", methods=["GET"], csrf=False, save_session=False)
    def me(self, **kw):
        if not self._server_ok():
            return _err("unauthorized", 401)
        env = self._admin_env()
        return _json({"ok": True, "name": env.user.name}) if env else _err("session_expired", 401)

    # ---- resources
    @http.route("/api/disha/admin/<string:res>", type="http", auth="public", methods=["GET", "POST"],
                csrf=False, save_session=False)
    def resource(self, res, **kw):
        if not self._server_ok():
            return _err("unauthorized", 401)
        env = self._admin_env()
        if not env:
            return _err("session_expired", 401)
        handler = {"texts": self._texts, "items": self._items, "events": self._events,
                   "applications": self._applications, "registrations": self._registrations}.get(res)
        if not handler:
            return _err("not_found", 404)
        try:
            with env.cr.savepoint():
                return _json(handler(env, request.httprequest.method, kw))
        except (ValidationError, UserError) as e:
            return _json({"ok": False, "error": "rejected", "message": str(e.args[0] if e.args else e)}, 422)
        except Exception:
            _logger.exception("DISHA admin API error (%s)", res)
            return _err("server", 500)

    # ---- texts
    def _media(self, model, rec, field):
        stamp = int(rec.write_date.timestamp()) if rec.write_date else 0
        return f"/disha/site-media/{model}/{rec.id}/{field}?v={stamp}" if rec[field] else ""

    def _texts(self, env, method, kw):
        Text = env["disha.site.text"]
        if method == "GET":
            return {"ok": True, "texts": [{
                "id": t.id, "key": t.key, "page": t.page, "label": t.label, "kind": t.kind,
                "value": t.value or "", "default": t.default_value or "", "changed": t.is_changed,
                "image": self._media("text", t, "image"),
            } for t in Text.search([])]}
        d = self._body()
        rec = Text.browse(int(d.get("id") or 0)).exists()
        if not rec:
            raise UserError(_("Unknown content item."))
        op = d.get("op")
        if op == "save":
            value = str(d.get("value") or "")
            if rec.key.startswith("theme.") and value and not HEX.match(value):
                raise ValidationError(_("Enter a colour like #1d6b52."))
            if rec.key.startswith("navshow.") and value not in ("", "yes", "no"):
                raise ValidationError(_("Menu visibility must be yes or no."))
            rec.write({"value": value})
        elif op == "image":
            rec.write({"image": _b64(d.get("image_b64"), 8 * 1024 * 1024)})
        elif op == "clear_image":
            rec.write({"image": False})
        elif op == "reset":
            rec.action_reset()
        else:
            raise UserError(_("Unknown action."))
        return {"ok": True}

    # ---- list items (services, goals, gallery ...)
    def _item_dict(self, it):
        return {"id": it.id, "collection": it.collection, "title": it.title or "", "text": it.text or "",
                "icon": it.icon or "", "year": it.year, "category": it.category or "", "sequence": it.sequence,
                "published": it.published, "image": self._media("item", it, "image"),
                "file": self._media("item", it, "file"), "file_name": it.file_name or ""}

    def _items(self, env, method, kw):
        Item = env["disha.site.item"]
        if method == "GET":
            domain = [("collection", "=", kw["collection"])] if kw.get("collection") else []
            return {"ok": True,
                    "collections": Item._fields["collection"].selection,
                    "icons": Item._fields["icon"].selection,
                    "items": [self._item_dict(i) for i in Item.search(domain, limit=1000)]}
        d = self._body()
        op = d.get("op")
        vals = {k: d["vals"][k] for k in ITEM_VALS if isinstance(d.get("vals"), dict) and k in d["vals"]}
        v = d.get("vals") if isinstance(d.get("vals"), dict) else {}
        if v.get("image_b64"):
            vals["image"] = _b64(v["image_b64"], 8 * 1024 * 1024)
        if v.get("clear_image"):
            vals["image"] = False
        if v.get("file_b64"):
            vals["file"] = _b64(v["file_b64"], 15 * 1024 * 1024)
            vals["file_name"] = str(v.get("file_name") or "report.pdf")[:120]
        if v.get("clear_file"):
            vals["file"] = False
        for k in ("icon", "category"):
            if k in vals and not vals[k]:
                vals[k] = False
        if op == "create":
            coll = v.get("collection")
            if coll not in dict(Item._fields["collection"].selection):
                raise UserError(_("Choose a list."))
            vals["collection"] = coll
            rec = Item.create(vals)
            return {"ok": True, "id": rec.id}
        rec = Item.browse(int(d.get("id") or 0)).exists()
        if not rec:
            raise UserError(_("Unknown item."))
        if op == "update":
            rec.write(vals)
        elif op == "delete":
            rec.unlink()
        else:
            raise UserError(_("Unknown action."))
        return {"ok": True}

    # ---- events
    def _event_dict(self, e):
        return {"id": e.id, "name": e.name, "event_date": str(e.event_date), "end_date": str(e.end_date or ""),
                "time_text": e.time_text or "", "region": e.region, "location": e.location or "",
                "details": e.details or "", "published": e.published, "image": self._media("event", e, "image"),
                "registration_open": e.registration_open, "capacity": e.capacity, "registration_count": e.registration_count}

    def _events(self, env, method, kw):
        Event = env["disha.site.event"]
        if method == "GET":
            return {"ok": True, "regions": Event._fields["region"].selection,
                    "events": [self._event_dict(e) for e in Event.search([], limit=500)]}
        d = self._body()
        op = d.get("op")
        v = d.get("vals") if isinstance(d.get("vals"), dict) else {}
        vals = {k: v[k] for k in EVENT_VALS if k in v}
        for k in ("end_date", "time_text", "location", "details"):
            if k in vals and not vals[k]:
                vals[k] = False
        if v.get("image_b64"):
            vals["image"] = _b64(v["image_b64"], 8 * 1024 * 1024)
        if v.get("clear_image"):
            vals["image"] = False
        if op == "create":
            return {"ok": True, "id": Event.create(vals).id}
        rec = Event.browse(int(d.get("id") or 0)).exists()
        if not rec:
            raise UserError(_("Unknown event."))
        if op == "update":
            rec.write(vals)
        elif op == "delete":
            rec.unlink()
        else:
            raise UserError(_("Unknown action."))
        return {"ok": True}

    # ---- event registrations: per-event dashboard + list
    def _registrations(self, env, method, kw):
        Reg = env["disha.site.event.registration"]
        Event = env["disha.site.event"]
        if method == "GET":
            regions = dict(Reg._fields["region"].selection)
            if kw.get("event_id"):
                ev = Event.browse(int(kw["event_id"])).exists()
                if not ev:
                    raise UserError(_("Unknown event."))
                return {"ok": True, "event": {"id": ev.id, "name": ev.name, "date": str(ev.event_date)},
                        "regions": list(regions.items()),
                        "registrations": [{
                            "id": r.id, "reference": r.reference, "name": r.name, "phone": r.phone, "email": r.email,
                            "region": r.region, "place": r.place, "attended": r.attended,
                            "registered": str(r.create_date or "")[:16],
                        } for r in Reg.search([("event_id", "=", ev.id)], limit=5000)]}
            groups = Reg._read_group([], ["event_id", "region"], ["__count"])
            by_event = {}
            for ev, region, n in groups:
                by_event.setdefault(ev.id, {})[region] = n
            return {"ok": True, "regions": list(regions.items()), "events": [{
                "id": e.id, "name": e.name, "date": str(e.event_date), "upcoming": e.is_upcoming,
                "published": e.published, "open": e.registration_open, "capacity": e.capacity,
                "total": sum(by_event.get(e.id, {}).values()), "by_region": by_event.get(e.id, {}),
            } for e in Event.search([], limit=500)]}
        d = self._body()
        rec = Reg.browse(int(d.get("id") or 0)).exists()
        if not rec:
            raise UserError(_("Unknown registration."))
        if d.get("op") == "delete":
            rec.unlink()
        elif d.get("op") == "attended":
            rec.write({"attended": bool(d.get("value"))})
        else:
            raise UserError(_("Unknown action."))
        return {"ok": True}

    # ---- membership applications (approving creates the member + ID card via disha_membership_card)
    def _applications(self, env, method, kw):
        App = env["disha.membership.application"]
        if method == "GET":
            domain = [("state", "=", kw["state"])] if kw.get("state") in ("new", "under_review", "contacted", "approved", "rejected") else []
            recs = App.search(domain, limit=200)
            return {"ok": True, "applications": [{
                "id": a.id, "name": a.name, "full_name": a.full_name, "category": a.category, "state": a.state,
                "region": a.ksa_region or "", "city": a.ksa_city or "", "email": a.email or "", "mobile": a.mobile or "",
                "applied": str(a.registration_date or ""), "duplicates": a.duplicate_count,
                "member_number": a.member_number if "member_number" in a._fields else "",
            } for a in recs]}
        d = self._body()
        rec = App.browse(int(d.get("id") or 0)).exists()
        if not rec:
            raise UserError(_("Unknown application."))
        action = {"approve": "action_approve", "reject": "action_reject", "review": "action_review",
                  "contact": "action_contact", "reset": "action_reset"}.get(d.get("op"))
        if not action:
            raise UserError(_("Unknown action."))
        if d.get("op") == "approve" and rec.state == "approved":
            raise UserError(_("Already approved."))
        getattr(rec, action)()
        return {"ok": True, "state": rec.state}
