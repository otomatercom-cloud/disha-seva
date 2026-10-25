import hashlib
import logging
import re
import secrets
from datetime import timedelta

from odoo import _, api, fields, models
from odoo.exceptions import UserError

_logger = logging.getLogger(__name__)

CTRL_RE = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]{2,}$")
PHONE_RE = re.compile(r"^\+?[0-9][0-9\s\-()]{6,19}$")
# No 0/O/1/I/L so a token can be read out over the phone
TOKEN_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"
TOKEN_RE = re.compile(r"^[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$")

CATEGORIES = [
    ("visa", "Visa"), ("iqama", "Iqama / Residency"), ("passport", "Passport / Consular"),
    ("labour", "Employer / Wages / Labour"), ("medical", "Medical"), ("education", "Education"),
    ("legal", "Legal"), ("travel", "Travel / Tickets"), ("emergency", "Emergency / Distress"),
    ("other", "Other"),
]
URGENCY = [("low", "Not urgent"), ("normal", "Normal"), ("high", "Urgent"), ("emergency", "Emergency")]
PRIORITIES = [("0", "Low"), ("1", "Normal"), ("2", "High"), ("3", "Critical")]
STATES = [
    ("new", "New"), ("in_progress", "In Progress"), ("waiting_user", "Waiting for Requester"),
    ("resolved", "Resolved"), ("closed", "Closed"),
]
# requester urgency -> base priority; some categories never start below a floor
URGENCY_PRIORITY = {"low": 0, "normal": 1, "high": 2, "emergency": 3}
CATEGORY_FLOOR = {"emergency": 3, "medical": 2, "legal": 1, "labour": 1}
SLA_HOURS = {"0": 168, "1": 72, "2": 24, "3": 4}
TEXT_LIMITS = {"requester_name": (120, True), "city": (80, False), "subject": (150, True), "description": (4000, True)}


def hash_token(token):
    return hashlib.sha256((token or "").strip().upper().encode()).hexdigest()


def new_token():
    raw = "".join(secrets.choice(TOKEN_ALPHABET) for _ in range(12))
    return f"{raw[:4]}-{raw[4:8]}-{raw[8:]}"


