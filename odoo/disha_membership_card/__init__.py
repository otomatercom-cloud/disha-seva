from . import models


def post_init_hook(env):
    """Brand the member / membership numbers (ASM/2026/00001 -> DISHA/2026/00001) unless already customised."""
    for xmlid, stock, new in (
        ("association_membership.seq_association_member", "ASM/%(year)s/", "DISHA/%(year)s/"),
        ("association_membership.seq_association_membership", "ASM-MEM-%(year)s-", "DISHA-MS-%(year)s-"),
        ("association_membership.seq_association_membership_application", "APP/%(year)s/", "DISHA-APP/%(year)s/"),
    ):
        seq = env.ref(xmlid, raise_if_not_found=False)
        if seq and seq.prefix == stock:
            seq.sudo().prefix = new
