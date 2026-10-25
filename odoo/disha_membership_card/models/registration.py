import base64
import binascii
import logging

from odoo import _, api, fields, models
from odoo.exceptions import UserError

_logger = logging.getLogger(__name__)

MAX_PHOTO_BYTES = 400 * 1024
# magic bytes: JPEG, PNG, WebP (RIFF....WEBP)
DEMONYMS = {"indian": "IN", "nepali": "NP", "nepalese": "NP", "bangladeshi": "BD", "sri lankan": "LK",
            "pakistani": "PK", "saudi": "SA", "filipino": "PH", "american": "US", "british": "GB"}


def _is_image(raw):
    return raw[:3] == b"\xff\xd8\xff" or raw[:8] == b"\x89PNG\r\n\x1a\n" or (raw[:4] == b"RIFF" and raw[8:12] == b"WEBP")


class DishaMembershipApplication(models.Model):
    _inherit = "disha.membership.application"

    photo = fields.Image(string="Passport Photo", max_width=600, max_height=800)
    application_id = fields.Many2one("association.membership.application", string="Membership Application", readonly=True, copy=False)
    member_id = fields.Many2one("association.member", string="Member / ID Card", readonly=True, copy=False)
    member_number = fields.Char(related="member_id.member_number", string="Member ID")
    card_status = fields.Selection(related="member_id.status", string="Card Status")

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
    def _get_membership_type(self):
        xmlid = ("disha_membership_card.membership_type_associate" if self.category == "associate"
                 else "disha_membership_card.membership_type_general")
        return self.env.ref(xmlid, raise_if_not_found=False)

    def _country(self, name):
        Country = self.env["res.country"].sudo()
        country = False
        code = DEMONYMS.get((name or "").strip().lower())
        if code:
            country = Country.search([("code", "=", code)], limit=1)
        if name and not country:  # exact match first: "India" must not hit "British Indian Ocean Territory"
            country = Country.search([("name", "=ilike", name)], limit=1) or Country.search([("code", "=ilike", name)], limit=1)
            country = country or Country.search([("name", "ilike", name)], limit=1)
        return country or self.env.ref("base.in", raise_if_not_found=False) or Country

    def _application_vals(self, mtype):
        self.ensure_one()
        state = self.env["res.country.state"].sudo().search(
            [("country_id.code", "=", "IN"), ("name", "=ilike", self.india_state or "-")], limit=1)
        return {
            "applicant_name": self.full_name,
            "photo": self.photo,
            "date_of_birth": self.date_of_birth,
            "gender": self.gender if self.gender in ("male", "female", "other") else False,
            "blood_group": (self.blood_group or "").lower() or False,
            "mobile": self.mobile,
            "whatsapp": self.whatsapp,
            "email": self.email,
            "nationality_id": self._country(self.nationality).id,
            "iqama_number": self.iqama_number,
            "passport_number": self.passport_number,
            "ksa_province": self.ksa_region,
            "ksa_area": self.ksa_city,
            "occupation": self.occupation,
            "company_name": self.organization,
            "house_address": self.india_address,
            "place": self.india_village,
            "district": self.india_district,
            "state_id": state.id or False,
            "pin_code": self.india_pin,
            "emergency_contact_name": self.ksa_emergency_name,
            "emergency_contact_relationship": self.ksa_emergency_relationship,
            "emergency_contact_mobile": self.ksa_emergency_phone,
            "membership_type_id": mtype.id,
            "membership_category": dict(self._fields["category"].selection).get(self.category, ""),
            "additional_info": _("Created from DISHA membership application %s.\nIndia emergency contact: %s (%s) %s\n%s",
                                 self.name, self.india_emergency_name or "-", self.india_emergency_relationship or "-",
                                 self.india_emergency_phone or "-", self.why_join or ""),
        }

    def _issue_card(self):
        """Create application -> member -> active membership -> card token. Idempotent."""
        self.ensure_one()
        if self.member_id:
            return self.member_id
        mtype = self._get_membership_type()
        if not mtype:
            raise UserError(_("The DISHA membership type is missing."))
        app = self.application_id.sudo()
        if not app:
            app = self.env["association.membership.application"].sudo().create(self._application_vals(mtype))
            self.sudo().application_id = app
        if app.state != "approved":
            if app.state == "draft":
                app.action_submit()
            if app.state == "submitted":
                app.action_start_verification()
            app.action_approve()
        member = app.member_id
        member._ensure_card_token()
        self.sudo().member_id = member
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
        member = self.member_id.sudo()
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
        return {"type": "ir.actions.act_window", "res_model": "association.member",
                "res_id": self.member_id.id, "view_mode": "form"}
