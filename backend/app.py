from flask import Flask, request, jsonify
from flask_cors import CORS
import cv2
import numpy as np
import base64
from PIL import Image as PILImage
import io

from utils.analysis import detect_blur, detect_noise, detect_brightness
from utils.enhancement import (
    apply_sharpening, apply_median_filter, apply_gaussian_filter,
    apply_clahe, apply_color_correction, apply_gamma_correction
)

app = Flask(__name__)
CORS(app)

# ── Constants ────────────────────────────────────────────────────────────────
MAX_FILE_SIZE_MB = 10
MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024
SUPPORTED_FORMATS = {'image/jpeg', 'image/png', 'image/webp', 'image/bmp', 'image/tiff'}

# ── Helpers ──────────────────────────────────────────────────────────────────

def validate_file(file):
    """Returns an error string if invalid, else None."""
    file.seek(0, 2)  # seek to end
    size = file.tell()
    file.seek(0)     # reset

    if size > MAX_FILE_SIZE_BYTES:
        return f"File too large ({size // (1024*1024)} MB). Maximum allowed is {MAX_FILE_SIZE_MB} MB."
    if file.content_type not in SUPPORTED_FORMATS:
        return f"Unsupported file type '{file.content_type}'. Supported: JPEG, PNG, WebP, BMP, TIFF."
    return None


def auto_rotate_exif(file_bytes):
    """
    Auto-rotates the image according to its EXIF orientation tag using Pillow.
    Returns a numpy BGR array. Handles images without EXIF silently.
    """
    pil_img = PILImage.open(io.BytesIO(file_bytes))

    try:
        from PIL.ExifTags import TAGS
        exif_data = pil_img._getexif()
        if exif_data:
            orientation_key = next(
                (k for k, v in TAGS.items() if v == 'Orientation'), None
            )
            if orientation_key and orientation_key in exif_data:
                orientation = exif_data[orientation_key]
                rotations = {3: 180, 6: 270, 8: 90}
                if orientation in rotations:
                    pil_img = pil_img.rotate(rotations[orientation], expand=True)
    except Exception:
        pass  # No EXIF or unsupported format — proceed as-is

    pil_img = pil_img.convert('RGB')
    return cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)


def calculate_metrics(original, enhanced):
    """
    Calculates sharpness, contrast, PSNR, and SNR for original and enhanced images.
    """
    def sharpness_contrast(img):
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        sharpness = cv2.Laplacian(gray, cv2.CV_64F).var()
        contrast = gray.std()
        return float(sharpness), float(contrast)

    def compute_psnr(img1, img2):
        """Peak Signal-to-Noise Ratio between original and enhanced."""
        mse = np.mean((img1.astype(np.float64) - img2.astype(np.float64)) ** 2)
        if mse == 0:
            return float('inf')
        return float(10 * np.log10((255.0 ** 2) / mse))

    def compute_snr(img):
        """Signal-to-Noise Ratio of a single image (signal=mean, noise=std)."""
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY).astype(np.float64)
        mean = np.mean(gray)
        std = np.std(gray)
        if std == 0:
            return float('inf')
        return float(20 * np.log10(mean / std))

    sharp_before, contrast_before = sharpness_contrast(original)
    sharp_after, contrast_after = sharpness_contrast(enhanced)
    psnr = compute_psnr(original, enhanced)
    snr_before = compute_snr(original)
    snr_after = compute_snr(enhanced)

    return {
        "sharpness_before": sharp_before,
        "sharpness_after": sharp_after,
        "contrast_before": contrast_before,
        "contrast_after": contrast_after,
        "psnr": round(psnr, 2) if psnr != float('inf') else None,
        "snr_before": round(snr_before, 2),
        "snr_after": round(snr_after, 2),
    }


def image_to_base64(image, fmt='png', quality=90):
    """Encodes a BGR numpy array to a base64 data URI."""
    if fmt == 'jpeg':
        encode_params = [cv2.IMWRITE_JPEG_QUALITY, quality]
        _, buffer = cv2.imencode('.jpg', image, encode_params)
        mime = 'image/jpeg'
    elif fmt == 'webp':
        encode_params = [cv2.IMWRITE_WEBP_QUALITY, quality]
        _, buffer = cv2.imencode('.webp', image, encode_params)
        mime = 'image/webp'
    else:
        _, buffer = cv2.imencode('.png', image)
        mime = 'image/png'
    return f"data:{mime};base64,{base64.b64encode(buffer).decode('utf-8')}"


