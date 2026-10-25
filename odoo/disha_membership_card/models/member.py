import base64
import io
import logging

from odoo import _, api, fields, models
from odoo.exceptions import UserError
from odoo.tools import file_open

_logger = logging.getLogger(__name__)
ORG_NAME = "DISHA"
ORG_CONTACT = "dishaindians@gmail.com"


def _logo_uri():
    try:
        with file_open("disha_membership_card/static/img/logo.png", "rb") as fh:
            return "data:image/png;base64," + base64.b64encode(fh.read()).decode()
    except Exception:
        return ""


DISHA_TYPE_CODES = ("DISHA-GEN", "DISHA-ASC")
DISHA_REPORT = "disha_membership_card.action_report_disha_card"


class AssociationMember(models.Model):
    _inherit = "association.member"

    def _is_disha(self):
        self.ensure_one()
        return self.membership_type_id.code in DISHA_TYPE_CODES

    @api.model_create_multi
    def create(self, vals_list):
        """DISHA members get their own number series; every other member keeps the stock ASM/ number."""
        disha_ids = set(self.env["association.membership.type"].sudo().search(
            [("code", "in", DISHA_TYPE_CODES)]).ids)
        for vals in vals_list:
            if vals.get("membership_type_id") in disha_ids and vals.get("member_number", "New") in ("New", False, ""):
                vals["member_number"] = self.env["ir.sequence"].sudo().next_by_code("disha.association.member") or "New"
        return super().create(vals_list)

    def action_print_card(self):
        self.ensure_one()
        if not self._is_disha():
            return super().action_print_card()
        if not self.digital_card_enabled:
            raise UserError(_("Digital card is not enabled for this membership type."))
        if self.status not in ("active", "suspended", "expired"):
            raise UserError(_("A digital card can only be issued once the member has an active membership."))
        self._ensure_card_token()
        return self.env.ref(DISHA_REPORT).report_action(self)

    def action_email_card(self):
        self.ensure_one()
        if not self._is_disha():
            return super().action_email_card()
        if not self.digital_card_enabled:
            raise UserError(_("Digital card is not enabled for this membership type."))
        if self.status not in ("active", "suspended", "expired"):
            raise UserError(_("A digital card can only be issued once the member has an active membership."))
        if not self.partner_id.email:
            raise UserError(_("This member's contact has no email address on file."))
        self._ensure_card_token()
        report = self.env.ref(DISHA_REPORT)
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
            "body_html": body_html, "email_to": self.partner_id.email,
            "attachment_ids": [(6, 0, [attachment.id])], "auto_delete": False,
        }).send()
        self.message_post(body=_("Digital membership card emailed to %s.") % self.partner_id.email)
        return True

    def _disha_card_qr_uri(self):
        """QR as an inline data URI. wkhtmltopdf cannot reliably fetch /report/barcode URLs from
        inside the server (blank QR on the card), so the image is rendered here and embedded."""
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
        except Exception:  # fall back to Odoo's reportlab barcode (needs a renderPM backend)
            try:
                png = self.env["ir.actions.report"].barcode("QR", self.card_verify_url, width=400, height=400)
            except Exception:
                _logger.warning("QR code could not be generated; install the python package 'qrcode'", exc_info=True)
        return ("data:image/png;base64," + base64.b64encode(png).decode()) if png else False

    def _disha_card_info(self):
        """Branding text, overridable with system parameters (disha_membership_card.org_name / .contact)."""
        icp = self.env["ir.config_parameter"].sudo()
        return {
            "logo": _logo_uri(),
            "org": icp.get_param("disha_membership_card.org_name") or ORG_NAME,
            "contact": icp.get_param("disha_membership_card.contact") or ORG_CONTACT,
        }

    def _disha_card_zoom(self):
        """wkhtmltopdf renders CSS millimetres at ~80% on both patched and unpatched Qt builds, which left the
        card small on its page (white strip on the right/bottom). Compensate; tune per server with the system
        parameter `disha_membership_card.zoom` (e.g. 1.25 if white remains, 1.0 to disable)."""
        raw = self.env["ir.config_parameter"].sudo().get_param("disha_membership_card.zoom")
        try:
            zoom = float(raw) if raw else 1.27
        except ValueError:
            zoom = 1.27
        return min(max(zoom, 0.5), 2.0)
