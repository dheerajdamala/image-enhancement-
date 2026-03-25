from flask import Flask, request, jsonify
from flask_cors import CORS
import cv2
import numpy as np
import base64
from utils.analysis import detect_blur, detect_noise, detect_brightness
from utils.enhancement import apply_sharpening, apply_median_filter, apply_gaussian_filter, apply_clahe, apply_color_correction

app = Flask(__name__)
CORS(app)

def calculate_metrics(image):
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    sharpness = cv2.Laplacian(gray, cv2.CV_64F).var()
    contrast = gray.std()
    return sharpness, contrast

def image_to_base64(image):
    _, buffer = cv2.imencode('.png', image)
    return base64.b64encode(buffer).decode('utf-8')

@app.route('/process-image', methods=['POST'])
def process_image():
    if 'image' not in request.files:
        return jsonify({"error": "No image provided"}), 400
        
    file = request.files['image']
    file_bytes = np.frombuffer(file.read(), np.uint8)
    image = cv2.imdecode(file_bytes, cv2.IMREAD_COLOR)
    
    if image is None:
        return jsonify({"error": "Invalid image format"}), 400

    # Read tuning parameters from frontend (-1 means Auto logic)
    sharpness_strength = float(request.form.get('sharpness', -1))
    noise_strength = float(request.form.get('noise', -1))
    color_strength = float(request.form.get('color', -1))
    contrast_strength = float(request.form.get('contrast', -1))

    # Calculate metrics before
    sharpness_before, contrast_before = calculate_metrics(image)
    
    # 1. Quality Analysis
    is_blurred, blur_variance, blur_threshold = detect_blur(image)
    noise_type, noise_variance = detect_noise(image)
    brightness_level, brightness_mean = detect_brightness(image)
    
    analysis = {
        "blur": bool(is_blurred),
        "noise_type": noise_type,
        "brightness": brightness_level
    }
    
    # 2. Adaptive Enhancement
    enhanced_image = image.copy()
    
    # Apply Color Correction (Auto or manual)
    if color_strength > 0:
        enhanced_image = apply_color_correction(enhanced_image, color_strength)
    elif color_strength == -1:
        # Default Auto mode enables mild color correction
        enhanced_image = apply_color_correction(enhanced_image, 0.4)

    # Apply Noise Reduction
    effective_noise = noise_strength if noise_strength != -1 else (5 if noise_type != "none" else 0)
    if effective_noise >= 3:
        if noise_type == "salt_pepper":
            enhanced_image = apply_median_filter(enhanced_image, effective_noise)
        else:
            enhanced_image = apply_gaussian_filter(enhanced_image, effective_noise)
        
    # Apply Sharpening
    effective_sharpness = sharpness_strength if sharpness_strength != -1 else (1.5 if is_blurred else 0)
    if effective_sharpness > 0:
        enhanced_image = apply_sharpening(enhanced_image, effective_sharpness)
        
    # Apply Contrast (CLAHE)
    effective_contrast = contrast_strength if contrast_strength != -1 else (2.0 if brightness_level == "low" else 0)
    if effective_contrast > 0:
        enhanced_image = apply_clahe(enhanced_image, effective_contrast)
        
    # Calculate metrics after
    sharpness_after, contrast_after = calculate_metrics(enhanced_image)
    
    metrics = {
        "sharpness_before": float(sharpness_before),
        "sharpness_after": float(sharpness_after),
        "contrast_before": float(contrast_before),
        "contrast_after": float(contrast_after)
    }
    
    response_data = {
        "enhanced_image": f"data:image/png;base64,{image_to_base64(enhanced_image)}",
        "analysis": analysis,
        "metrics": metrics
    }
    
    return jsonify(response_data)

if __name__ == '__main__':
    app.run(debug=True, port=5000)
