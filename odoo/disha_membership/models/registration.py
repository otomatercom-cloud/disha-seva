import re
from datetime import date

from odoo import api, fields, models, _

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
PHONE_RE = re.compile(r"^\+?[0-9][0-9\s\-()]{6,19}$")
PIN_RE = re.compile(r"^[1-9][0-9]{5}$")
CTRL_RE = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f]")

CATEGORIES = [("general", "General"), ("associate", "Associate")]
GENDERS = [("male", "Male"), ("female", "Female"), ("other", "Other")]
BLOOD_GROUPS = [(g, g) for g in ("A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-")]

# Provinces members choose from (12). Events target one of these (see disha_site_content / disha_event_notify).
KSA_REGIONS = [
    ("central", "Central Province"),
    ("western", "Western Province"),
    ("eastern", "Eastern Province"),
    ("northern", "Northern Province"),
    ("southern", "Southern Province"),
]

# field -> (max length, required)   Numbers refer to the DISHA paper form.
TEXT_FIELDS = {
    "full_name": (120, True),             # 1
    "nationality": (80, True),            # 4
    "qualification": (120, False),        # 9
    "occupation": (120, False),           # 10
    "organization": (120, False),         # 11
    "ksa_city": (80, True),               # 13
    "iqama_number": (20, False),          # 14
    "passport_number": (20, True),        # 15
    "india_state": (80, True),            # 16
    "india_district": (80, True),         # 17
    "india_village": (120, True),         # 18
    "india_address": (500, True),         # 20
    "ksa_emergency_name": (120, True),    # 21
    "ksa_emergency_relationship": (80, True),
    "india_emergency_name": (120, True),  # 22
    "india_emergency_relationship": (80, True),
    "why_join": (1000, False),
}


