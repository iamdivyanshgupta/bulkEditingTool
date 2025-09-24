from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import os

app = Flask(__name__)
CORS(app)  # Allow requests from frontend

UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Test route
@app.route("/api/test", methods=["GET"])
def test():
    return jsonify({"status": "Backend is running 🚀"})

# Upload route
@app.route("/api/upload", methods=["POST"])
def upload_file():
    if "file" not in request.files:
        return jsonify({"error": "No file part"}), 400
    file = request.files["file"]
    if file.filename == "":
        return jsonify({"error": "No selected file"}), 400
    
    filepath = os.path.join(UPLOAD_FOLDER, file.filename)
    file.save(filepath)
    return jsonify({"message": "File uploaded successfully!", "filename": file.filename})

# Export route placeholder
@app.route("/api/export/<filename>", methods=["GET"])
def export_file(filename):
    filepath = os.path.join(UPLOAD_FOLDER, filename)
    if os.path.exists(filepath):
        return send_file(filepath)
    return jsonify({"error": "File not found"}), 404

if __name__ == "__main__":
    app.run(port=5000, debug=True)
