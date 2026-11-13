import threading

from ..config import Config

_lock = threading.Lock()
_model = None
_classes = None


class ModelNotReady(RuntimeError):
    pass


def _load():
    global _model, _classes
    if _model is not None:
        return
    with _lock:
        if _model is not None:
            return
        if not Config.CNN_MODEL_PATH.exists():
            raise ModelNotReady(
                "Model CNN belum tersedia. Jalankan training: python -m training.train_cnn"
            )
        import torch
        from ..ml.model import build_model

        ckpt = torch.load(Config.CNN_MODEL_PATH, map_location="cpu")
        model = build_model(len(ckpt["classes"]), pretrained=False)
        model.load_state_dict(ckpt["state_dict"])
        model.eval()
        _classes = list(ckpt["classes"])
        _model = model


def classes():
    _load()
    return list(_classes)


def predict(img) -> dict:
    """Return label, confidence, probabilities, dan flag uncertain."""
    _load()
    import torch
    from ..ml.preprocess import eval_transform

    x = eval_transform()(img).unsqueeze(0)
    with torch.no_grad():
        probs = torch.softmax(_model(x), dim=1)[0].tolist()

    best = max(range(len(probs)), key=lambda i: probs[i])
    return {
        "label": _classes[best],
        "confidence": round(probs[best], 4),
        "probabilities": {c: round(p, 4) for c, p in zip(_classes, probs)},
        "uncertain": probs[best] < Config.CONFIDENCE_THRESHOLD,
    }
