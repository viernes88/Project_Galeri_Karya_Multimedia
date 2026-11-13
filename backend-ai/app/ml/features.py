"""Ekstraksi fitur klasik untuk baseline SVM: histogram warna (HSV) + tekstur GLCM."""
import numpy as np
from skimage.feature import graycomatrix, graycoprops

HIST_BINS = 16
GLCM_LEVELS = 32
GLCM_SIZE = 128
DISTANCES = [1, 2, 4]
ANGLES = [0, np.pi / 4, np.pi / 2, 3 * np.pi / 4]
PROPS = ["contrast", "dissimilarity", "homogeneity", "energy", "correlation"]


def color_histogram(img) -> np.ndarray:
    """3 kanal HSV x 16 bin = 48 fitur (ternormalisasi)."""
    hsv = np.asarray(img.resize((128, 128)).convert("HSV"))
    feats = []
    for ch in range(3):
        hist, _ = np.histogram(hsv[:, :, ch], bins=HIST_BINS, range=(0, 256))
        feats.append(hist / max(hist.sum(), 1))
    return np.concatenate(feats)


def glcm_features(img) -> np.ndarray:
    """5 properti GLCM x 3 jarak (rata-rata 4 sudut) = 15 fitur."""
    gray = np.asarray(img.resize((GLCM_SIZE, GLCM_SIZE)).convert("L"))
    quantized = (gray // (256 // GLCM_LEVELS)).astype(np.uint8)  # 0..31
    glcm = graycomatrix(quantized, DISTANCES, ANGLES, levels=GLCM_LEVELS,
                        symmetric=True, normed=True)
    feats = []
    for prop in PROPS:
        values = graycoprops(glcm, prop)  # shape (jarak, sudut)
        feats.extend(values.mean(axis=1))
    return np.array(feats)


def extract_features(img) -> np.ndarray:
    """Vektor 63 fitur: 48 histogram warna + 15 tekstur GLCM."""
    return np.nan_to_num(np.concatenate([color_histogram(img), glcm_features(img)]))
