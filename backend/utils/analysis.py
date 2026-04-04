import cv2
import numpy as np

def detect_blur(image, dynamic=True):
    """
    Detects if an image is blurred using Variance of Laplacian
    with a dynamically calculated threshold based on edge density.
    """
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    variance = cv2.Laplacian(gray, cv2.CV_64F).var()

    if dynamic:
        edges = cv2.Canny(gray, 50, 150)
        edge_density = np.sum(edges > 0) / edges.size
        threshold = max(50.0, edge_density * 2000.0)
    else:
        threshold = 100.0

    is_blurred = variance < threshold
    return is_blurred, variance, threshold


def detect_noise(image):
    """
    Detects noise type in an image.
    - Salt & Pepper: pure black/white pixel ratio, cross-validated with noise variance
      to avoid false positives on images with large flat regions.
    - Gaussian: residual noise from median-blur diff, only when image is not very sharp.
    """
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

    total_pixels = gray.size
    black_pixels = np.sum(gray == 0)
    white_pixels = np.sum(gray == 255)
    sp_ratio = (black_pixels + white_pixels) / total_pixels

    # Estimate noise by comparing to a median blurred version
    blur = cv2.medianBlur(gray, 3)
    diff = cv2.absdiff(gray, blur)
    noise_variance = np.mean(diff)

    # Sharpness to avoid flagging detailed images as noisy
    sharpness = cv2.Laplacian(gray, cv2.CV_64F).var()

    noise_type = "none"
    # Raised threshold to 0.05 AND require noise_variance > 5 to reduce false positives
    # (e.g. images with black bars or white backgrounds were triggering at 0.01)
    if sp_ratio > 0.05 and noise_variance > 5.0:
        noise_type = "salt_pepper"
    elif noise_variance > 10.0 and sharpness < 800:
        noise_type = "gaussian"

    return noise_type, noise_variance


def detect_brightness(image):
    """
    Detects if an image has low or high (overexposed) brightness
    using mean brightness and CDF of the grayscale histogram.
    Returns: ("low" | "high" | "normal", mean_brightness)
    """
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    mean_brightness = np.mean(gray)

    hist = cv2.calcHist([gray], [0], None, [256], [0, 256])
    hist = hist.flatten() / hist.sum()
    cdf = hist.cumsum()

    # Median intensity = intensity at which 50% of pixels fall below
    median_intensity = np.searchsorted(cdf, 0.5)

    if median_intensity < 60 or mean_brightness < 90:
        return "low", mean_brightness
    elif median_intensity > 200 or mean_brightness > 200:
        return "high", mean_brightness
    else:
        return "normal", mean_brightness
