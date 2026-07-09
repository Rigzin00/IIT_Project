# Academic Minor Course Registration System

A robust, full-stack web application for administering Minor academic programs at IIT Delhi.
Built with React 19 + TypeScript on the frontend and Flask 3 on the backend, backed by Supabase (PostgreSQL).

---

## 🚀 Tech Stack

### Frontend
* **Framework:** React 19 with TypeScript
* **Build Tool:** Vite
* **Styling:** Tailwind CSS v4 + Lucide React icons
* **Routing:** React Router DOM v7 (`BrowserRouter`, URL-based)
* **State Management:** React Context API (`AuthContext`, `ToastContext`)
* **Session Persistence:** HttpOnly JWT Cookie (server-authoritative) + `localStorage` as UI cache only

### Backend
* **Framework:** Flask 3 (Python)
* **Database:** Supabase (PostgreSQL) via `supabase-py`
* **Auth:** PyJWT ≥ 2.10.1 — HS256-signed tokens in HttpOnly cookies
* **Security:** Flask-Limiter (rate limiting), Flask-CORS (`supports_credentials=True`), global error handlers
* **Architecture:** Modular Blueprint routing (`routes/auth.py`, `routes/admin.py`, etc.)

---

## ✨ Portals

| Portal | Users | Key Features |
|---|---|---|
| 🛡️ Admin | Institute admins | Policy management, student directory, data export |
| 👨‍🏫 Professor | Faculty | Registration approvals, grading, filtering |
| 🎓 Student | Students | Course catalog, one-click registration, profile tracking |

---

## 🔐 IIT Delhi OAuth Authentication

### OAuth Sequence Diagram

```
Browser                  React (SPA)              Flask Backend          IIT Delhi OAuth
   │                         │                         │                       │
   │  visit /login           │                         │                       │
   │────────────────────────>│                         │                       │
   │                         │  render Login page      │                       │
   │<────────────────────────│                         │                       │
   │                         │                         │                       │
   │  click "Login with      │                         │                       │
   │  IIT Delhi"             │                         │                       │
   │  window.location.href   │                         │                       │
   │  = /api/auth/iitd-login │                         │                       │
   │─────────────────────────┼────────────────────────>│                       │
   │                         │                         │ generate state        │
   │                         │                         │ store in session      │
   │                         │                         │                       │
   │                         │              302 redirect to authorize.php      │
   │<────────────────────────┼─────────────────────────┼──────────────────────>│
   │                         │                         │                       │
   │  user logs in with IIT Delhi credentials          │                       │
   │──────────────────────────────────────────────────────────────────────────>│
   │                         │                         │                       │
   │                         │  GET /api/auth/callback?code=XXX&state=YYY      │
   │<────────────────────────┼─────────────────────────│<──────────────────────│
   │                         │                         │                       │
   │                         │                         │ 5.1 validate state    │
   │                         │                         │ 5.2 POST token.php    │
   │                         │                         │     → access_token    │
   │                         │                         │ 5.3 POST resource.php │
   │                         │                         │     → {mail,name,...} │
   │                         │                         │ 6   resolve role (DB) │
   │                         │                         │ 7   create app JWT    │
   │                         │                         │ 8   Set-Cookie: jwt=  │
   │                         │                         │     HttpOnly; Lax     │
   │                         │  302 /auth/callback     │                       │
   │<────────────────────────│<────────────────────────│                       │
   │                         │                         │                       │
   │  GET /auth/callback     │                         │                       │
   │────────────────────────>│                         │                       │
   │                         │  OAuthCallback mounts   │                       │
   │                         │  GET /api/auth/session  │                       │
   │                         │  credentials:'include'  │                       │
   │                         │────────────────────────>│                       │
   │                         │                         │ read JWT cookie       │
   │                         │                         │ decode + validate     │
   │                         │                         │ resolve role (DB)     │
   │                         │   { success, user, role }                       │
   │                         │<────────────────────────│                       │
   │                         │                         │                       │
   │                         │  authLogin(user, role)  │                       │
   │                         │  navigate('/')          │                       │
   │  Dashboard              │                         │                       │
   │<────────────────────────│                         │                       │
```

### Authentication Sequence Diagram (every page load)

```
Browser opens any page
        │
        ▼
AuthContext mounts  (isLoading = true)
        │
        ▼
GET /api/auth/session  (credentials: 'include')
browser sends HttpOnly cookie automatically
        │
   ┌────┴────┐
   │         │
 JWT OK    no cookie / expired
   │         │
   ▼         ▼
setUser   setUser(null)
setRole   setRole(null)
   │      clear localStorage
   │         │
   └────┬────┘
        │
   isLoading = false
        │
   ┌────┴────────────────────────┐
   │                             │
isLoggedIn=true          isLoggedIn=false
   │                             │
   ▼                             ▼
PortalApp                Navigate('/login')
(dashboard)
```

---

## 📁 Modified Files — Full Reference

### `backend/.env`

**What changed:**