class DishaSupportTicket(models.Model):
    _name = "disha.support.ticket"
    _description = "DISHA Support Ticket"
    _inherit = ["mail.thread", "mail.activity.mixin"]
    _order = "priority desc, create_date desc, id desc"

    _token_uniq = models.Constraint("unique(token_hash)", "Token collision, please retry.")
    _idem_uniq = models.Constraint("unique(idempotency_key)", "Duplicate submission.")

    name = fields.Char("Ticket", readonly=True, copy=False, default=lambda s: _("New"), index=True)
    token_hash = fields.Char(readonly=True, copy=False, index=True, groups="base.group_system")
    requester_name = fields.Char(required=True, tracking=True)
    email = fields.Char(required=True)
    mobile = fields.Char(required=True)
    city = fields.Char()
    category = fields.Selection(CATEGORIES, required=True, default="other", tracking=True)
    urgency = fields.Selection(URGENCY, string="Requester's urgency", default="normal", readonly=True)
    priority = fields.Selection(PRIORITIES, default="1", tracking=True, index=True)
    subject = fields.Char(required=True)
    description = fields.Text(required=True)
    state = fields.Selection(STATES, default="new", required=True, tracking=True, index=True)
    user_id = fields.Many2one("res.users", string="Assigned to", tracking=True,
                              domain=lambda s: [("group_ids", "in", s.env.ref("disha_support_ticket.group_disha_support_user").id)])
    deadline = fields.Datetime(compute="_compute_deadline", store=True)
    is_overdue = fields.Boolean(compute="_compute_overdue", search="_search_overdue")
    message_ids_public = fields.One2many("disha.support.message", "ticket_id", string="Conversation")
    source = fields.Selection([("website", "Website"), ("manual", "Manual")], default="manual", readonly=True)
    idempotency_key = fields.Char(copy=False, index=True)
    resolved_date = fields.Datetime(readonly=True, copy=False)

    # ------------------------------------------------------------------ computes / lifecycle
    @api.depends("priority", "create_date")
    def _compute_deadline(self):
        for rec in self:
            base = rec.create_date or fields.Datetime.now()
            rec.deadline = base + timedelta(hours=SLA_HOURS.get(rec.priority or "1", 72))

    @api.depends("deadline", "state")
    def _compute_overdue(self):
        now = fields.Datetime.now()
        for rec in self:
            rec.is_overdue = bool(rec.deadline and rec.deadline < now and rec.state not in ("resolved", "closed"))

    def _search_overdue(self, operator, value):
        # a non-stored computed field must provide its own search (Odoo 19 rule)
        positive = (operator == "=") == bool(value)
        domain = [("deadline", "<", fields.Datetime.now()), ("state", "not in", ("resolved", "closed"))]
        return domain if positive else [("id", "not in", self.search(domain).ids)]

    @api.model_create_multi
    def create(self, vals_list):
        for vals in vals_list:
            if vals.get("name", _("New")) == _("New"):
                vals["name"] = self.env["ir.sequence"].sudo().next_by_code("disha.support.ticket") or _("New")
        return super().create(vals_list)

    def action_start(self):
        self.write({"state": "in_progress", "user_id": self.env.uid})

    def action_wait(self):
        self.write({"state": "waiting_user"})

    def action_resolve(self):
        self.write({"state": "resolved", "resolved_date": fields.Datetime.now()})

    def action_close(self):
        self.write({"state": "closed"})

    def action_reopen(self):
        self.write({"state": "in_progress", "resolved_date": False})

    # ------------------------------------------------------------------ website API
    @api.model
    def _clean(self, value):
        return CTRL_RE.sub("", str(value)).strip() if value is not None else ""

    @api.model
    def _compute_priority(self, category, urgency):
        return str(max(URGENCY_PRIORITY.get(urgency, 1), CATEGORY_FLOOR.get(category, 0)))

    @api.model
    def _clean_payload(self, payload):
        vals, errors = {}, {}
        if not isinstance(payload, dict):
            return {}, {"_": "Invalid payload."}
        for fname, (maxlen, required) in TEXT_LIMITS.items():
            raw = payload.get(fname)
            if raw is not None and not isinstance(raw, (str, int, float)):
                errors[fname] = "Invalid value."
                continue
            text = self._clean(raw)
            if required and not text:
                errors[fname] = "This field is required."
            elif len(text) > maxlen:
                errors[fname] = f"Maximum {maxlen} characters."
            elif text:
                vals[fname] = text
        email = self._clean(payload.get("email")).lower()
        if not email or len(email) > 254 or not EMAIL_RE.match(email):
            errors["email"] = "Enter a valid email address."
        else:
            vals["email"] = email
        mobile = self._clean(payload.get("mobile"))
        if not PHONE_RE.match(mobile):
            errors["mobile"] = "Enter a valid phone number."
        else:
            vals["mobile"] = mobile
        category = self._clean(payload.get("category"))
        if category not in dict(CATEGORIES):
            errors["category"] = "Choose a category."
        urgency = self._clean(payload.get("urgency")) or "normal"
        if urgency not in dict(URGENCY):
            errors["urgency"] = "Invalid choice."
        if payload.get("consent") is not True:
            errors["consent"] = "Please confirm that we may contact you about this request."
        if not errors:
            vals.update(category=category, urgency=urgency, priority=self._compute_priority(category, urgency))
        return vals, errors

    @api.model
    def create_from_website(self, payload, idempotency_key=None):
        """Never raises on bad input. Returns {'ok', 'reference', 'token'} (token only on first creation)
        or {'ok': False, 'errors': {...}}."""
        tickets = self.sudo()
        if idempotency_key:
            existing = tickets.search([("idempotency_key", "=", idempotency_key)], limit=1)
            if existing:
                return {"ok": True, "reference": existing.name, "token": None, "replayed": True}
        vals, errors = tickets._clean_payload(payload)
        if errors:
            return {"ok": False, "errors": errors}
        token = new_token()
        vals.update(token_hash=hash_token(token), source="website", state="new",
                    idempotency_key=idempotency_key or False)
        record = tickets.create(vals)
        record.message_post(body=_("Ticket received from the website."), message_type="comment",
                            subtype_xmlid="mail.mt_note")
        return {"ok": True, "reference": record.name, "token": token, "replayed": False,
                "priority": dict(PRIORITIES)[record.priority]}

    @api.model
    def _find_by_token(self, token):
        token = self._clean(token).upper()
        if not TOKEN_RE.match(token):
            return self.browse()
        return self.sudo().search([("token_hash", "=", hash_token(token))], limit=1)

    def _public_view(self):
        self.ensure_one()
        msgs = [{
            "author": "You" if m.author_type == "requester" else "DISHA Support Team",
            "body": m.body, "date": fields.Datetime.to_string(m.create_date),
        } for m in self.message_ids_public.filtered("is_public").sorted("id")]
        return {
            "reference": self.name, "subject": self.subject, "category": dict(CATEGORIES)[self.category],
            "status": dict(STATES)[self.state], "status_code": self.state,
            "priority": dict(PRIORITIES)[self.priority],
            "created": fields.Datetime.to_string(self.create_date),
            "updated": fields.Datetime.to_string(self.write_date),
            "description": self.description, "messages": msgs,
            "can_reply": self.state != "closed",
        }

    @api.model
    def lookup_by_token(self, token):
        rec = self._find_by_token(token)
        return {"ok": True, "ticket": rec._public_view()} if rec else {"ok": False, "error": "not_found"}

    @api.model
    def reply_by_token(self, token, message):
        rec = self._find_by_token(token)
        if not rec:
            return {"ok": False, "error": "not_found"}
        text = self._clean(message)
        if not text or len(text) > 4000:
            return {"ok": False, "errors": {"message": "Write a message of up to 4000 characters."}}
        if rec.state == "closed":
            return {"ok": False, "error": "closed"}
        self.env["disha.support.message"].sudo().create(
            {"ticket_id": rec.id, "author_type": "requester", "body": text})
        return {"ok": True, "ticket": rec._public_view()}

    # ------------------------------------------------------------------ notifications
    def _notify_requester(self, body):
        """Best-effort email; never blocks the staff reply."""
        self.ensure_one()
        base = self.env["ir.config_parameter"].sudo().get_param("disha_support_ticket.site_url") or ""
        link = f"{base.rstrip('/')}/support/track" if base else ""
        html = (f"<p>Dear {self.requester_name},</p><p>There is an update on your DISHA support request "
                f"<b>{self.name}</b> ({self.subject}).</p>"
                + (f"<p>Open <a href='{link}'>{link}</a> and enter your tracking token to read it.</p>" if link
                   else "<p>Open the DISHA website Support page and enter your tracking token to read it.</p>")
                + "<p>India Overseas Forum Support Team</p>")
        try:
            with self.env.cr.savepoint():
                self.env["mail.mail"].sudo().create({
                    "subject": f"Update on your request {self.name}", "body_html": html,
                    "email_to": self.email, "auto_delete": True}).send()
        except Exception:
            _logger.warning("Support notification failed for %s", self.name, exc_info=True)


class DishaSupportMessage(models.Model):
    _name = "disha.support.message"
    _description = "DISHA Support Ticket Message"
    _order = "id"

    ticket_id = fields.Many2one("disha.support.ticket", required=True, ondelete="cascade", index=True)
    author_type = fields.Selection([("staff", "DISHA Team"), ("requester", "Requester")], default="staff", required=True)
    body = fields.Text(required=True)
    is_public = fields.Boolean("Visible to requester", default=True,
                               help="Untick for an internal note the requester never sees.")

    @api.model_create_multi
    def create(self, vals_list):
        records = super().create(vals_list)
        for rec in records:
            ticket = rec.ticket_id.sudo()
            if rec.author_type == "staff":
                if ticket.state == "new":
                    ticket.state = "in_progress"
                if rec.is_public:
                    ticket._notify_requester(rec.body)
            else:
                if ticket.state in ("waiting_user", "resolved"):
                    ticket.write({"state": "in_progress", "resolved_date": False})
                ticket.message_post(body=_("Requester replied: %s", rec.body), message_type="comment",
                                    subtype_xmlid="mail.mt_note")
        return records
