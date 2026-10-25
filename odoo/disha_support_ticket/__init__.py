import secrets

from . import controllers, models

TOKEN_PARAM = "disha_support_ticket.api_token"


def post_init_hook(env):
    """Generate the API token on first install (never overwrite an existing one)."""
    icp = env["ir.config_parameter"].sudo()
    if not icp.get_param(TOKEN_PARAM):
        icp.set_param(TOKEN_PARAM, secrets.token_urlsafe(48))