class DishaMembershipApplication(models.Model):
    _name = "disha.membership.application"
    _description = "DISHA Membership Application"
    _inherit = ["mail.thread", "mail.activity.mixin"]
    _order = "registration_date desc, id desc"

    name = fields.Char(string="Application No.", readonly=True, copy=False, index=True,
                       default=lambda self: _("New"))
    state = fields.Selection(
        [("new", "New"), ("under_review", "Under Review"), ("contacted", "Contacted"),
         ("approved", "Approved"), ("rejected", "Rejected")],
        string="Status", default="new", required=True, tracking=True, index=True, copy=False)
    registration_date = fields.Datetime(string="Applied On", default=fields.Datetime.now,
                                        readonly=True, index=True, copy=False)
    source = fields.Selection([("website", "Website"), ("manual", "Manual Entry")],
                              default="manual", required=True)
    idempotency_key = fields.Char(copy=False, index=True, readonly=True)
    category = fields.Selection(CATEGORIES, string="Membership Category", required=True,
                                default="general", tracking=True, index=True)

    # 1. Personal information
    full_name = fields.Char(string="Full Name (as in passport)", required=True, tracking=True, index=True)
    gender = fields.Selection(GENDERS)
    date_of_birth = fields.Date()
    nationality = fields.Char(default="Indian")
    mobile = fields.Char(string="Mobile Number", required=True, tracking=True, index=True)
    whatsapp = fields.Char(string="WhatsApp Number")
    email = fields.Char(string="Email Address", required=True, tracking=True, index=True)
    blood_group = fields.Selection(BLOOD_GROUPS)
    qualification = fields.Char(string="Educational Qualification")
    occupation = fields.Char(string="Profession / Occupation")
    organization = fields.Char(string="Employer / Organization")
    ksa_region = fields.Selection(KSA_REGIONS, string="Province / Region in KSA", index=True)
    ksa_city = fields.Char(string="City / Area in KSA", index=True)
    iqama_number = fields.Char(string="Iqama Number", groups="disha_membership.group_disha_membership_manager")
    passport_number = fields.Char(string="Passport Number", groups="disha_membership.group_disha_membership_manager")

    # 2. Permanent address in India
    india_state = fields.Char(string="State")
    india_district = fields.Char(string="District")
    india_village = fields.Char(string="Village / Town")
    india_pin = fields.Char(string="PIN Code")
    india_address = fields.Text(string="Full Address in India")

    # 3. Emergency contacts
    ksa_emergency_name = fields.Char(string="Emergency Contact in KSA - Name")
    ksa_emergency_relationship = fields.Char(string="Relationship (KSA contact)")
    ksa_emergency_phone = fields.Char(string="Emergency Contact in KSA - Mobile")
    india_emergency_name = fields.Char(string="Emergency Contact in India - Name")
    india_emergency_relationship = fields.Char(string="Relationship (India contact)")
    india_emergency_phone = fields.Char(string="Emergency Contact in India - Mobile")

    # 4. Declaration
    why_join = fields.Text(string="Why would you like to join?")
    consent_given = fields.Boolean(string="Declaration & Consent", tracking=True)
    consent_date = fields.Datetime(string="Consent Timestamp", readonly=True)

    # Office use
    approved_on = fields.Datetime(string="Date Approved", readonly=True, copy=False)
    approved_by_id = fields.Many2one("res.users", string="Approved By", readonly=True, copy=False)

    internal_notes = fields.Html(string="Internal Notes")
    duplicate_count = fields.Integer(compute="_compute_duplicate_count", string="Possible Duplicates")

    _idempotency_uniq = models.Constraint(
        "unique(idempotency_key)", "This submission was already registered.")

    # ------------------------------------------------------------------ compute
    def _compute_duplicate_count(self):
        for rec in self:
            if not rec.id:
                rec.duplicate_count = 0
                continue
            rec.duplicate_count = self.search_count([
                ("id", "!=", rec.id),
                "|", ("email", "=ilike", rec.email or "-"), ("mobile", "=", rec.mobile or "-"),
            ])

    @api.depends("name", "full_name")
    def _compute_display_name(self):
        for rec in self:
            rec.display_name = f"{rec.name} - {rec.full_name}" if rec.full_name else (rec.name or "")

    # ------------------------------------------------------------------ CRUD
    @api.model_create_multi
    def create(self, vals_list):
        for vals in vals_list:
            if not vals.get("name") or vals["name"] == _("New"):
                vals["name"] = (self.env["ir.sequence"].sudo()
                                .next_by_code("disha.membership.application") or _("New"))
            if vals.get("consent_given") and not vals.get("consent_date"):
                vals["consent_date"] = fields.Datetime.now()
        return super().create(vals_list)

    # ------------------------------------------------------------------ workflow
    def action_review(self):
        self.write({"state": "under_review"})

    def action_contact(self):
        self.write({"state": "contacted"})

    def action_approve(self):
        self.write({"state": "approved", "approved_on": fields.Datetime.now(),
                    "approved_by_id": self.env.user.id})

    def action_reject(self):
        self.write({"state": "rejected"})

    def action_reset(self):
        self.write({"state": "new"})

    # ------------------------------------------------------------------ website API
    @api.model
    def _clean_text(self, value):
        if value is None:
            return ""
        return CTRL_RE.sub("", str(value)).strip()

    @api.model
    def _clean_payload(self, payload):
        """Validate a website payload against a strict allowlist.

        Returns (vals, errors). Unknown keys are ignored, never written.
        """
        vals, errors = {}, {}
        if not isinstance(payload, dict):
            return {}, {"_": "Invalid payload."}

        for fname, (maxlen, required) in TEXT_FIELDS.items():
            raw = payload.get(fname)
            if raw is not None and not isinstance(raw, (str, int, float)):
                errors[fname] = "Invalid value."
                continue
            text = self._clean_text(raw)
            if required and not text:
                errors[fname] = "This field is required."
            elif len(text) > maxlen:
                errors[fname] = f"Maximum {maxlen} characters."
            elif text:
                vals[fname] = text

        def phone(fname, required=False):
            text = self._clean_text(payload.get(fname))
            if not text:
                if required:
                    errors[fname] = "This field is required."
            elif not PHONE_RE.match(text):
                errors[fname] = "Enter a valid phone number."
            else:
                vals[fname] = text

        phone("mobile", required=True)
        phone("whatsapp")
        phone("ksa_emergency_phone", required=True)
        phone("india_emergency_phone", required=True)

        email = self._clean_text(payload.get("email")).lower()
        if not email:
            errors["email"] = "This field is required."
        elif len(email) > 254 or not EMAIL_RE.match(email):
            errors["email"] = "Enter a valid email address."
        else:
            vals["email"] = email

        pin = self._clean_text(payload.get("india_pin")).replace(" ", "")
        if not pin:
            errors["india_pin"] = "This field is required."
        elif not PIN_RE.match(pin):
            errors["india_pin"] = "Enter a valid 6-digit PIN code."
        else:
            vals["india_pin"] = pin

        for fname, options, required in (("category", CATEGORIES, True), ("gender", GENDERS, True),
                                         ("blood_group", BLOOD_GROUPS, False)):
            text = self._clean_text(payload.get(fname))
            if not text:
                if required:
                    errors[fname] = "This field is required."
            elif text in dict(options):
                vals[fname] = text
            else:
                errors[fname] = "Invalid choice."

        region = self._clean_text(payload.get("ksa_region")).lower()
        if not region:
            errors["ksa_region"] = "This field is required."
        else:
            match = next((key for key, label in KSA_REGIONS if region in (key, label.lower())), None)
            if match:
                vals["ksa_region"] = match
            else:
                errors["ksa_region"] = "Invalid choice."

        dob = self._clean_text(payload.get("date_of_birth"))
        if not dob:
            errors["date_of_birth"] = "This field is required."
        else:
            try:
                parsed = date.fromisoformat(dob)
                today = fields.Date.context_today(self)
                if parsed >= today or parsed.year < today.year - 110:
                    raise ValueError
                vals["date_of_birth"] = parsed
            except ValueError:
                errors["date_of_birth"] = "Enter a valid date of birth."

        if payload.get("consent") is not True:
            errors["consent"] = "You must accept the declaration to apply."
        else:
            vals["consent_given"] = True
            vals["consent_date"] = fields.Datetime.now()

        return vals, errors

    @api.model
    def create_from_website(self, payload, idempotency_key=None):
        """Create a registration from the public website. Never raises on bad input.

        Returns {'ok', 'reference', 'replayed'} or {'ok': False, 'errors': {...}}.
        """
        registrations = self.sudo()
        if idempotency_key:
            existing = registrations.search([("idempotency_key", "=", idempotency_key)], limit=1)
            if existing:
                return {"ok": True, "reference": existing.name, "replayed": True}
        vals, errors = registrations._clean_payload(payload)
        if errors:
            return {"ok": False, "errors": errors}
        vals.update(source="website", state="new", idempotency_key=idempotency_key or False)
        record = registrations.create(vals)
        return {"ok": True, "reference": record.name, "replayed": False}
