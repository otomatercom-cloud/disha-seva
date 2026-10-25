import hmac
import json
import logging
import re

from psycopg2 import IntegrityError

from odoo import http
from odoo.http import request

_logger = logging.getLogger(__name__)

TOKEN_PARAM = "disha_membership.api_token"
MAX_BODY_BYTES = 640 * 1024  # room for an optional <=400KB photo (base64)
IDEMPOTENCY_RE = re.compile(r"^[A-Za-z0-9_-]{16,64}$")


def _json(payload, status=200):
    return http.Response(
        json.dumps(payload),
        status=status,
        headers=[("Content-Type", "application/json"), ("Cache-Control", "no-store")],
    )


class DishaMembershipController(http.Controller):

    def _authorized(self):
        """Constant-time Bearer token check. Returns (ok, error_response)."""
        configured = request.env["ir.config_parameter"].sudo().get_param(TOKEN_PARAM)
        if not configured:
            return False, _json({"ok": False, "error": "not_configured"}, 503)
        header = request.httprequest.headers.get("Authorization", "")
        supplied = header[7:] if header.startswith("Bearer ") else ""
        if not hmac.compare_digest(supplied.encode(), configured.encode()):
            return False, _json({"ok": False, "error": "unauthorized"}, 401)
        return True, None

    @http.route("/api/disha/health", type="http", auth="public", methods=["GET"],
                csrf=False, save_session=False)
    def health(self, **kw):
        ok, error = self._authorized()
        if not ok:
            return error
        return _json({"ok": True})

    @http.route("/api/disha/membership-application", type="http", auth="public",
                methods=["POST"], csrf=False, save_session=False)
    def create_registration(self, **kw):
        ok, error = self._authorized()
        if not ok:
            return error

        length = request.httprequest.content_length
        if length is not None and length > MAX_BODY_BYTES:
            return _json({"ok": False, "error": "payload_too_large"}, 413)
        raw = request.httprequest.get_data(cache=True)
        if len(raw) > MAX_BODY_BYTES:
            return _json({"ok": False, "error": "payload_too_large"}, 413)
        try:
            payload = json.loads(raw.decode("utf-8"))
        except (ValueError, UnicodeDecodeError):
            return _json({"ok": False, "error": "invalid_json"}, 400)
        if not isinstance(payload, dict):
            return _json({"ok": False, "error": "invalid_json"}, 400)

        key = request.httprequest.headers.get("Idempotency-Key") or None
        if key and not IDEMPOTENCY_RE.match(key):
            return _json({"ok": False, "error": "invalid_idempotency_key"}, 400)

        Registration = request.env["disha.membership.application"].sudo()
        try:
            try:
                with request.env.cr.savepoint():
                    result = Registration.create_from_website(payload, key)
            except IntegrityError:
                # Concurrent retry with the same key: return the winner's record.
                existing = Registration.search([("idempotency_key", "=", key)], limit=1)
                if not existing:
                    raise
                result = {"ok": True, "reference": existing.name, "replayed": True}
        except Exception as exc:  # noqa: BLE001 - never leak internals or personal data
            request.env.cr.rollback()
            _logger.error("DISHA registration failed (%s)", type(exc).__name__)
            return _json({"ok": False, "error": "server_error"}, 500)

        if not result["ok"]:
            return _json({"ok": False, "error": "validation_error",
                          "fields": result["errors"]}, 422)
        return _json({"ok": True, "reference": result["reference"],
                      "replayed": result["replayed"]}, 200 if result["replayed"] else 201)
