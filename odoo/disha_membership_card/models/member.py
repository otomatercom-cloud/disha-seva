import base64
import io
import logging

from odoo import api, fields, models
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


class AssociationMember(models.Model):
    _inherit = "association.member"

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