# ── Adaptive Pipeline ────────────────────────────────────────────────────────

def run_adaptive_pipeline(image, analysis, sharpness_strength, noise_strength,
                           color_strength, contrast_strength):
    """
    Applies enhancement steps in an adaptive order:
      1. EXIF rotation already done upstream.
      2. Overexposure correction (before anything else if needed)
      3. Colour correction
      4. Noise reduction   ← always before sharpening
      5. Sharpening        ← after denoising to avoid amplifying noise
      6. Contrast (CLAHE)  ← last, as a global tone adjustment
    """
    is_blurred = analysis['blur']
    noise_type = analysis['noise_type']
    brightness_level = analysis['brightness']
    enhanced = image.copy()

    # Step 1: Fix overexposure first so subsequent steps work on correct tones
    if brightness_level == 'high':
        enhanced = apply_gamma_correction(enhanced, gamma=0.6)

    # Step 2: Colour correction
    effective_color = color_strength if color_strength > 0 else (0.4 if color_strength == -1 else 0)
    if effective_color > 0:
        enhanced = apply_color_correction(enhanced, effective_color)

    # Step 3: Noise reduction (before sharpening — critical order)
    effective_noise = noise_strength if noise_strength != -1 else (5 if noise_type != 'none' else 0)
    if effective_noise >= 3:
        if noise_type == 'salt_pepper':
            enhanced = apply_median_filter(enhanced, effective_noise)
        else:
            enhanced = apply_gaussian_filter(enhanced, effective_noise)

    # Step 4: Sharpening (after denoising to avoid amplifying noise)
    effective_sharpness = sharpness_strength if sharpness_strength != -1 else (1.5 if is_blurred else 0)
    if effective_sharpness > 0:
        enhanced = apply_sharpening(enhanced, effective_sharpness)

    # Step 5: Contrast — skip for overexposed images unless user explicitly set it
    effective_contrast = contrast_strength
    if contrast_strength > 0:
        enhanced = apply_clahe(enhanced, contrast_strength)
    elif contrast_strength == -1 and brightness_level == 'low':
        effective_contrast = 2.0
        enhanced = apply_clahe(enhanced, 2.0)
    else:
        effective_contrast = 0.0

    applied_tuning = {
        "sharpness": effective_sharpness,
        "noise": effective_noise,
        "color": effective_color,
        "contrast": effective_contrast
    }

    return enhanced, applied_tuning


# ── Route ────────────────────────────────────────────────────────────────────

@app.route('/process-image', methods=['POST'])
def process_image():
    if 'image' not in request.files:
        return jsonify({"error": "No image provided."}), 400

    file = request.files['image']

    # — Validation —
    err = validate_file(file)
    if err:
        return jsonify({"error": err}), 400

    # — Read & EXIF rotate —
    file_bytes = file.read()
    try:
        image = auto_rotate_exif(file_bytes)
    except Exception:
        # Fallback: raw OpenCV decode
        arr = np.frombuffer(file_bytes, np.uint8)
        image = cv2.imdecode(arr, cv2.IMREAD_COLOR)

    if image is None:
        return jsonify({"error": "Invalid or corrupted image file."}), 400

    # — Tuning params (-1 = Auto) —
    sharpness_strength = float(request.form.get('sharpness', -1))
    noise_strength     = float(request.form.get('noise', -1))
    color_strength     = float(request.form.get('color', -1))
    contrast_strength  = float(request.form.get('contrast', -1))
    output_format      = request.form.get('format', 'png').lower()   # png | jpeg | webp
    output_quality     = int(request.form.get('quality', 90))

    # — Analysis —
    is_blurred, blur_variance, blur_threshold = detect_blur(image)
    noise_type, noise_variance               = detect_noise(image)
    brightness_level, brightness_mean        = detect_brightness(image)

    analysis = {
        "blur":       bool(is_blurred),
        "noise_type": noise_type,
        "brightness": brightness_level,       # "low" | "normal" | "high"
    }

    # — Adaptive Enhancement —
    enhanced, applied_tuning = run_adaptive_pipeline(
        image, analysis,
        sharpness_strength, noise_strength, color_strength, contrast_strength
    )

    # — Metrics —
    metrics = calculate_metrics(image, enhanced)

    return jsonify({
        "enhanced_image": image_to_base64(enhanced, fmt=output_format, quality=output_quality),
        "analysis":       analysis,
        "metrics":        metrics,
        "applied_tuning": applied_tuning,
    })


if __name__ == '__main__':
    app.run(debug=True, port=5000)
