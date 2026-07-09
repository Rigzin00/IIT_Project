import os
import logging
from flask import Flask, jsonify, request
from werkzeug.exceptions import HTTPException
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s',
)
logger = logging.getLogger(__name__)

# Import Blueprints
from routes.auth import auth_bp
from routes.student import student_bp
from routes.professor import professor_bp
from routes.admin import admin_bp
from routes.export import export_bp
from utils.limiter import limiter

app = Flask(__name__, static_folder="../react_frontend/dist", static_url_path="")

# ── App config ────────────────────────────────────────────────────────────────
# SECRET_KEY signs the Flask server-side session cookie used to store the
# OAuth state parameter (CSRF protection).  Must be set before deploying.
app.secret_key                    = os.getenv("SECRET_KEY", "change-me-flask-session-secret")
app.config["JWT_SECRET"]          = os.getenv("JWT_SECRET", "change-me-jwt-secret")
app.config["JWT_EXPIRES_SECONDS"] = int(os.getenv("JWT_EXPIRES_SECONDS", 28800))  # 8 h
app.config["FRONTEND_URL"]        = os.getenv("FRONTEND_URL", "http://localhost:5173")

# ── CORS ───────────────────────────────────────────────────────────────────────
# supports_credentials=True is required so the browser attaches the HttpOnly
# JWT cookie on cross-origin requests during local development.
ALLOWED_ORIGINS = [
    "http://localhost:5173",        # Vite dev server
    "http://127.0.0.1:5173",
    "http://10.17.51.45:8000",      # Production
    "https://acadportal.com",       # Proposed production domain
]

if os.getenv("FLASK_ENV", "development") == "development":
    CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=True)
else:
    CORS(
        app,
        resources={r"/api/*": {"origins": ALLOWED_ORIGINS}},
        supports_credentials=True,
    )

limiter.init_app(app)

# Register Blueprints
app.register_blueprint(auth_bp,      url_prefix="/api/auth")
app.register_blueprint(student_bp,   url_prefix="/api/student")
app.register_blueprint(professor_bp, url_prefix="/api/professor")
app.register_blueprint(admin_bp,     url_prefix="/api/admin")
app.register_blueprint(export_bp,    url_prefix="/api/export")

# ── Security Headers ───────────────────────────────────────────────────────────
@app.after_request
def add_security_headers(response):
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'DENY'
    response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
    return response

# ── Static / SPA Routes ────────────────────────────────────────────────────────
@app.route("/")
def serve_index():
    return app.send_static_file("index.html")

# The React OAuthCallback component is mounted at /auth/callback.
# Flask must serve index.html for this path so the SPA can handle it.
@app.route("/auth/callback")
def serve_oauth_callback():
    return app.send_static_file("index.html")

# ── Error Handlers ─────────────────────────────────────────────────────────────
@app.errorhandler(429)
def too_many_requests(e):
    return jsonify({"success": False, "message": f"Rate limit exceeded: {e.description}"}), 429

@app.errorhandler(404)
def not_found(e):
    if request.path.startswith("/api/"):
        return jsonify({"success": False, "message": "API Endpoint not found!"}), 404
    # For SPA client-side routing, fallback to index.html
    return app.send_static_file("index.html")

@app.errorhandler(400)
def bad_request(e):
    return jsonify({"success": False, "message": "Bad Request!"}), 400

@app.errorhandler(405)
def method_not_allowed(e):
    return jsonify({"success": False, "message": "Method Not Allowed!"}), 405

@app.errorhandler(500)
def internal_server_error(e):
    return jsonify({"success": False, "message": "Internal Server Error!"}), 500

@app.errorhandler(Exception)
def handle_exception(e):
    # Pass through HTTP errors
    if isinstance(e, HTTPException):
        return e
    logger.error("Unhandled Exception: %s", e, exc_info=True)
    return jsonify({"success": False, "message": "An unexpected server error occurred."}), 500

if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    debug_mode = os.getenv("FLASK_ENV", "development") == "development"
    print(f">>> Running Academic Portal on http://127.0.0.1:{port} (serving both GUI & API) <<<")
    app.run(host="0.0.0.0", port=port, debug=debug_mode)
