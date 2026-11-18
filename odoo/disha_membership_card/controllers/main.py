from html import escape

from odoo import http
from odoo.http import request

PAGE = """<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><title>DISHA membership verification</title>
<style>body{{font-family:Arial,Helvetica,sans-serif;background:#f5f7f6;margin:0;padding:24px;color:#0c1b5e}}
.c{{max-width:420px;margin:40px auto;background:#fff;border-radius:16px;padding:28px;box-shadow:0 10px 30px rgba(0,0,0,.08)}}
h1{{font-size:20px;margin:0 0 4px}}.s{{display:inline-block;padding:4px 12px;border-radius:99px;font-weight:bold;font-size:13px}}
.ok{{background:#d1fae5;color:#065f46}}.bad{{background:#fee2e2;color:#991b1b}}.w{{background:#fef3c7;color:#92400e}}
dl{{display:grid;grid-template-columns:8rem 1fr;gap:6px;margin:18px 0 0;font-size:14px}}dt{{color:#6b7a90}}dd{{margin:0;font-weight:bold}}</style></head>
<body><div class="c">{body}</div></body></html>"""


class DishaVerify(http.Controller):

    @http.route("/disha/verify/<string:token>", type="http", auth="public", methods=["GET"], csrf=False, sitemap=False)
    def verify(self, token, **kw):
        member = request.env["disha.member"].sudo().search([("card_token", "=", token)], limit=1) if 20 <= len(token) <= 80 else None
        if not member:
            body = "<h1>Not found</h1><p>This card could not be verified.</p>"
            return request.make_response(PAGE.format(body=body), headers=[("Content-Type", "text/html; charset=utf-8"),
                                         ("X-Robots-Tag", "noindex"), ("Cache-Control", "no-store")], status=404)
        st = member.card_status
        cls = {"active": "ok", "expired": "bad", "cancelled": "bad", "suspended": "w"}[st]
        body = (f'<h1>DISHA membership</h1><span class="s {cls}">{escape(st.title())}</span><dl>'
                f"<dt>Name</dt><dd>{escape(member.name)}</dd><dt>Member ID</dt><dd>{escape(member.member_number or '')}</dd>"
                f"<dt>Valid until</dt><dd>{escape(str(member.expiry_date or '-'))}</dd></dl>")
        return request.make_response(PAGE.format(body=body), headers=[("Content-Type", "text/html; charset=utf-8"),
                                     ("X-Robots-Tag", "noindex"), ("Cache-Control", "no-store")])
