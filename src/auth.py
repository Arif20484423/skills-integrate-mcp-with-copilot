import base64
import hashlib
import hmac
import json
import os
import secrets
import time

from fastapi import HTTPException, Request

PASSWORD_ITERATIONS = 600_000
SESSION_DURATION_SECONDS = 8 * 60 * 60
SESSION_COOKIE_NAME = "teacher_session"
SESSION_SECRET = os.environ.get("SESSION_SECRET", "").encode() or secrets.token_bytes(32)


def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    password_hash = hashlib.pbkdf2_hmac(
        "sha256", password.encode(), salt.encode(), PASSWORD_ITERATIONS
    ).hex()
    return f"pbkdf2_sha256${PASSWORD_ITERATIONS}${salt}${password_hash}"


def verify_password(password: str, stored_hash: str) -> bool:
    try:
        algorithm, iterations, salt, expected_hash = stored_hash.split("$")
        if algorithm != "pbkdf2_sha256":
            return False
        iterations = int(iterations)
        if not 100_000 <= iterations <= 1_000_000:
            return False
        password_hash = hashlib.pbkdf2_hmac(
            "sha256", password.encode(), salt.encode(), iterations
        ).hex()
    except (AttributeError, TypeError, ValueError):
        return False
    return hmac.compare_digest(password_hash, expected_hash)


def create_session(username: str, now: int | None = None) -> str:
    expires_at = (int(time.time()) if now is None else now) + SESSION_DURATION_SECONDS
    payload = json.dumps(
        {"username": username, "expires_at": expires_at}, separators=(",", ":")
    ).encode()
    encoded_payload = base64.urlsafe_b64encode(payload).rstrip(b"=").decode()
    signature = hmac.new(
        SESSION_SECRET, encoded_payload.encode(), hashlib.sha256
    ).digest()
    encoded_signature = base64.urlsafe_b64encode(signature).rstrip(b"=").decode()
    return f"{encoded_payload}.{encoded_signature}"


def get_session_username(token: str | None, now: int | None = None) -> str | None:
    if not token:
        return None
    try:
        encoded_payload, encoded_signature = token.split(".")
        signature = base64.urlsafe_b64decode(
            encoded_signature + "=" * (-len(encoded_signature) % 4)
        )
        expected_signature = hmac.new(
            SESSION_SECRET, encoded_payload.encode(), hashlib.sha256
        ).digest()
        if not hmac.compare_digest(signature, expected_signature):
            return None
        payload = base64.urlsafe_b64decode(
            encoded_payload + "=" * (-len(encoded_payload) % 4)
        )
        session = json.loads(payload)
        if session["expires_at"] <= (int(time.time()) if now is None else now):
            return None
        username = session["username"]
        return username if isinstance(username, str) and username else None
    except (ValueError, KeyError, TypeError, json.JSONDecodeError):
        return None


def get_current_teacher(request: Request) -> str | None:
    return get_session_username(request.cookies.get(SESSION_COOKIE_NAME))


def require_teacher(request: Request) -> str:
    username = get_current_teacher(request)
    if username is None:
        raise HTTPException(status_code=401, detail="Teacher login required")
    return username
