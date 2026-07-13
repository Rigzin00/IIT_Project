import os
import secrets
import datetime
import urllib.parse
import logging

import jwt
import requests as http_requests
from flask import Blueprint, request, jsonify, redirect, current_app, make_response, session

from database import db
from utils.helpers import verify_admin, is_student_eligible
from utils.limiter import limiter

logger = logging.getLogger(__name__)

auth_bp = Blueprint('auth', __name__)

# ── Official IIT Delhi OAuth endpoints ────────────────────────────────────────
# These are fixed by IIT Delhi — do NOT move to .env or make them configurable.
# Source: IIT Delhi OAuth 2.0 documentation.
IITD_AUTHORIZE_URL = "https://oauth.iitd.ac.in/authorize.php"
IITD_TOKEN_URL     = "https://oauth.iitd.ac.in/token.php"
IITD_RESOURCE_URL  = "https://oauth.iitd.ac.in/resource.php"


# ── JWT / cookie helpers ──────────────────────────────────────────────────────

def _jwt_secret() -> str:
    return current_app.config.get("JWT_SECRET", "change-me")

def _jwt_expires_seconds() -> int:
    return int(current_app.config.get("JWT_EXPIRES_SECONDS", 28800))

def _frontend_url() -> str:
    return current_app.config.get("FRONTEND_URL", "http://localhost:5173")

def _is_production() -> bool:
    return os.getenv("FLASK_ENV", "development") == "production"


def _create_jwt(payload: dict) -> str:
    """
    Create a signed HS256 JWT for our application.
    This is NOT the IIT Delhi access token — it is our own session token.
    Payload should include: sub, email, name, role, department.
    """
    now = datetime.datetime.now(datetime.timezone.utc)
    full_payload = {
        **payload,
        "iat": now,
        "exp": now + datetime.timedelta(seconds=_jwt_expires_seconds()),
    }
    return jwt.encode(full_payload, _jwt_secret(), algorithm="HS256")


def _decode_jwt(token: str) -> dict:
    """Decode and verify a JWT. Raises jwt.InvalidTokenError on failure."""
    return jwt.decode(token, _jwt_secret(), algorithms=["HS256"])


def _set_auth_cookie(response, token: str):
    """
    Attach the HttpOnly JWT cookie to a response.
    Secure=False in development (HTTP), Secure=True in production (HTTPS).
    """
    response.set_cookie(
        "jwt",
        value=token,
        httponly=True,
        secure=_is_production(),
        samesite="Lax",
        max_age=_jwt_expires_seconds(),
        path="/",
    )
    return response


def _clear_auth_cookie(response):
    """Expire the JWT cookie immediately (max_age=0)."""
    response.set_cookie(
        "jwt",
        value="",
        httponly=True,
        secure=_is_production(),
        samesite="Lax",
        max_age=0,
        path="/",
    )
    return response


# ── Role resolution ───────────────────────────────────────────────────────────

def _resolve_user_and_role(email: str):
    """
    Determine the application role for an email address by querying our database.

    IMPORTANT: IIT Delhi OAuth authenticates the user. It does NOT authorize them.
    Role assignment belongs entirely to our application logic.

    Priority order: admin → professor → student
    Raises ValueError with a human-readable message on access denial or unknown email.
    """
    email = email.strip().lower()

    # 1 ── Admin? (checked against admin_emails in system_settings)
    admin_user = verify_admin(email)
    if admin_user:
        return admin_user, "admin"

    # 2 ── Professor?
    prof = db.get_professor_by_email(email)
    if prof:
        if not prof.get("is_active", True):
            raise ValueError("Access Denied: Your professor account has been deactivated.")
        return prof, "professor"

    # 3 ── Student?
    student = db.get_student_by_email(email)
    if student:
        if not student.get("is_approved_for_login"):
            raise ValueError("Access Denied: Your student login has been disabled by the Administrator.")
        settings = db.get_system_settings()
        roll_number = student.get("roll_number", "")
        if not is_student_eligible(roll_number, settings):
            min_y = settings.get("min_eligible_year", "2020")
            max_y = settings.get("max_eligible_year", "2030")
            batch_year = str(roll_number)[:4] if roll_number else "Unknown"
            raise ValueError(
                f"Access Denied: Login is restricted to Batch {min_y}–{max_y} "
                f"(Your batch: {batch_year})."
            )
        return student, "student"

    # Not found in any table → 403
    raise ValueError("Your IIT Delhi email is not registered in the Academic Portal.")


