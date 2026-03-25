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
        # Edge density estimation for dynamic threshold
        edges = cv2.Canny(gray, 50, 150)
        edge_density = np.sum(edges > 0) / edges.size
        # Higher edge density images naturally have higher variance.
        # We adjust the threshold: basic is 100, but scales with edge density.
        threshold = max(50.0, edge_density * 2000.0)
    else:
        threshold = 100.0
        
    is_blurred = variance < threshold
    return is_blurred, variance, threshold

def detect_noise(image):
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    
    total_pixels = gray.size
    black_pixels = np.sum(gray == 0)
    white_pixels = np.sum(gray == 255)
    sp_ratio = (black_pixels + white_pixels) / total_pixels
    
    # Estimate Gaussian noise by comparing to a median blurred version
    blur = cv2.medianBlur(gray, 3)
    diff = cv2.absdiff(gray, blur)
    noise_variance = np.mean(diff)
    
    # Calculate sharpness to avoid blurring highly detailed images
    sharpness = cv2.Laplacian(gray, cv2.CV_64F).var()
    
    noise_type = "none"
    if sp_ratio > 0.01: 
        noise_type = "salt_pepper"
    elif noise_variance > 10.0 and sharpness < 800: 
        noise_type = "gaussian"
        
    return noise_type, noise_variance

def detect_brightness(image):
    """
    Detects if an image has low brightness using Histogram Analysis.
    """
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    mean_brightness = np.mean(gray)
    
    # Calculate histogram
    hist = cv2.calcHist([gray], [0], None, [256], [0, 256])
    hist = hist.flatten() / hist.sum() # Normalize
    
    # Calculate cumulative distribution function (CDF)
    cdf = hist.cumsum()
    
    # If 50% of the pixels have an intensity below 60 (very dark), flag as low brightness.
    median_intensity = np.searchsorted(cdf, 0.5)
    
    is_low = median_intensity < 60 or mean_brightness < 90
    return "low" if is_low else "normal", mean_brightness
