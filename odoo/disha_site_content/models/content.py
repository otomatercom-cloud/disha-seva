import base64

from odoo import _, api, fields, models
from odoo.exceptions import UserError, ValidationError

from ._collections import COLLECTIONS, ICONS

MAX_IMAGE = 8 * 1024 * 1024
MAX_FILE = 15 * 1024 * 1024


def _image_ok(raw):
    # jpeg / png / webp / gif only. SVG is refused on purpose (script injection).
    return (raw[:3] == b"\xff\xd8\xff" or raw[:8] == b"\x89PNG\r\n\x1a\n"
            or raw[:6] in (b"GIF87a", b"GIF89a") or (raw[:4] == b"RIFF" and raw[8:12] == b"WEBP"))


def check_image(value):
    if not value:
        return
    raw = base64.b64decode(value)
    if len(raw) > MAX_IMAGE:
        raise ValidationError(_("Image is larger than 8 MB."))
    if not _image_ok(raw):
        raise ValidationError(_("Upload a JPG, PNG, WebP or GIF image (SVG is not allowed)."))


class DishaSiteText(models.Model):
    _name = "disha.site.text"
    _description = "Website text / image"
    _order = "page, sequence, id"
    _rec_name = "label"

    _key_uniq = models.Constraint("unique(key)", "Content key must be unique.")

    key = fields.Char(required=True, index=True, readonly=True, copy=False)
    page = fields.Char(required=True, index=True, readonly=True)
    label = fields.Char(required=True, readonly=True, help="What this text is on the website")
    kind = fields.Selection(
        [("line", "One line"), ("text", "Paragraph"), ("long", "Long text"), ("image", "Image")],
        required=True, default="line", readonly=True)
    value = fields.Text(help="Shown on the website. Leave empty to use the built-in default text.")
    default_value = fields.Text(readonly=True)
    image = fields.Image(max_width=2000, max_height=2000)
    sequence = fields.Integer(default=10)
    is_changed = fields.Boolean(compute="_compute_is_changed", store=True)

    @api.depends("value", "default_value", "image", "kind")
    def _compute_is_changed(self):
        for rec in self:
            rec.is_changed = bool(rec.image) if rec.kind == "image" else (rec.value or "") != (rec.default_value or "")

    @api.constrains("image")
    def _check_image(self):
        for rec in self:
            check_image(rec.image)

    @api.constrains("value", "kind")
    def _check_value(self):
        for rec in self:
            if rec.value and len(rec.value) > (20000 if rec.kind == "long" else 2000):
                raise ValidationError(_("'%s' is too long.", rec.label))

    def action_reset(self):
        for rec in self:
            rec.write({"value": rec.default_value, "image": False})


class DishaSiteItem(models.Model):
    _name = "disha.site.item"
    _description = "Website list item"
    _order = "collection, sequence, id"

    collection = fields.Selection(COLLECTIONS, required=True, index=True)
    title = fields.Char(required=True, translate=False)
    text = fields.Text()
    icon = fields.Selection(ICONS)
    image = fields.Image(max_width=2000, max_height=2000, help="Gallery photo")
    file = fields.Binary(attachment=True, help="Optional PDF for reports")
    file_name = fields.Char()
    sequence = fields.Integer(default=10)
    published = fields.Boolean(default=True)

    @api.constrains("image")
    def _check_image(self):
        for rec in self:
            check_image(rec.image)

    @api.constrains("file")
    def _check_file(self):
        for rec in self:
            if rec.file:
                raw = base64.b64decode(rec.file)
                if len(raw) > MAX_FILE:
                    raise ValidationError(_("File is larger than 15 MB."))
                if raw[:5] != b"%PDF-":
                    raise ValidationError(_("Only PDF files can be attached."))

    @api.constrains("collection", "image")
    def _check_gallery(self):
        for rec in self:
            if rec.collection == "gallery" and not rec.image:
                raise UserError(_("A gallery item needs a photo."))
