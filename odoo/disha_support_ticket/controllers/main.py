import hmac
import json
import logging
import re

from psycopg2 import IntegrityError

from odoo import http
from odoo.http import request

_logger = logging.getLogger(__name__)

TOKEN_PARAMS = ("disha_support_ticket.api_token", "disha_membership.api_token")
MAX_BODY_BYTES = 32 * 1024
IDEMPOTENCY_RE = re.compile(r"^[A-Za-z0-9_-]{16,64}$")


def _json(payload, status=200):
    return http.Response(json.dumps(payload), status=status, content_type="application/json",
                         headers=[("Cache-Control", "no-store"), ("X-Content-Type-Options", "nosniff")])


class DishaSupportApi(http.Controller):

    def _authorized(self):
        """Constant-time Bearer check against the support token (or the shared volunteer API token)."""
        icp = request.env["ir.config_parameter"].sudo()
        configured = [icp.get_param(p) for p in TOKEN_PARAMS if icp.get_param(p)]
        if not configured:
            return False, _json({"ok": False, "error": "not_configured"}, 503)
        header = request.httprequest.headers.get("Authorization", "")
        supplied = (header[7:] if header.startswith("Bearer ") else "").encode()
        ok = False
        for token in configured:  # no early exit: constant work
            ok |= hmac.compare_digest(supplied, token.encode())
        return (True, None) if ok else (False, _json({"ok": False, "error": "unauthorized"}, 401))

    def _body(self):
        length = request.httprequest.content_length
        if length is not None and length > MAX_BODY_BYTES:
            return None, _json({"ok": False, "error": "payload_too_large"}, 413)
        raw = request.httprequest.get_data(cache=True)
        if len(raw) > MAX_BODY_BYTES:
            return None, _json({"ok": False, "error": "payload_too_large"}, 413)
        try:
            data = json.loads(raw.decode("utf-8"))
        except (ValueError, UnicodeDecodeError):
            return None, _json({"ok": False, "error": "invalid_json"}, 400)
        if not isinstance(data, dict):
            return None, _json({"ok": False, "error": "invalid_json"}, 400)
        return data, None

    @http.route("/api/disha/support/ticket", type="http", auth="public", methods=["POST"],
                csrf=False, save_session=False)
    def create_ticket(self, **kw):
        ok, error = self._authorized()
        if not ok:
            return error
        key = request.httprequest.headers.get("Idempotency-Key", "")
        if key and not IDEMPOTENCY_RE.match(key):
            return _json({"ok": False, "error": "invalid_idempotency_key"}, 400)
        payload, error = self._body()
        if error:
            return error
        Ticket = request.env["disha.support.ticket"]
        try:
            with request.env.cr.savepoint():
                result = Ticket.create_from_website(payload, key or None)
        except IntegrityError:
            # concurrent duplicate submission: replay the winner (no token: it was shown once)
            existing = Ticket.sudo().search([("idempotency_key", "=", key)], limit=1) if key else Ticket
            if not existing:
                _logger.exception("Support ticket creation failed")
                return _json({"ok": False, "error": "server_error"}, 500)
            result = {"ok": True, "reference": existing.name, "token": None, "replayed": True}
        except Exception:
            _logger.exception("Support ticket creation failed")
            return _json({"ok": False, "error": "server_error"}, 500)
        if not result["ok"]:
            return _json({"ok": False, "error": "validation_error", "fields": result["errors"]}, 422)
        return _json(result)

    @http.route("/api/disha/support/ticket/lookup", type="http", auth="public", methods=["POST"],
                csrf=False, save_session=False)
    def lookup(self, **kw):
        ok, error = self._authorized()
        if not ok:
            return error
        payload, error = self._body()
        if error:
            return error
        result = request.env["disha.support.ticket"].lookup_by_token(payload.get("token"))
        return _json(result, 200 if result["ok"] else 404)

    @http.route("/api/disha/support/ticket/reply", type="http", auth="public", methods=["POST"],
                csrf=False, save_session=False)
    def reply(self, **kw):
        ok, error = self._authorized()
        if not ok:
            return error
        payload, error = self._body()
        if error:
            return error
        result = request.env["disha.support.ticket"].reply_by_token(payload.get("token"), payload.get("message"))
        if result["ok"]:
            return _json(result)
        status = 404 if result.get("error") == "not_found" else 409 if result.get("error") == "closed" else 422
        return _json(result, status)
