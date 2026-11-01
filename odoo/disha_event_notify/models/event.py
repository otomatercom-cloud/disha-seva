import re

from markupsafe import Markup

from odoo import _, api, fields, models
from odoo.exceptions import AccessError, UserError

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
CONTACT = "dishaindians@gmail.com"
MANAGER_GROUPS = ("disha_membership.group_disha_membership_manager", "disha_site_content.group_disha_site_manager")


class DishaSiteEvent(models.Model):
    _inherit = "disha.site.event"

    notified_on = fields.Datetime("Emailed on", readonly=True, copy=False)
    notified_by_id = fields.Many2one("res.users", "Emailed by", readonly=True, copy=False)
    notified_count = fields.Integer("Members emailed", readonly=True, copy=False)
    recipient_count = fields.Integer("Members in this province", compute="_compute_recipient_count")

    def _recipient_domain(self):
        self.ensure_one()
        domain = [("state", "=", "approved"), ("email", "!=", False)]
        if self.region != "all":
            domain.append(("ksa_region", "=", self.region))
        return domain

    def _recipient_emails(self):
        """Unique, valid addresses of approved members in the event's province (all provinces if 'all')."""
        self.ensure_one()
        apps = self.env["disha.membership.application"].sudo().search(self._recipient_domain())
        seen, out = set(), []
        for app in apps:
            mail = (app.email or "").strip().lower()
            if mail and EMAIL_RE.match(mail) and mail not in seen:
                seen.add(mail)
                out.append((mail, app.full_name or ""))
        return out

    @api.depends("region")
    def _compute_recipient_count(self):
        for rec in self:
            rec.recipient_count = len(rec._recipient_emails()) if rec.id else 0

    def _notify_body(self, name):
        self.ensure_one()
        region = dict(self._fields["region"].selection)[self.region]
        icp = self.env["ir.config_parameter"].sudo()
        contact = icp.get_param("disha_event_notify.contact") or CONTACT
        site = (icp.get_param("disha_event_notify.site_url") or "").strip()
        when = fields.Date.to_string(self.event_date)
        if self.end_date and self.end_date != self.event_date:
            when += " to " + fields.Date.to_string(self.end_date)
        rows = [(_("Date"), when), (_("Time"), self.time_text), (_("Place"), self.location),
                (_("Province"), region)]
        table = Markup("").join(
            Markup("<tr><td style='padding:2px 14px 2px 0;color:#555'><b>%s</b></td><td>%s</td></tr>") % (k, v)
            for k, v in rows if v)
        details = Markup("")
        if self.details:
            details = Markup("<p style='white-space:pre-line'>%s</p>") % self.details
        link = Markup("<p><a href='%s'>See all events on our website</a></p>") % site if site.startswith("http") else Markup("")
        return Markup(
            "<div style='font-family:Arial,sans-serif;font-size:15px;color:#222;max-width:560px'>"
            "<p>Dear %s,</p><p>DISHA invites you to:</p>"
            "<h2 style='color:#0c1b5e;margin:8px 0'>%s</h2><table>%s</table>%s%s"
            "<p style='color:#777;font-size:12px;margin-top:24px'>You are receiving this because you are an approved "
            "DISHA member (%s). To stop these emails, write to %s.</p></div>"
        ) % (name or _("member"), self.name, table, details, link, region, contact)

    def action_notify_members(self):
        user = self.env.user
        if not any(user.has_group(g) for g in MANAGER_GROUPS):
            raise AccessError(_("Only DISHA managers can email members."))
        resend = self.env.context.get("resend")
        total_sent = total_failed = 0
        for rec in self:
            if not rec.published:
                raise UserError(_("Publish the event first; hidden events are not emailed."))
            if (rec.end_date or rec.event_date) < fields.Date.context_today(rec):
                raise UserError(_("This event is already over."))
            if rec.notified_on and not resend:
                raise UserError(_("Members were already emailed on %s. Use 'Email again' to send it once more.",
                                  rec.notified_on))
            recipients = rec._recipient_emails()
            if not recipients:
                raise UserError(_("No approved members with an email address in this province."))
            subject = _("DISHA event: %(title)s (%(date)s)", title=rec.name, date=rec.event_date)
            mails = self.env["mail.mail"].sudo().create([{
                "subject": subject,
                "body_html": rec._notify_body(name),
                "email_to": mail,
                "auto_delete": True,
            } for mail, name in recipients])
            mails.send(raise_exception=False)
            failed = len(mails.exists().filtered(lambda m: m.state == "exception"))
            total_failed += failed
            total_sent += len(recipients) - failed
            rec.sudo().write({"notified_on": fields.Datetime.now(), "notified_by_id": user.id,
                              "notified_count": len(recipients) - failed})
        kind = "warning" if total_failed else "success"
        msg = _("%s members emailed.", total_sent)
        if total_failed:
            msg += " " + _("%s failed: check Settings > Technical > Emails and the outgoing mail server.", total_failed)
        return {"type": "ir.actions.client", "tag": "display_notification",
                "params": {"title": _("Event email"), "message": msg, "type": kind, "sticky": bool(total_failed)}}

    def action_notify_members_again(self):
        return self.with_context(resend=True).action_notify_members()
