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


REVOKE_PARAM = "disha_admin_api.revoked_before.%s"


def _secret(env):
    return (env["ir.config_parameter"].sudo().get_param("database.secret") or "").encode()


def _sign(env, payload: bytes):
    return hmac.new(_secret(env), payload, hashlib.sha256).hexdigest()


def _pw_key(env, uid):
    """Short fingerprint of the user's current password hash: a password change invalidates every issued token."""
    env.flush_all()
    env.cr.execute("SELECT password FROM res_users WHERE id = %s", (int(uid),))
    row = env.cr.fetchone()
    return hashlib.sha256((row[0] if row and row[0] else "").encode()).hexdigest()[:16]


def make_token(env, uid, now=None):
    now = now or time.time()
    claims = {"u": int(uid), "i": round(now, 3), "e": int(now + TOKEN_TTL), "k": _pw_key(env, uid)}
    body = base64.urlsafe_b64encode(json.dumps(claims).encode()).decode()
    return f"{body}.{_sign(env, body.encode())}"


def read_token(env, token, now=None):
    """Return the uid for a valid, unexpired, unrevoked token whose password fingerprint still matches, else None."""
    try:
        body, sig = token.split(".", 1)
        if not hmac.compare_digest(sig, _sign(env, body.encode())):
            return None
        data = json.loads(base64.urlsafe_b64decode(body.encode()))
        uid = int(data["u"])
        if data["e"] <= (now or time.time()):
            return None
        revoked = float(env["ir.config_parameter"].sudo().get_param(REVOKE_PARAM % uid) or 0)
        if float(data["i"]) <= revoked:
            return None  # the user signed out after this token was issued
        return uid if hmac.compare_digest(str(data["k"]), _pw_key(env, uid)) else None
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
        uid = read_token(request.env, request.httprequest.headers.get("X-Admin-Token", ""))
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
        return _json({"ok": True, "token": make_token(request.env, uid), "name": user.name, "expires_in": TOKEN_TTL})

    @http.route("/api/disha/admin/logout", type="http", auth="public", methods=["POST"], csrf=False, save_session=False)
    def logout(self, **kw):
        """Revoke every token this user has been issued so far (a copied token stops working at once)."""
        if not self._server_ok():
            return _err("unauthorized", 401)
        env = self._admin_env()
        if not env:
            return _json({"ok": True})  # already invalid: nothing to revoke
        request.env["ir.config_parameter"].sudo().set_param(REVOKE_PARAM % env.uid, repr(time.time()))
        return _json({"ok": True})

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
                   "applications": self._applications, "registrations": self._registrations,
                   "members": self._members, "dashboard": self._dashboard}.get(res)
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
                "member_number": (a.member_number or "") if "member_number" in a._fields else "",
                "needs_member": a.state == "approved" and "disha_member_id" in a._fields and not a.disha_member_id,
            } for a in recs]}
        d = self._body()
        rec = App.browse(int(d.get("id") or 0)).exists()
        if not rec:
            raise UserError(_("Unknown application."))
        action = {"approve": "action_approve", "reject": "action_reject", "review": "action_review",
                  "contact": "action_contact", "reset": "action_reset", "issue_card": "action_issue_card"}.get(d.get("op"))
        if not action:
            raise UserError(_("Unknown action."))
        if not hasattr(rec, action):
            raise UserError(_("This action needs the DISHA membership card module."))
        getattr(rec, action)()
        return {"ok": True, "state": rec.state}

    # ---- membership dashboard + member management (DISHA members only: model disha.member, standalone)
    def _has_members(self, env):
        return "disha.member" in env

    def _member_row(self, mem):
        app = mem.application_id
        return {"id": mem.id, "application_id": app.id, "number": mem.member_number or "", "name": mem.name,
                "category": mem.category, "status": mem.card_status or "", "region": mem.ksa_region or "",
                "city": mem.ksa_city or "", "mobile": mem.mobile or "", "email": mem.email or "",
                "approved": str(app.approved_on or "")[:10], "expiry": str(mem.expiry_date or "")}

    def _dashboard(self, env, method, kw):
        from datetime import date, timedelta
        if method != "GET":
            raise UserError(_("Unknown action."))
        App = env["disha.membership.application"]
        regions = dict(App._fields["ksa_region"].selection)
        today = date.today()
        by_state = {k: 0 for k in ("new", "under_review", "contacted", "approved", "rejected")}
        region = {k: {"applications": 0, "members": 0} for k in regions}
        category = {"general": {"applications": 0, "members": 0}, "associate": {"applications": 0, "members": 0}}
        months = {}
        for i in range(11, -1, -1):  # last 12 months, oldest first
            y, m = today.year, today.month - i
            while m <= 0:
                y, m = y - 1, m + 12
            months[f"{y:04d}-{m:02d}"] = {"applied": 0, "approved": 0}
        pending_card = 0
        has_members = self._has_members(env)
        for a in App.search([], limit=50000):
            by_state[a.state] = by_state.get(a.state, 0) + 1
            if a.ksa_region in region:
                region[a.ksa_region]["applications"] += 1
            if a.category in category:
                category[a.category]["applications"] += 1
            k = str(a.registration_date or "")[:7]
            if k in months:
                months[k]["applied"] += 1
            k = str(a.approved_on or "")[:7]
            if k in months:
                months[k]["approved"] += 1
            if has_members and a.state == "approved" and not a.disha_member_id:
                pending_card += 1
        member_status, exp30, exp60, expired = {}, 0, 0, 0
        if has_members:
            for mem in env["disha.member"].search([], limit=50000):
                st = mem.card_status
                member_status[st] = member_status.get(st, 0) + 1
                if mem.ksa_region in region:
                    region[mem.ksa_region]["members"] += 1
                if mem.category in category:
                    category[mem.category]["members"] += 1
                exp = mem.expiry_date
                if st == "active" and exp:
                    if exp <= today + timedelta(days=30):
                        exp30 += 1
                    if exp <= today + timedelta(days=60):
                        exp60 += 1
            expired = member_status.get("expired", 0)
        return {"ok": True, "applications": by_state | {"total": sum(by_state.values())},
                "members": {"total": sum(member_status.values()), "by_status": member_status,
                            "expiring_30": exp30, "expiring_60": exp60, "expired": expired,
                            "approved_without_member": pending_card},
                "regions": [{"key": k, "label": regions[k], **v} for k, v in region.items()],
                "categories": category,
                "monthly": [{"month": k, **v} for k, v in months.items()]}

    def _members(self, env, method, kw):
        from datetime import date, timedelta
        if method == "GET" and kw.get("app_id"):
            return self._application_detail(env, int(kw["app_id"]))
        if not self._has_members(env):
            if method == "GET":
                return {"ok": True, "total": 0, "members": []}
            raise UserError(_("The DISHA membership card module is not installed."))
        Member = env["disha.member"]
        if method == "GET":
            q = (kw.get("q") or "").strip().lower()
            today = date.today()
            rows = []
            for mem in Member.search([], limit=20000):
                r = self._member_row(mem)
                if kw.get("status") and r["status"] != kw["status"]:
                    continue
                if kw.get("region") and r["region"] != kw["region"]:
                    continue
                if kw.get("category") and r["category"] != kw["category"]:
                    continue
                if kw.get("expiring") == "30":
                    if r["status"] != "active" or not r["expiry"] or not (today <= date.fromisoformat(r["expiry"]) <= today + timedelta(days=30)):
                        continue
                if q and q not in " ".join((r["name"], r["number"], r["mobile"], r["email"])).lower():
                    continue
                rows.append(r)
            rows.sort(key=lambda r: r["number"], reverse=True)
            limit = min(max(int(kw.get("limit") or 50), 1), 200)
            offset = max(int(kw.get("offset") or 0), 0)
            return {"ok": True, "total": len(rows), "members": rows[offset:offset + limit]}
        d = self._body()
        mem = Member.browse(int(d.get("id") or 0)).exists()
        if not mem:
            raise UserError(_("Unknown member."))
        op = d.get("op")
        if op == "email_card":
            mem.action_email_card()
        elif op == "renew":
            try:
                years = int(d.get("years"))
            except (TypeError, ValueError):
                raise ValidationError(_("Choose how many years to renew."))
            mem.action_renew(years, str(d.get("note") or "")[:120])
        elif op == "suspend":
            mem.action_suspend()
        elif op == "reactivate":
            mem.action_reactivate()
        elif op == "cancel":
            mem.action_cancel()
        elif op == "update_contact":
            from odoo.addons.disha_membership.models.registration import EMAIL_RE
            vals = {}
            for f, limit in (("mobile", 20), ("whatsapp", 20), ("ksa_city", 80)):
                if f in d:
                    vals[f] = str(d[f] or "").strip()[:limit]
            if "email" in d:
                email = str(d["email"] or "").strip().lower()
                if email and (len(email) > 254 or not EMAIL_RE.match(email)):
                    raise ValidationError(_("Enter a valid email address."))
                vals["email"] = email
            if "region" in d:
                if d["region"] not in dict(mem._fields["ksa_region"].selection):
                    raise ValidationError(_("Unknown province."))
                vals["ksa_region"] = d["region"]
            if "mobile" in vals and len(vals["mobile"]) < 7:
                raise ValidationError(_("Enter a valid mobile number."))
            mem.write({k: v for k, v in vals.items() if k != "whatsapp"})
            app = mem.application_id
            app.write(vals)
            app.message_post(body=_("Contact details updated from the website admin by %s.", env.user.name))
        else:
            raise UserError(_("Unknown action."))
        return {"ok": True}

    @staticmethod
    def _mask(value):
        value = (value or "").strip()
        return ("\u2022" * max(len(value) - 3, 0) + value[-3:]) if value else ""

    def _application_detail(self, env, app_id):
        """Everything a reviewer needs to verify an application or member (read-only). Passport/Iqama are masked."""
        app = env["disha.membership.application"].browse(app_id).exists()
        if not app:
            raise UserError(_("Unknown application."))
        sel = lambda f: dict(app._fields[f].selection).get(app[f], app[f] or "")  # noqa: E731
        photo = ""
        if "photo" in app._fields and app.photo:
            photo = "data:image/jpeg;base64," + (app.photo.decode() if isinstance(app.photo, bytes) else app.photo)
        mem = app.disha_member_id if "disha_member_id" in app._fields and app.disha_member_id else None
        membership = None
        if mem:
            membership = {"status": mem.card_status, "member_since": str(mem.start_date or ""), "valid_until": str(mem.expiry_date or "")}
        sections = [
            ("Personal", [("Full name", app.full_name), ("Gender", sel("gender")), ("Date of birth", app.date_of_birth),
                          ("Nationality", app.nationality), ("Blood group", sel("blood_group")),
                          ("Qualification", app.qualification), ("Occupation", app.occupation), ("Employer", app.organization)]),
            ("Contact & KSA", [("Mobile", app.mobile), ("WhatsApp", app.whatsapp), ("Email", app.email),
                               ("Province", sel("ksa_region")), ("City / area", app.ksa_city),
                               ("Iqama no.", self._mask(app.iqama_number)), ("Passport no.", self._mask(app.passport_number))]),
            ("Address in India", [("State", app.india_state), ("District", app.india_district), ("Village / town", app.india_village),
                                  ("PIN", app.india_pin), ("Address", app.india_address)]),
            ("Emergency contacts", [("KSA contact", " / ".join(x for x in (app.ksa_emergency_name, app.ksa_emergency_relationship, app.ksa_emergency_phone) if x)),
                                    ("India contact", " / ".join(x for x in (app.india_emergency_name, app.india_emergency_relationship, app.india_emergency_phone) if x))]),
            ("Declaration", [("Why join", app.why_join), ("Consent given", "Yes" if app.consent_given else "No"), ("Consent time", app.consent_date)]),
        ]
        return {"ok": True, "application": {
            "id": app.id, "name": app.name, "state": app.state, "category": sel("category"), "photo": photo,
            "applied": str(app.registration_date or "")[:16], "approved": str(app.approved_on or "")[:16],
            "approved_by": app.approved_by_id.name or "", "duplicates": app.duplicate_count, "source": sel("source"),
            "member": {"id": mem.id, "number": mem.member_number or "", "status": mem.card_status} if mem else None,
            "membership": membership,
            "terms": [{"kind": t.kind, "start": str(t.start_date), "end": str(t.end_date), "note": t.note or "", "by": t.user_id.name or ""}
                      for t in mem.term_ids] if mem else [],
            "sections": [{"title": t, "rows": [[k, str(v or "")] for k, v in rows]} for t, rows in sections],
        }}