| Variable | Before | After |
|---|---|---|
| `IITD_CLIENT_ID` | `your-iitd-client-id` (placeholder string) | `` (empty — pending IIT Delhi CSC) |
| `IITD_CLIENT_SECRET` | `your-iitd-client-secret` (placeholder string) | `` (empty — pending IIT Delhi CSC) |
| `FRONTEND_URL` | ❌ missing | `http://10.17.51.45:8000` (new) |
| `SECRET_KEY` | ❌ missing | placeholder (new — required for Flask session) |

**Why:** Placeholder strings like `"your-iitd-client-id"` caused the backend to incorrectly detect "configured" state. Empty strings are the correct sentinel. `SECRET_KEY` is required for Flask to sign the server-side session cookie that stores the OAuth state. `FRONTEND_URL` removes the hardcoded IP from `auth.py`.

---

### `backend/app.py`

**What changed:**

```diff
- # ── JWT config ──────────────────────────────────────────────────────────────
- app.config["JWT_SECRET"]          = os.getenv("JWT_SECRET", "...")
- app.config["JWT_EXPIRES_SECONDS"] = int(os.getenv("JWT_EXPIRES_SECONDS", 28800))

+ # ── App config ──────────────────────────────────────────────────────────────
+ app.secret_key                    = os.getenv("SECRET_KEY", "...")   # ← NEW
+ app.config["JWT_SECRET"]          = os.getenv("JWT_SECRET", "...")
+ app.config["JWT_EXPIRES_SECONDS"] = int(os.getenv("JWT_EXPIRES_SECONDS", 28800))
+ app.config["FRONTEND_URL"]        = os.getenv("FRONTEND_URL", "http://localhost:5173")  # ← NEW
```

**Why:** `app.secret_key` is required for `flask.session` to work — without it, storing the OAuth state in the session raises a runtime error. `FRONTEND_URL` is now read from config so `auth.py` doesn't hardcode the server IP.

---

### `backend/routes/auth.py` *(primary change)*

#### Summary of every assumption replaced with official IIT Delhi spec

| What was wrong (generic assumption) | What it is now (official IIT Delhi spec) |
|---|---|
| `IITD_AUTHORIZE_URL = "https://oauth.iitd.ac.in/authorize"` | `"https://oauth.iitd.ac.in/authorize.php"` |
| `IITD_TOKEN_URL = "https://oauth.iitd.ac.in/token"` | `"https://oauth.iitd.ac.in/token.php"` |
| `IITD_USERINFO_URL = "https://oauth.iitd.ac.in/resource"` | `"https://oauth.iitd.ac.in/resource.php"` (renamed to `IITD_RESOURCE_URL`) |
| Authorization URL included `redirect_uri` and `scope` params | Only `response_type=code`, `client_id`, `state` — exactly as documented |
| No `state` parameter | Cryptographically random `state` via `secrets.token_urlsafe(32)` |
| No state storage | `session["oauth_state"] = state` (Flask server-side session) |
| No state validation in callback | `session.pop("oauth_state")` compared to `request.args["state"]` before any code exchange |
| Token request included `redirect_uri` | Only `client_id`, `client_secret`, `grant_type`, `code` — exactly as documented |
| Resource fetched via `GET` with `Authorization: Bearer <token>` header | Resource fetched via `POST` with `access_token` in request body — exactly as documented |
| Profile fields assumed: `email` or `userinfo.email` | Official fields: `mail`, `name`, `user_id`, `uniqueiitdid`, `category`, `department` |
| JWT payload: `{ email, role }` only | JWT payload: `{ sub, email, name, role, department }` |
| `frontend_callback` hardcoded as `"http://10.17.51.45:8000/auth/callback"` | `_frontend_url() + "/auth/callback"` reads from `app.config["FRONTEND_URL"]` |
| `logout()` only cleared the cookie | `logout()` calls `session.clear()` first, then clears cookie |
| Dev `auth_login()` returned JSON only — no cookie | Dev login creates JWT + sets HttpOnly cookie, behaves identically to OAuth path |
| HTTP errors not separated from value errors | `http_requests.RequestException` caught separately from `ValueError` |
| No logging | `logger.info/warning/error` at every significant step |

#### New imports added

```python
import secrets    # for secrets.token_urlsafe(32) — OAuth state generation
import logging    # for per-module logger
from flask import session  # for Flask server-side session (OAuth state storage)
```

#### Unchanged and preserved

- `_jwt_secret()`, `_jwt_expires_seconds()`, `_is_production()` — unchanged
- `_create_jwt()`, `_decode_jwt()` — unchanged
- `_set_auth_cookie()`, `_clear_auth_cookie()` — unchanged
- `_resolve_user_and_role()` — unchanged (IIT Delhi authenticates; we authorize)
- `GET /api/auth/session` — unchanged logic, unchanged response shape
- Rate limiter on `POST /api/auth/login` — unchanged
- Production guard on `POST /api/auth/login` — unchanged

---

### Frontend files — no changes needed

The frontend was already correct. No modifications:

