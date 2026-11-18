import base64
import io
import logging
import secrets

from dateutil.relativedelta import relativedelta

from odoo import _, api, fields, models
from odoo.exceptions import UserError, ValidationError
from odoo.tools import file_open

from odoo.addons.disha_membership.models.registration import CATEGORIES, KSA_REGIONS

_logger = logging.getLogger(__name__)
ORG_NAME = "DISHA"
ORG_CONTACT = "dishaindians@gmail.com"
REPORT = "disha_membership_card.action_report_disha_card"
STATUSES = [("active", "Active"), ("suspended", "Suspended"), ("cancelled", "Cancelled")]


def _logo_uri():
    try:
        with file_open("disha_membership_card/static/img/logo.png", "rb") as fh:
            return "data:image/png;base64," + base64.b64encode(fh.read()).decode()
    except Exception:
        return ""


class DishaMember(models.Model):
    _name = "disha.member"
    _description = "DISHA Member"
    _inherit = ["mail.thread", "mail.activity.mixin"]
    _order = "member_number desc, id desc"

    name = fields.Char(string="Full Name", required=True, tracking=True, index=True)
    member_number = fields.Char(string="Member ID", readonly=True, copy=False, index=True, default="New")
    application_id = fields.Many2one("disha.membership.application", string="Application", readonly=True,
                                     copy=False, index=True, ondelete="restrict")
    category = fields.Selection(CATEGORIES, string="Membership Category", required=True, default="general", tracking=True)
    photo = fields.Image(string="Passport Photo", max_width=600, max_height=800)
    email = fields.Char(tracking=True)
    mobile = fields.Char(tracking=True)
    nationality = fields.Char(default="Indian")
    ksa_region = fields.Selection(KSA_REGIONS, string="Province / Region in KSA", index=True, tracking=True)
    ksa_city = fields.Char(string="City / Area in KSA")
    status = fields.Selection(STATUSES, default="active", required=True, tracking=True, index=True)
    term_ids = fields.One2many("disha.member.term", "member_id", string="Subscription History")
    start_date = fields.Date(string="Member Since", compute="_compute_dates", store=True)
    expiry_date = fields.Date(string="Valid Until", compute="_compute_dates", store=True, index=True)
    card_status = fields.Selection(
        [("active", "Active"), ("expired", "Expired"), ("suspended", "Suspended"), ("cancelled", "Cancelled")],
        string="Card Status", compute="_compute_card_status")
    card_token = fields.Char(copy=False, index=True, readonly=True)
    card_verify_url = fields.Char(compute="_compute_verify_url")

    _application_uniq = models.Constraint("unique(application_id)", "This application already has a member.")
    _token_uniq = models.Constraint("unique(card_token)", "Card token collision, please retry.")

    @api.depends("term_ids.start_date", "term_ids.end_date")
    def _compute_dates(self):
        for rec in self:
            rec.start_date = min(rec.term_ids.mapped("start_date"), default=False)
            rec.expiry_date = max(rec.term_ids.mapped("end_date"), default=False)

    @api.depends("status", "expiry_date")
    def _compute_card_status(self):
        today = fields.Date.context_today(self)
        for rec in self:
            if rec.status != "active":
                rec.card_status = rec.status
            else:
                rec.card_status = "expired" if (not rec.expiry_date or rec.expiry_date < today) else "active"

    @api.depends("card_token")
    def _compute_verify_url(self):
        icp = self.env["ir.config_parameter"].sudo()
        base = (icp.get_param("disha_membership_card.verify_base_url") or icp.get_param("web.base.url") or "").rstrip("/")
        for rec in self:
            rec.card_verify_url = f"{base}/disha/verify/{rec.card_token}" if (rec.card_token and base) else False

    @api.model_create_multi
    def create(self, vals_list):
        for vals in vals_list:
            if vals.get("member_number", "New") in ("New", False, ""):
                vals["member_number"] = self.env["ir.sequence"].sudo().next_by_code("disha.association.member") or "New"
        return super().create(vals_list)

    def _ensure_card_token(self):
        for rec in self.sudo():
            if not rec.card_token:
                rec.card_token = secrets.token_urlsafe(24)

    # ---- subscription management
    def _validity_years(self):
        raw = self.env["ir.config_parameter"].sudo().get_param("disha_membership_card.validity_years")
        try:
            return min(max(int(raw), 1), 10) if raw else 2
        except ValueError:
            return 2

    def _add_term(self, years, kind, note=""):
        """Append a subscription term. A renewal continues from the current expiry (or today if already lapsed)."""
        self.ensure_one()
        today = fields.Date.context_today(self)
        start = today
        if kind == "renewal" and self.expiry_date and self.expiry_date >= today:
            start = self.expiry_date + relativedelta(days=1)
        end = start + relativedelta(years=years) - relativedelta(days=1)
        return self.env["disha.member.term"].create({
            "member_id": self.id, "kind": kind, "start_date": start, "end_date": end, "note": note or False})

    def action_renew(self, years=None, note=""):
        years = int(years or self._validity_years())
        if not 1 <= years <= 10:
            raise UserError(_("Renewal must be between 1 and 10 years."))
        for rec in self:
            if rec.status == "cancelled":
                raise UserError(_("%s is cancelled. Reactivate the member first.", rec.name))
            term = rec._add_term(years, "renewal", note)
            rec.message_post(body=_("Renewed for %(y)s year(s): valid until %(d)s.", y=years, d=term.end_date))
        return True

    def action_renew_1(self):
        return self.action_renew(1)

    def action_renew_2(self):
        return self.action_renew(2)

    def action_suspend(self):
        for rec in self:
            if rec.status != "active":
                raise UserError(_("Only an active member can be suspended."))
            rec.status = "suspended"
        return True

    def action_reactivate(self):
        for rec in self:
            if rec.status == "active":
                raise UserError(_("%s is already active.", rec.name))
            rec.status = "active"
        return True

    def action_cancel(self):
        for rec in self:
            if rec.status == "cancelled":
                raise UserError(_("%s is already cancelled.", rec.name))
            rec.status = "cancelled"
        return True

    # ---- ID card
    def _check_card_allowed(self):
        self.ensure_one()
        if self.status == "cancelled":
            raise UserError(_("A cancelled membership has no card."))
        self._ensure_card_token()

    def action_print_card(self):
        self.ensure_one()
        self._check_card_allowed()
        return self.env.ref(REPORT).report_action(self)

    def action_email_card(self):
        self.ensure_one()
        self._check_card_allowed()
        if not self.email:
            raise UserError(_("This member has no email address on file."))
        report = self.env.ref(REPORT)
        pdf_content, _fmt = report.sudo()._render_qweb_pdf(report, res_ids=[self.id])
        attachment = self.env["ir.attachment"].create({
            "name": "DISHA Membership Card - %s.pdf" % (self.member_number or self.name),
            "type": "binary", "datas": base64.b64encode(pdf_content),
            "res_model": self._name, "res_id": self.id, "mimetype": "application/pdf",
        })
        body_html = _(
            "<p>Dear %(name)s,</p>"
            "<p>Welcome to DISHA. Please find attached your Digital Membership Card (%(number)s).</p>"
            "<p>Scan the QR code on the back of the card to verify its status.</p>"
        ) % {"name": self.name, "number": self.member_number}
        self.env["mail.mail"].sudo().create({
            "subject": _("Your DISHA Digital Membership Card - %s") % self.member_number,
            "body_html": body_html, "email_to": self.email,
            "attachment_ids": [(6, 0, [attachment.id])], "auto_delete": False,
        }).send()
        self.message_post(body=_("Digital membership card emailed to %s.") % self.email)
        return True

    def _disha_card_qr_uri(self):
        """QR as an inline data URI (wkhtmltopdf cannot reliably fetch /report/barcode URLs from inside the server)."""
        self.ensure_one()
        if not self.card_verify_url:
            return False
        png = False
        try:  # preferred: pure-python `qrcode` (pip install qrcode)
            import qrcode
            buf = io.BytesIO()
            qr = qrcode.QRCode(border=1, box_size=10, error_correction=qrcode.constants.ERROR_CORRECT_M)
            qr.add_data(self.card_verify_url)
            qr.make(fit=True)
            qr.make_image(fill_color="black", back_color="white").save(buf, "PNG")
            png = buf.getvalue()
        except Exception:  # fall back to Odoo's reportlab barcode
            try:
                png = self.env["ir.actions.report"].barcode("QR", self.card_verify_url, width=400, height=400)
            except Exception:
                _logger.warning("QR code could not be generated; install the python package 'qrcode'", exc_info=True)
        return ("data:image/png;base64," + base64.b64encode(png).decode()) if png else False

    def _disha_card_info(self):
        icp = self.env["ir.config_parameter"].sudo()
        return {
            "logo": _logo_uri(),
            "org": icp.get_param("disha_membership_card.org_name") or ORG_NAME,
            "contact": icp.get_param("disha_membership_card.contact") or ORG_CONTACT,
        }

    def _disha_card_zoom(self):
        """wkhtmltopdf renders CSS millimetres at ~80%: compensate; tune with system parameter `disha_membership_card.zoom`."""
        raw = self.env["ir.config_parameter"].sudo().get_param("disha_membership_card.zoom")
        try:
            zoom = float(raw) if raw else 1.27
        except ValueError:
            zoom = 1.27
        return min(max(zoom, 0.5), 2.0)


class DishaMemberTerm(models.Model):
    _name = "disha.member.term"
    _description = "DISHA Member Subscription Term"
    _order = "end_date desc, id desc"

    member_id = fields.Many2one("disha.member", required=True, ondelete="cascade", index=True)
    kind = fields.Selection([("new", "New membership"), ("renewal", "Renewal")], default="new", required=True)
    start_date = fields.Date(required=True)
    end_date = fields.Date(required=True)
    note = fields.Char()
    user_id = fields.Many2one("res.users", string="By", default=lambda self: self.env.user, readonly=True)

    @api.constrains("start_date", "end_date")
    def _check_dates(self):
        for rec in self:
            if rec.end_date < rec.start_date:
                raise ValidationError(_("The end date cannot be before the start date."))
