import re

from odoo import _, api, fields, models
from odoo.exceptions import ValidationError

from .event import EVENT_REGIONS

# Provinces a person can register from (the event's own "all" option is not a home province).
REG_REGIONS = [r for r in EVENT_REGIONS if r[0] != "all"]
PHONE_RE = re.compile(r"^\+?[0-9][0-9\s\-()]{6,19}$")
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


class DishaSiteEventRegistration(models.Model):
    _name = "disha.site.event.registration"
    _description = "Event registration"
    _order = "create_date desc, id desc"

    _one_per_email = models.Constraint("unique(event_id, email)", "This email is already registered for the event.")

    event_id = fields.Many2one("disha.site.event", required=True, ondelete="cascade", index=True)
    name = fields.Char("Full name", required=True)
    phone = fields.Char(required=True)
    email = fields.Char(required=True, index=True)
    region = fields.Selection(REG_REGIONS, "Province", required=True)
    place = fields.Char("Place / city", required=True)
    reference = fields.Char(compute="_compute_reference")
    attended = fields.Boolean(help="Tick on the event day for the attendance count")

    @api.depends("event_id")
    def _compute_reference(self):
        for rec in self:
            rec.reference = f"REG-{rec.id:05d}" if rec.id else ""

    @api.model_create_multi
    def create(self, vals_list):
        for vals in vals_list:
            if vals.get("email"):
                vals["email"] = vals["email"].strip().lower()
        return super().create(vals_list)

    def write(self, vals):
        if vals.get("email"):
            vals["email"] = vals["email"].strip().lower()
        return super().write(vals)

    @api.constrains("name", "phone", "email", "place")
    def _check_values(self):
        for rec in self:
            if not (2 <= len((rec.name or "").strip()) <= 120) or len(rec.place or "") > 120:
                raise ValidationError(_("Name or place has an invalid length."))
            if not PHONE_RE.match(rec.phone or ""):
                raise ValidationError(_("Enter a valid phone number."))
            if len(rec.email or "") > 254 or not EMAIL_RE.match(rec.email or ""):
                raise ValidationError(_("Enter a valid email address."))
