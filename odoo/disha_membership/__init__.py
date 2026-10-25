import secrets

from . import controllers
from . import models

TOKEN_PARAM = "disha_membership.api_token"


def post_init_hook(env):
    """Generate the website API token once, on first install."""
    params = env["ir.config_parameter"].sudo()
    if not params.get_param(TOKEN_PARAM):
        params.set_param(TOKEN_PARAM, secrets.token_urlsafe(48))
