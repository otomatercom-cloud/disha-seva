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
