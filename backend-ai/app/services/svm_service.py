import threading

from ..config import Config
from .cnn_service import ModelNotReady

_lock = threading.Lock()
_pipeline = None


def _load():
    global _pipeline
    if _pipeline is not None:
        return
    with _lock:
        if _pipeline is not None:
            return
        if not Config.SVM_MODEL_PATH.exists():
            raise ModelNotReady(
                "Model SVM belum tersedia. Jalankan training: python -m training.train_svm"
            )
        import joblib
        _pipeline = joblib.load(Config.SVM_MODEL_PATH)


def predict(img) -> dict:
    _load()
    from ..ml.features import extract_features

    feats = extract_features(img).reshape(1, -1)
    probs = _pipeline.predict_proba(feats)[0].tolist()
    classes = list(_pipeline.classes_)
    best = max(range(len(probs)), key=lambda i: probs[i])
    return {
        "label": classes[best],
        "confidence": round(probs[best], 4),
        "probabilities": {c: round(p, 4) for c, p in zip(classes, probs)},
        "uncertain": probs[best] < Config.CONFIDENCE_THRESHOLD,
    }