| File | Status |
|---|---|
| `App.tsx` | ✅ Correct — BrowserRouter, ProtectedRoute, open `/login` and `/auth/callback` routes |
| `pages/Login.tsx` | ✅ Correct — single button, `window.location.href` (not fetch) |
| `pages/OAuthCallback.tsx` | ✅ Correct — calls `GET /api/auth/session` with `credentials: 'include'` |
| `context/AuthContext.tsx` | ✅ Correct — `isLoading`, `fetchSession()` on boot, async `logout()` |
| `api/auth.ts` | ✅ Correct — `fetchSession()` and `logoutSession()` with `credentials: 'include'` |
| `components/Sidebar.tsx` | ✅ Correct — awaits `logout()` then navigates to `/login` |

---

## 🔒 Security Properties

| Property | Implementation |
|---|---|
| OAuth CSRF protection | `state` = `secrets.token_urlsafe(32)` stored in Flask session, validated before code exchange |
| JWT never in JavaScript | Cookie is `HttpOnly` — `document.cookie` cannot read it |
| CSRF on cookie | `SameSite=Lax` — cookie not sent on cross-site top-level POST |
| HTTPS enforcement | `Secure=True` automatically when `FLASK_ENV=production` |
| JWT expiry | Configurable via `JWT_EXPIRES_SECONDS` (default 8 h) |
| JWT signature | HS256 with `JWT_SECRET` — separate from Flask `SECRET_KEY` |
| IIT Delhi token never stored | Access token used only to call `resource.php`, then discarded |
| Client secret never exposed | `IITD_CLIENT_SECRET` only used in server-to-server POST, never sent to browser |
| Role trust boundary | Role assigned entirely by our DB — IIT Delhi OAuth response never decides role |
| Rate limiting | `POST /api/auth/login` (dev): 10 req/min via Flask-Limiter |
| Logout | `session.clear()` + `max_age=0` cookie — both server state and cookie cleared |

---

## ⚙️ Environment Variables

```bash
# backend/.env

# ── Supabase ───────────────────────────────────────────────────────────────────
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key

# ── Flask ──────────────────────────────────────────────────────────────────────
FLASK_ENV=development   # set to "production" for live deployment

# ── IIT Delhi OAuth ────────────────────────────────────────────────────────────
# Official endpoints (hardcoded in auth.py — do not add to .env):
#   https://oauth.iitd.ac.in/authorize.php
#   https://oauth.iitd.ac.in/token.php
#   https://oauth.iitd.ac.in/resource.php
#
# Fill these in when credentials are received from IIT Delhi CSC:
IITD_CLIENT_ID=
IITD_CLIENT_SECRET=
IITD_REDIRECT_URI=http://10.17.51.45:8000/api/auth/callback

# ── URLs ───────────────────────────────────────────────────────────────────────
FRONTEND_URL=http://10.17.51.45:8000   # used to build the post-OAuth redirect

# ── Secrets (generate both with: python -c "import secrets; print(secrets.token_hex(32))") ──
SECRET_KEY=        # Flask session signing (stores OAuth state for CSRF protection)
JWT_SECRET=        # Application JWT signing (must be DIFFERENT from SECRET_KEY)
JWT_EXPIRES_SECONDS=28800   # 8 hours
```

---

## 🛠️ Local Development Setup

### Prerequisites
* Node.js 18+, Python 3.9+, Supabase project

### Backend
```bash
cd backend
pip install -r requirements.txt
# Edit .env: set SUPABASE_URL, SUPABASE_KEY, SECRET_KEY, JWT_SECRET
python app.py    # runs on port 5000
```

### Frontend
```bash
cd react_frontend
npm install
npm run dev      # runs on port 5173
```

### Dev Login (browser, without IIT Delhi credentials)

The dev login now sets the **same HttpOnly cookie** as the OAuth flow, so the entire
`/auth/callback → /api/auth/session → dashboard` path works without real credentials:

```bash
# Step 1: POST to dev login endpoint (sets the JWT cookie)
curl -c cookies.txt -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@institute.edu","role":"admin"}'

# Step 2: Verify session
curl -b cookies.txt http://localhost:5000/api/auth/session

# Step 3: Logout
curl -b cookies.txt -X POST http://localhost:5000/api/auth/logout
```

For browser-based dev testing, you can also temporarily visit
`http://localhost:5173/auth/callback` directly after issuing the cookie via curl
with a shared browser/curl cookie jar.

---

## 📋 Remaining TODO (pending IIT Delhi credentials)

When IIT Delhi CSC provides credentials, **only these 4 steps are required**:

| Step | Action | File |
|---|---|---|
| 1 | Set `IITD_CLIENT_ID=<real-client-id>` | `backend/.env` |
| 2 | Set `IITD_CLIENT_SECRET=<real-secret>` | `backend/.env` |
| 3 | Confirm `IITD_REDIRECT_URI` matches the URI registered with IIT Delhi | `backend/.env` |
| 4 | Generate and set real `SECRET_KEY` and `JWT_SECRET` | `backend/.env` |

**No code changes are required.** The OAuth flow, cookie handling, role resolution, and
frontend callback are all fully implemented and ready.

---

## 🧪 Testing

```bash
cd backend
python test_api.py    # integration tests for all API endpoints
```

---

*Built with ❤️ for IIT Delhi Academics*