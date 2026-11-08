from odoo import _, api, fields, models
from odoo.exceptions import ValidationError

from .content import check_image

# Keep in sync with disha_membership.models.registration.KSA_REGIONS (checked by a test in disha_event_notify).
EVENT_REGIONS = [
    ("all", "All provinces"),
    ("central", "Central Province"),
    ("western", "Western Province"),
    ("eastern", "Eastern Province"),
    ("northern", "Northern Province"),
    ("southern", "Southern Province"),
]


class IofSiteEvent(models.Model):
    _name = "disha.site.event"
    _description = "Website event"
    _order = "event_date desc, id desc"

    name = fields.Char("Event title", required=True)
    event_date = fields.Date("Date", required=True, default=fields.Date.context_today)
    end_date = fields.Date("End date", help="Only for events that run for more than one day")
    time_text = fields.Char("Time", help="Shown as typed, e.g. 6:00 PM onwards")
    region = fields.Selection(EVENT_REGIONS, "Province", required=True, default="all",
                              help="Which province the event is for. Members of that province get the event email.")
    location = fields.Char("Place", help="e.g. Riyadh, Al Malaz")
    details = fields.Text("Details")
    image = fields.Image("Photo", max_width=2000, max_height=2000)
    published = fields.Boolean(default=True, help="Untick to hide it from the website")
    is_upcoming = fields.Boolean(compute="_compute_is_upcoming", search="_search_is_upcoming")
    registration_open = fields.Boolean("Online registration", default=True,
                                       help="Show a Register button on the website while the event is upcoming")
    capacity = fields.Integer("Seats", default=0, help="0 = unlimited. When full, the website stops taking registrations.")
    registration_ids = fields.One2many("disha.site.event.registration", "event_id")
    registration_count = fields.Integer(compute="_compute_registration_count")

    @api.depends("registration_ids")
    def _compute_registration_count(self):
        data = self.env["disha.site.event.registration"]._read_group(
            [("event_id", "in", self.ids)], ["event_id"], ["__count"])
        counts = {ev.id: n for ev, n in data}
        for rec in self:
            rec.registration_count = counts.get(rec.id, 0)

    def _registration_state(self):
        """'open' | 'full' | 'closed' as the website needs it."""
        self.ensure_one()
        if not self.published or not self.registration_open or not self.is_upcoming:
            return "closed"
        if self.capacity and self.registration_count >= self.capacity:
            return "full"
        return "open"

    @api.constrains("capacity")
    def _check_capacity(self):
        for rec in self:
            if rec.capacity < 0:
                raise ValidationError(_("Seats cannot be negative."))

    def action_view_registrations(self):
        self.ensure_one()
        return {
            "type": "ir.actions.act_window", "name": _("Registrations: %s", self.name),
            "res_model": "disha.site.event.registration", "view_mode": "list,pivot,form",
            "domain": [("event_id", "=", self.id)], "context": {"default_event_id": self.id},
        }

    @api.depends("event_date", "end_date")
    def _compute_is_upcoming(self):
        today = fields.Date.context_today(self)
        for rec in self:
            rec.is_upcoming = (rec.end_date or rec.event_date) >= today

    def _search_is_upcoming(self, operator, value):
        today = fields.Date.context_today(self)
        # Odoo 19 may hand a boolean search as ('in', [True]) instead of ('=', True)
        wanted = any(value) if isinstance(value, (list, tuple, set)) else bool(value)
        positive = (operator in ("=", "in")) == wanted
        return ["|", ("end_date", ">=" if positive else "<", today),
                "&", ("end_date", "=", False), ("event_date", ">=" if positive else "<", today)]

    @api.constrains("event_date", "end_date")
    def _check_dates(self):
        for rec in self:
            if rec.end_date and rec.end_date < rec.event_date:
                raise ValidationError(_("End date cannot be before the event date."))

    @api.constrains("image")
    def _check_image(self):
        for rec in self:
            check_image(rec.image)

    @api.constrains("name", "details")
    def _check_length(self):
        for rec in self:
            if len(rec.name or "") > 200 or len(rec.details or "") > 5000:
                raise ValidationError(_("Title or details is too long."))