# ── Step 1: Initiate OAuth ────────────────────────────────────────────────────

@auth_bp.route("/iitd-login", methods=["GET"])
def iitd_login():
    """
    Redirect the browser to the IIT Delhi OAuth authorization page.

    Per official IIT Delhi OAuth docs, the authorization URL takes exactly
    three parameters: response_type, client_id, state.
    No redirect_uri, no scope — these are not required by IIT Delhi.

    The state parameter is a cryptographically random value stored in a
    dedicated short-lived cookie (NOT the Flask session) for CSRF protection.
    The Flask session cookie uses SameSite=Lax, which browsers block on the
    cross-site top-level redirect from oauth.iitd.ac.in back to this server,
    causing the stored state to be invisible in the callback. A separate
    oauth_state cookie with SameSite=None (prod) / Lax (dev) survives it.
    """
    client_id = os.getenv("IITD_CLIENT_ID", "")

    if not client_id:
        logger.warning("iitd-login called but IITD_CLIENT_ID is not configured.")
        return jsonify({
            "success": False,
            "message": (
                "IIT Delhi OAuth is not configured yet. "
                "Set IITD_CLIENT_ID and IITD_CLIENT_SECRET in backend/.env "
                "once credentials are received from IIT Delhi CSC."
            ),
        }), 503

    # Generate a secure random state value
    state = secrets.token_urlsafe(32)
    logger.info("OAuth flow initiated — state stored in cookie.")

    # Build the authorization URL with exactly the parameters required by IIT Delhi
    params = {
        "response_type": "code",
        "client_id":     client_id,
        "state":         state,
    }
    auth_url = IITD_AUTHORIZE_URL + "?" + urllib.parse.urlencode(params)
    response = make_response(redirect(auth_url))

    # Store state in its own cookie so it survives the cross-site redirect.
    # In production (HTTPS) we need SameSite=None; Secure=True.
    # In development (HTTP) SameSite=Lax is fine (same host, no HTTPS required).
    is_prod = _is_production()
    response.set_cookie(
        "oauth_state",
        value=state,
        httponly=True,
        secure=is_prod,
        samesite="None" if is_prod else "Lax",
        max_age=600,   # 10-minute window to complete login
        path="/",
    )
    return response


# ── Step 2: Handle OAuth callback ─────────────────────────────────────────────

