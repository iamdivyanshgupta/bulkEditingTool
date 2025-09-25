from flask import Flask, request, jsonify, send_from_directory, send_file
from flask_cors import CORS
import os
from PIL import Image, ImageOps, ImageEnhance
import numpy as np
import sys

print(f"Running with Python executable: {sys.executable}")

app = Flask(__name__)
CORS(app)  # Allow requests from frontend

UPLOAD_FOLDER = "uploads"
EDITED_FOLDER = "edited_images"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(EDITED_FOLDER, exist_ok=True)

# Test route
@app.route("/api/test", methods=["GET"])
def test():
    return jsonify({"status": "Backend is running 🚀"})

# Upload route
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

@app.route('/uploads/<filename>')
def uploaded_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

@app.route('/edited_images/<filename>')
def edited_file(filename):
    return send_from_directory(EDITED_FOLDER, filename)

@app.route('/api/upload', methods=['POST'])
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

@app.route('/api/images', methods=['GET'])
def list_images():
    try:
        images = [f for f in os.listdir(app.config['UPLOAD_FOLDER']) if os.path.isfile(os.path.join(app.config['UPLOAD_FOLDER'], f))]
        return jsonify(images), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

def get_image_path(filename):
    # Check for the image in both edited and upload folders
    for folder in [EDITED_FOLDER, UPLOAD_FOLDER]:
        filepath = os.path.join(folder, filename)
        if os.path.exists(filepath):
            return filepath
    return None

def get_new_edited_filename(filename, suffix):
    import time
    timestamp = int(time.time() * 1000)
    name, ext = os.path.splitext(filename)
    # Strip existing suffixes to prevent infinitely long names
    name = name.split('_')[0]
    return f"{name}_{suffix}_{timestamp}{ext}"

@app.route('/api/edit/apply-all', methods=['POST'])
def apply_all_edits():
    data = request.get_json()
    filename = data.get('filename')
    edits = data.get('edits', {})

    if not filename:
        return jsonify({'error': 'Filename not provided'}), 400

    filepath = get_image_path(filename)
    if not filepath:
        return jsonify({'error': 'File not found'}), 404

    try:
        img = Image.open(filepath)
        img = ImageOps.exif_transpose(img)
        img = img.convert('RGB')

        if 'brightness' in edits:
            enhancer = ImageEnhance.Brightness(img)
            img = enhancer.enhance(edits['brightness'])
        
        if 'contrast' in edits:
            enhancer = ImageEnhance.Contrast(img)
            img = enhancer.enhance(edits['contrast'])

        if 'grayscale' in edits and edits['grayscale'] > 0:
            img = img.convert('L').convert('RGB') # convert to grayscale and back to RGB

        # Note: Vibrancy is not a standard CSS filter, so we use Color enhancement from Pillow.
        # The frontend will need to handle this separately if it uses a vibrancy slider.

        new_filename = get_new_edited_filename(filename, 'edited')
        new_filepath = os.path.join(EDITED_FOLDER, new_filename)

        img.save(new_filepath)

        return jsonify({'message': 'Edits applied successfully', 'filename': new_filename}), 200
    except Exception as e:
        print(f"Error applying edits: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/analyze/<filename>', methods=['GET'])
def analyze_image(filename):
    original_filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    if not os.path.exists(original_filepath):
        return jsonify({'error': 'File not found'}), 404

    try:
        img = Image.open(original_filepath)
        img = ImageOps.exif_transpose(img) # Correct orientation
        img_gray = img.convert('L') # Convert to grayscale for analysis

        # Convert image to numpy array for calculations
        import numpy as np
        img_array = np.array(img_gray)

        # Basic Brightness Analysis (mean pixel value)
        brightness = np.mean(img_array)
        brightness_recommendation = ""
        if brightness < 70:
            brightness_recommendation = "Image might be underexposed. Consider increasing brightness."
        elif brightness > 180:
            brightness_recommendation = "Image might be overexposed. Consider decreasing brightness."
        else:
            brightness_recommendation = "Brightness seems balanced."

        # Basic Contrast Analysis (standard deviation of pixel values)
        contrast = np.std(img_array)
        contrast_recommendation = ""
        if contrast < 30:
            contrast_recommendation = "Image might lack contrast. Consider increasing contrast."
        elif contrast > 80:
            contrast_recommendation = "Image has good contrast."
        else:
            contrast_recommendation = "Contrast seems balanced."

        # Color Vibrancy Analysis (standard deviation of saturation channel)
        img_hsv = img.convert('HSV')
        hsv_array = np.array(img_hsv)
        saturation = hsv_array[:,:,1] # Saturation channel
        vibrancy = np.std(saturation)
        vibrancy_recommendation = ""
        if vibrancy < 50:
            vibrancy_recommendation = "Image might lack color vibrancy. Consider increasing saturation."
        elif vibrancy > 100:
            vibrancy_recommendation = "Image has good color vibrancy."
        else:
            vibrancy_recommendation = "Color vibrancy seems balanced."

        recommendations = []
        if brightness_recommendation: recommendations.append(brightness_recommendation)
        if contrast_recommendation: recommendations.append(contrast_recommendation)
        if vibrancy_recommendation: recommendations.append(vibrancy_recommendation)

        return jsonify({'filename': filename, 'recommendations': recommendations}), 200
    except Exception as e:
        print(f"Error during image analysis: {e}") # Print the actual error
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)
