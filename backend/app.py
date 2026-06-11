import os
from flask import Flask, jsonify, request
from werkzeug.exceptions import HTTPException
from flask_cors import CORS

# Import Blueprints
from routes.auth import auth_bp
from routes.student import student_bp
from routes.professor import professor_bp
from routes.admin import admin_bp
from routes.export import export_bp
from utils.limiter import limiter

app = Flask(__name__, static_folder="../react_frontend/dist", static_url_path="")

# Enable CORS only in development.
# In production, Flask serves the React build on the same origin — no CORS needed.
if os.getenv("FLASK_ENV", "development") == "development":
    CORS(app)

limiter.init_app(app)

# Register Blueprints
app.register_blueprint(auth_bp, url_prefix="/api/auth")
app.register_blueprint(student_bp, url_prefix="/api/student")
app.register_blueprint(professor_bp, url_prefix="/api/professor")
app.register_blueprint(admin_bp, url_prefix="/api/admin")
app.register_blueprint(export_bp, url_prefix="/api/export")

# Static File Routes
@app.route("/")
def serve_index():
    return app.send_static_file("index.html")

# --- Error Handlers ---
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
    # Now you're handling non-HTTP exceptions only
    print(f"Unhandled Exception: {e}")
    return jsonify({"success": False, "message": "An unexpected server error occurred."}), 500

if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    debug_mode = os.getenv("FLASK_ENV", "development") == "development"
    print(f">>> Running Academic Portal on http://127.0.0.1:{port} (serving both GUI & API) <<<")
    app.run(host="0.0.0.0", port=port, debug=debug_mode)
