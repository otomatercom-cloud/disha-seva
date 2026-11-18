import base64
import binascii
import logging

from odoo import _, api, fields, models
from odoo.exceptions import UserError

_logger = logging.getLogger(__name__)

MAX_PHOTO_BYTES = 400 * 1024


def _is_image(raw):
    """magic bytes: JPEG, PNG, WebP (RIFF....WEBP)"""
    return raw[:3] == b"\xff\xd8\xff" or raw[:8] == b"\x89PNG\r\n\x1a\n" or (raw[:4] == b"RIFF" and raw[8:12] == b"WEBP")


class DishaMembershipApplication(models.Model):
    _inherit = "disha.membership.application"

    photo = fields.Image(string="Passport Photo", max_width=600, max_height=800)
    disha_member_id = fields.Many2one("disha.member", string="Member / ID Card", readonly=True, copy=False, index=True)
    member_number = fields.Char(related="disha_member_id.member_number", string="Member ID")
    card_status = fields.Selection(related="disha_member_id.card_status", string="Card Status")

    @api.model
    def _clean_payload(self, payload):
        vals, errors = super()._clean_payload(payload)
        photo = payload.get("photo") if isinstance(payload, dict) else None
        if photo:
            try:
                if not isinstance(photo, str):
                    raise ValueError
                if photo.startswith("data:"):
                    photo = photo.split(",", 1)[1]
                raw = base64.b64decode(photo, validate=True)
                if len(raw) > MAX_PHOTO_BYTES or not _is_image(raw):
                    raise ValueError
                vals["photo"] = base64.b64encode(raw)
            except (ValueError, binascii.Error, IndexError):
                errors["photo"] = "Upload a JPG, PNG or WebP photo under 400 KB."
        return vals, errors

    # ---------------------------------------------------------------- card issuing
    def _member_vals(self):
        self.ensure_one()
        return {
            "application_id": self.id, "name": self.full_name, "category": self.category, "photo": self.photo,
            "email": self.email, "mobile": self.mobile, "nationality": self.nationality or "Indian",
            "ksa_region": self.ksa_region, "ksa_city": self.ksa_city,
        }

    def _issue_card(self):
        """Create the DISHA member with its first subscription term and card token. Idempotent."""
        self.ensure_one()
        if self.disha_member_id:
            return self.disha_member_id
        member = self.env["disha.member"].sudo().create(self._member_vals())
        member._add_term(member._validity_years(), "new")
        member._ensure_card_token()
        self.sudo().disha_member_id = member
        self.message_post(body=_("ID card issued: member %s.", member.member_number))
        return member

    def action_approve(self):
        res = super().action_approve()
        for rec in self:
            rec._issue_card()
            rec._send_card_email()
        return res

    def _send_card_email(self):
        self.ensure_one()
        member = self.disha_member_id.sudo()
        if not (member and member.email):
            return False
        try:
            with self.env.cr.savepoint():
                member.action_email_card()
            return True
        except Exception:  # best-effort: never block approval because mail/PDF failed
            _logger.warning("Card email failed for %s", self.name, exc_info=True)
            self.message_post(body=_("Card email could not be sent; use 'Email Card' later."))
            return False

    def action_issue_card(self):
        for rec in self:
            if rec.state != "approved":
                raise UserError(_("Approve the application first."))
            rec._issue_card()

    def action_print_card(self):
        self.ensure_one()
        return self._issue_card().sudo().action_print_card()

    def action_email_card(self):
        self.ensure_one()
        self._issue_card().sudo().action_email_card()
        return True

    def action_open_member(self):
        self.ensure_one()
        return {"type": "ir.actions.act_window", "res_model": "disha.member",
                "res_id": self.disha_member_id.id, "view_mode": "form"}