@auth_bp.route("/callback", methods=["GET"])
def iitd_callback():
    """
    IIT Delhi redirects here with ?code=<authorization_code>&state=<state>.

    Steps (per official IIT Delhi OAuth documentation):
      5.1  Validate state against the value stored in the Flask session.
      5.2  POST to token.php: client_id, client_secret, grant_type, code.
      5.3  POST to resource.php: access_token in body (not as Bearer header).
      6    Resolve our application role from the returned email via DB lookup.
      7    Create our own application JWT (NOT the IIT Delhi access token).
      8    Store JWT in an HttpOnly cookie — never send it to React directly.
      9    Redirect to /auth/callback (React SPA, no token in URL).
    """
    frontend_callback = _frontend_url() + "/auth/callback"

    # ── Step 5.1: Validate state ───────────────────────────────────────────────
    received_state = request.args.get("state", "")
    stored_state   = request.cookies.get("oauth_state", None)   # read from cookie

    if not stored_state or not received_state or received_state != stored_state:
        logger.warning(
            "OAuth state mismatch — possible CSRF attempt. "
            "received=%r stored=%r", received_state, stored_state
        )
        return redirect(
            frontend_callback + "?error=" + urllib.parse.quote("State validation failed. Please try logging in again.")
        )

    # Check for errors sent by IIT Delhi (e.g. user denied access)
    error = request.args.get("error")
    if error:
        logger.warning("IIT Delhi returned OAuth error: %s", error)
        return redirect(frontend_callback + "?error=" + urllib.parse.quote(error))

    code = request.args.get("code", "")
    if not code:
        return redirect(frontend_callback + "?error=" + urllib.parse.quote("No authorization code received."))

    client_id     = os.getenv("IITD_CLIENT_ID", "")
    client_secret = os.getenv("IITD_CLIENT_SECRET", "")

    try:
        # ── Step 5.2: Exchange authorization code for access token ─────────────
        # POST body parameters exactly as specified in IIT Delhi OAuth docs.
        # Do NOT include redirect_uri — it is not required by IIT Delhi.
        logger.info("Exchanging authorization code for access token.")
        token_resp = http_requests.post(
            IITD_TOKEN_URL,
            data={
                "client_id":     client_id,
                "client_secret": client_secret,
                "grant_type":    "authorization_code",
                "code":          code,
            },
            timeout=10,
        )
        token_resp.raise_for_status()

        access_token = token_resp.json().get("access_token")
        if not access_token:
            raise ValueError("IIT Delhi did not return an access_token.")

        # ── Step 5.3: Fetch user profile from IIT Delhi ────────────────────────
        # Per IIT Delhi docs: POST to resource.php with access_token in the body.
        # Do NOT use a GET request with an Authorization: Bearer header.
        logger.info("Fetching user profile from IIT Delhi resource endpoint.")
        resource_resp = http_requests.post(
            IITD_RESOURCE_URL,
            data={"access_token": access_token},
            timeout=10,
        )
        resource_resp.raise_for_status()
        profile = resource_resp.json()

        # Extract exactly the fields documented by IIT Delhi:
        # user_id, mail, name, uniqueiitdid, category, department
        email        = profile.get("mail", "").strip().lower()
        name         = profile.get("name", "")
        department   = profile.get("department", "")
        user_id      = profile.get("user_id", "")
        uniqueiitdid = profile.get("uniqueiitdid", "")
        category     = profile.get("category", "")

        if not email:
            raise ValueError("IIT Delhi did not return an email address (mail field).")

        logger.info("IIT Delhi profile received for: %s (category: %s)", email, category)

        # ── Step 6: Resolve application role ──────────────────────────────────
        # IIT Delhi authenticates — we authorize.
        # Role is determined entirely by our database, NOT by the OAuth response.
        user, role = _resolve_user_and_role(email)
        logger.info("Role resolved: %s → %s", email, role)

    except ValueError as exc:
        logger.warning("OAuth value error: %s", exc)
        return redirect(frontend_callback + "?error=" + urllib.parse.quote(str(exc)))
    except http_requests.RequestException as exc:
        logger.error("HTTP error during OAuth exchange: %s", exc, exc_info=True)
        return redirect(frontend_callback + "?error=" + urllib.parse.quote("Failed to communicate with IIT Delhi OAuth server."))
    except Exception as exc:
        logger.error("Unexpected OAuth callback error: %s", exc, exc_info=True)
        return redirect(frontend_callback + "?error=" + urllib.parse.quote("An unexpected error occurred. Please try again."))

    # ── Step 7: Create our application JWT ────────────────────────────────────
    # This JWT belongs to our application. It is NOT the IIT Delhi access token.
    # The IIT Delhi access token is discarded after profile retrieval — never stored.
    jwt_token = _create_jwt({
        "sub":        email,          # subject (RFC 7519)
        "email":      email,
        "name":       name,
        "role":       role,
        "department": department,
    })

    # ── Step 8 & 9: Set HttpOnly cookie and redirect ───────────────────────────
    # JWT goes into a cookie — never into the URL or response body visible to JS.
    # Also clear the temporary oauth_state cookie now that it has been consumed.
    response = make_response(redirect(frontend_callback))
    _set_auth_cookie(response, jwt_token)
    response.set_cookie("oauth_state", value="", max_age=0, path="/")  # clear state cookie
    logger.info("JWT cookie set for %s, redirecting to %s", email, frontend_callback)
    return response


