from __future__ import annotations

import base64
import hashlib
import hmac
import json
import secrets
import time
from app.core.config import get_settings


def _b64url_encode(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).decode("utf-8").rstrip("=")


def _b64url_decode(value: str) -> bytes:
    padding = "=" * (-len(value) % 4)
    return base64.urlsafe_b64decode(value + padding)


def hash_password(password: str) -> str:
    iterations = 390000
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), iterations)
    return f"pbkdf2_sha256${iterations}${salt}${digest.hex()}"


def verify_password(password: str, hashed_password: str) -> bool:
    try:
        algorithm, iterations_str, salt, digest_hex = hashed_password.split("$", 3)
        if algorithm != "pbkdf2_sha256":
            return False
        iterations = int(iterations_str)
    except ValueError:
        return False

    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), iterations)
    return hmac.compare_digest(digest.hex(), digest_hex)


def create_access_token(user_id: str, email: str) -> str:
    settings = get_settings()
    payload = {
        "sub": user_id,
        "email": email,
        "exp": int(time.time()) + settings.access_token_expire_minutes * 60,
    }
    payload_b64 = _b64url_encode(json.dumps(payload, separators=(",", ":")).encode("utf-8"))
    signature = hmac.new(
        settings.secret_key.encode("utf-8"),
        payload_b64.encode("utf-8"),
        hashlib.sha256,
    ).digest()
    return f"{payload_b64}.{_b64url_encode(signature)}"


def decode_access_token(token: str) -> dict | None:
    settings = get_settings()
    try:
        payload_b64, signature_b64 = token.split(".", 1)
    except ValueError:
        return None

    expected_signature = hmac.new(
        settings.secret_key.encode("utf-8"),
        payload_b64.encode("utf-8"),
        hashlib.sha256,
    ).digest()
    actual_signature = _b64url_decode(signature_b64)
    if not hmac.compare_digest(expected_signature, actual_signature):
        return None

    try:
        payload = json.loads(_b64url_decode(payload_b64).decode("utf-8"))
    except Exception:
        return None

    if int(payload.get("exp", 0)) < int(time.time()):
        return None
    return payload
