"""Emergent managed Resend email — async, non-blocking, with the mandatory
guardrail gate applied on every send. Bodies come from server-side templates only."""
import os
import re
import ipaddress
import logging
import httpx
from html import escape
from html.parser import HTMLParser
from urllib.parse import urlparse

logger = logging.getLogger("salesmind.email")

EMAIL_BASE_URL = "https://integrations.emergentagent.com"
EMAIL_KEY = os.environ.get("EMERGENT_EMAIL_KEY")
EMAIL_FROM_NAME = os.environ.get("EMAIL_FROM_NAME", "SalesMind")
EMAIL_REPLY_TO = os.environ.get("EMAIL_REPLY_TO")

_SHORTENERS = ("bit.ly", "tinyurl.com", "t.co", "is.gd", "cutt.ly", "goo.gl", "rebrand.ly")
_CRED_ASK = ("reply with your password", "reply with the code", "send your password", "cvv",
             "send us your password", "enter your password below", "confirm your card number",
             "your full card number", "seed phrase", "recovery phrase", "verify your card",
             "social security number", "confirm your bank details")
_HOSTISH = re.compile(r"\b(?:https?://)?((?:[a-z0-9-]+\.)+[a-z]{2,})", re.I)


def _host_ok(host: str) -> bool:
    if not host or "xn--" in host:
        return False
    try:
        ipaddress.ip_address(host)
        return False
    except ValueError:
        pass
    return not any(host == s or host.endswith("." + s) for s in _SHORTENERS)


def _same_site(shown: str, real: str) -> bool:
    return shown == real or real.endswith("." + shown) or shown.endswith("." + real)


class _EmailScan(HTMLParser):
    def __init__(self):
        super().__init__()
        self.tags, self.urls, self.anchors = set(), [], []
        self._href, self._text = None, []

    def handle_starttag(self, tag, attrs):
        self.tags.add(tag.lower())
        self.urls += [v for k, v in attrs if k.lower() in ("href", "src") and v]
        if tag.lower() == "a":
            self._href = dict((k.lower(), v) for k, v in attrs).get("href")
            self._text = []

    def handle_data(self, data):
        if self._href is not None:
            self._text.append(data)

    def handle_endtag(self, tag):
        if tag.lower() == "a" and self._href is not None:
            self.anchors.append((self._href, "".join(self._text)))
            self._href, self._text = None, []


def _assert_safe_email(subject: str, html: str) -> None:
    scan = _EmailScan()
    scan.feed(html)
    if scan.tags & {"form", "input", "textarea", "select"}:
        raise ValueError("No forms or input fields in email (G2)")
    body = f"{subject}\n{html}".lower()
    for p in _CRED_ASK:
        if p in body:
            raise ValueError(f"Email asks the recipient for credentials: {p!r} (G2)")
    for url in scan.urls:
        low = url.strip().lower()
        if low.startswith(("mailto:", "tel:", "cid:", "#")):
            continue
        if not (low.startswith("https://") or low.startswith("http://localhost") or low.startswith("http://127.0.0.1")):
            raise ValueError(f"Email links/assets must be absolute https: {url!r} (G3)")
        host = urlparse(low).hostname or ""
        if host not in ("localhost", "127.0.0.1") and (not _host_ok(host) or urlparse(low).username is not None):
            raise ValueError(f"Shortened, numeric-host or credential-bearing URL: {url!r} (G3)")
    for href, text in scan.anchors:
        real = urlparse(href.strip().lower()).hostname or ""
        if not real or real in ("localhost", "127.0.0.1"):
            continue
        for m in _HOSTISH.finditer(text):
            if not _same_site(m.group(1).lower(), real):
                raise ValueError(f"Anchor text {m.group(1)!r} != real link host {real!r} (G3)")


async def send_email(*, to: str, subject: str, html: str, reply_to: str = None) -> str:
    _assert_safe_email(subject, html)
    payload = {"to": [to], "subject": subject, "html": html, "from_name": EMAIL_FROM_NAME}
    if reply_to or EMAIL_REPLY_TO:
        payload["contact_email"] = reply_to or EMAIL_REPLY_TO
    
    email_key = os.environ.get("EMERGENT_EMAIL_KEY")
    if not email_key:
        import uuid
        simulated_id = f"sim-{uuid.uuid4().hex[:12]}"
        logger.info(f"[Email Service - Local Mode] Simulated email to {to} (id: {simulated_id}): {subject}")
        return simulated_id

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            f"{EMAIL_BASE_URL}/api/v1/email/send",
            headers={"X-Email-Key": email_key},
            json=payload,
        )
    if resp.status_code >= 400:
        detail = f"Email delivery failed ({resp.status_code})"
        try:
            j = resp.json()
            detail = j.get("message") or j.get("error") or detail
        except Exception:
            pass
        logger.error(f"Email send failed: {resp.status_code} {resp.text}")
        raise ValueError(detail)
    return resp.json().get("id")


def _shell(inner: str) -> str:
    return (
        '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" '
        'style="background:#F9F8F6;padding:32px 0;font-family:Arial,Helvetica,sans-serif">'
        '<tr><td align="center">'
        '<table role="presentation" width="480" cellpadding="0" cellspacing="0" '
        'style="background:#ffffff;border:1px solid #E5E2DC;border-radius:4px;overflow:hidden">'
        '<tr><td style="background:#1A1918;padding:20px 28px">'
        '<span style="color:#F05D48;font-size:18px;font-weight:700">●</span> '
        '<span style="color:#E6E4DF;font-size:18px;font-weight:700;letter-spacing:-0.3px">SalesMind</span>'
        '</td></tr>'
        f'<tr><td style="padding:28px">{inner}</td></tr>'
        '<tr><td style="padding:16px 28px;background:#F2F0EB;border-top:1px solid #E5E2DC">'
        '<p style="margin:0;font-size:12px;color:#73706A">Sent by SalesMind. '
        'We never ask for your password or payment details by email.</p>'
        '</td></tr></table></td></tr></table>'
    )


def invite_email_html(inviter_name: str, workspace_name: str, role: str, accept_url: str) -> str:
    inner = (
        f'<h1 style="margin:0 0 12px;font-size:22px;color:#2C2B29">You\'re invited to {escape(workspace_name)}</h1>'
        f'<p style="margin:0 0 16px;font-size:15px;color:#2C2B29;line-height:1.6">'
        f'{escape(inviter_name)} invited you to join their SalesMind workspace as a '
        f'<strong>{escape(role)}</strong>.</p>'
        f'<p style="margin:0 0 24px;font-size:15px;color:#2C2B29;line-height:1.6">'
        f'Click below to set your password and get started.</p>'
        f'<a href="{escape(accept_url)}" style="display:inline-block;background:#F05D48;color:#ffffff;'
        f'text-decoration:none;font-size:15px;font-weight:600;padding:12px 24px;border-radius:3px">'
        f'Accept invitation</a>'
        f'<p style="margin:24px 0 0;font-size:13px;color:#73706A">This invitation link expires in 7 days.</p>'
    )
    return _shell(inner)


def sequence_email_html(body_text: str) -> str:
    safe = escape(body_text).replace("\n", "<br>")
    inner = f'<div style="font-size:15px;color:#2C2B29;line-height:1.7">{safe}</div>'
    return _shell(inner)
