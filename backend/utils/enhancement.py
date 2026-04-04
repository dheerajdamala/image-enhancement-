import cv2
import numpy as np

def apply_color_correction(image, strength=1.0):
    """
    Applies Gray World auto color correction.
    Blends original with corrected based on strength (0.0 to 1.0).
    """
    if strength <= 0:
        return image

    float_img = image.astype(np.float32)
    b, g, r = cv2.split(float_img)

    mean_b = np.mean(b)
    mean_g = np.mean(g)
    mean_r = np.mean(r)
    mean_gray = (mean_b + mean_g + mean_r) / 3.0

    if mean_b == 0 or mean_g == 0 or mean_r == 0:
        return image

    b_corr = b * (mean_gray / mean_b)
    g_corr = g * (mean_gray / mean_g)
    r_corr = r * (mean_gray / mean_r)

    corrected = cv2.merge([b_corr, g_corr, r_corr])
    corrected = np.clip(corrected, 0, 255).astype(np.uint8)

    if strength < 1.0:
        return cv2.addWeighted(corrected, strength, image, 1.0 - strength, 0)
    return corrected


def apply_sharpening(image, strength=1.0):
    """
    Applies an unsharp mask based on strength.
    strength: 0.0 to 3.0+
    """
    if strength <= 0:
        return image
    gaussian = cv2.GaussianBlur(image, (0, 0), 2.0)
    sharpened = cv2.addWeighted(image, 1.0 + strength, gaussian, -strength, 0)
    return sharpened


def apply_median_filter(image, strength=3):
    """
    Applies median filtering. Strength must be odd integer >= 3.
    """
    ksize = int(strength)
    if ksize % 2 == 0:
        ksize += 1
    if ksize < 3:
        return image
    return cv2.medianBlur(image, ksize)


def apply_gaussian_filter(image, strength=5):
    """
    Applies Gaussian blur. Strength corresponds to kernel size.
    """
    ksize = int(strength)
    if ksize % 2 == 0:
        ksize += 1
    if ksize < 3:
        return image
    return cv2.GaussianBlur(image, (ksize, ksize), 0)


def apply_clahe(image, strength=2.0):
    """
    Applies CLAHE in LAB space based on strength clip limit.
    """
    if strength <= 0:
        return image
    lab = cv2.cvtColor(image, cv2.COLOR_BGR2LAB)
    l, a, b = cv2.split(lab)

    clahe_obj = cv2.createCLAHE(clipLimit=float(strength), tileGridSize=(8, 8))
    cl = clahe_obj.apply(l)

    limg = cv2.merge((cl, a, b))
    enhanced = cv2.cvtColor(limg, cv2.COLOR_LAB2BGR)
    return enhanced


def apply_gamma_correction(image, gamma=0.5):
    """
    Applies gamma correction to reduce overexposure (gamma > 1 brightens, < 1 darkens).
    For overexposed images, use gamma < 1 (e.g. 0.5-0.7).
    """
    inv_gamma = 1.0 / gamma
    table = np.array([((i / 255.0) ** inv_gamma) * 255 for i in range(256)]).astype(np.uint8)
    return cv2.LUT(image, table)