# ── Step 10: Session validation ───────────────────────────────────────────────

@auth_bp.route("/session", methods=["GET"])
def get_session():
    """
    Called by React OAuthCallback and AuthContext (on every app boot) with
    credentials: 'include'. The browser automatically sends the HttpOnly cookie.

    Validates the JWT and returns the authenticated user + role.
    The JWT payload includes name and department from the IIT Delhi profile,
    so we can return enriched data without an extra DB call for those fields.
    """
    token = request.cookies.get("jwt")
    if not token:
        return jsonify({"success": False, "message": "Not authenticated."}), 401

    try:
        payload = _decode_jwt(token)
    except jwt.ExpiredSignatureError:
        return jsonify({"success": False, "message": "Session expired. Please log in again."}), 401
    except jwt.InvalidTokenError:
        return jsonify({"success": False, "message": "Invalid session token."}), 401

    email = payload.get("email", "")

    try:
        user, resolved_role = _resolve_user_and_role(email)
    except ValueError as exc:
        return jsonify({"success": False, "message": str(exc)}), 403

    return jsonify({
        "success": True,
        "role":    resolved_role,
        "user":    user,
    })


# ── Logout ────────────────────────────────────────────────────────────────────

@auth_bp.route("/logout", methods=["POST"])
def logout():
    """
    Clear the HttpOnly JWT cookie and destroy any server-side OAuth state.
    The frontend AuthContext clears its own in-memory and localStorage state.
    """
    session.clear()   # destroy OAuth state parameter if still present
    response = make_response(jsonify({"success": True, "message": "Logged out successfully."}))
    _clear_auth_cookie(response)
    logger.info("User logged out — JWT cookie cleared.")
    return response


# ── Dev-only login (disabled in production) ───────────────────────────────────

@auth_bp.route("/login", methods=["POST"])
@limiter.limit("10 per minute")
def auth_login():
    """
    Development-only email+role login.

    Behaves exactly like a successful OAuth login:
      - Resolves the role from the database (same _resolve_user_and_role logic)
      - Creates the application JWT
      - Sets the HttpOnly cookie

    This allows full browser testing (including /auth/callback → dashboard)
    without IIT Delhi credentials.

    Automatically disabled when FLASK_ENV=production.
    NOT called from the production UI — the Login page uses window.location
    to redirect to /api/auth/iitd-login instead.
    """
    if _is_production():
        return jsonify({
            "success": False,
            "message": "Direct login is disabled in production. Use IIT Delhi OAuth.",
        }), 403

    data  = request.get_json() or {}
    email = data.get("email", "").strip().lower()
    role  = data.get("role",  "").strip().lower()

    if not email or not role:
        return jsonify({"success": False, "message": "Email and role are required."}), 400

    try:
        user, resolved_role = _resolve_user_and_role(email)
        if resolved_role != role:
            return jsonify({
                "success": False,
                "message": f"Role mismatch: '{email}' is a {resolved_role}, not a {role}.",
            }), 403
    except ValueError as exc:
        return jsonify({"success": False, "message": str(exc)}), 401

    # Create JWT and set cookie — identical to the OAuth callback path
    jwt_token = _create_jwt({
        "sub":        email,
        "email":      email,
        "name":       user.get("name", ""),
        "role":       resolved_role,
        "department": user.get("department", ""),
    })
    response = make_response(jsonify({
        "success": True,
        "role":    resolved_role,
        "user":    user,
    }))
    _set_auth_cookie(response, jwt_token)
    logger.info("[DEV] Dev login cookie issued for %s (%s).", email, resolved_role)
    return response
