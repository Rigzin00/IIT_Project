import os
from flask import Flask
from flask_cors import CORS

# Import Blueprints
from routes.auth import auth_bp
from routes.student import student_bp
from routes.professor import professor_bp
from routes.admin import admin_bp
from routes.export import export_bp

app = Flask(__name__, static_folder="../frontend", static_url_path="")
CORS(app)  # Enable Cross-Origin Resource Sharing

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

if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    debug_mode = os.getenv("FLASK_ENV", "development") == "development"
    print(f">>> Running Academic Portal on http://127.0.0.1:{port} (serving both GUI & API) <<<")
    app.run(host="0.0.0.0", port=port, debug=debug_mode)
