from flask import Blueprint, jsonify, request

from ..services import cnn_service, svm_service
from ..services.cnn_service import ModelNotReady
from ..utils import ApiError, read_image_upload, sha256_hex

bp = Blueprint("predict", __name__)


@bp.post("/predict")
def predict():
    """Terima foto, kembalikan genre (CNN), hash file, dan data EXIF.
    Tambahkan ?compare=1 untuk menyertakan hasil baseline SVM."""
    data, img, exif, _mime, _name = read_image_upload("image")

    try:
        cnn = cnn_service.predict(img)
    except ModelNotReady as e:
        raise ApiError(str(e), 503)

    result = {
        "genre": cnn["label"],
        "confidence": cnn["confidence"],
        "uncertain": cnn["uncertain"],  # true => minta kreator memilih genre manual
        "probabilities": cnn["probabilities"],
        "classes": cnn_service.classes(),
        "fileHash": sha256_hex(data),
        "exif": exif,
    }

    if request.args.get("compare") == "1":
        try:
            result["svm"] = svm_service.predict(img)
        except ModelNotReady:
            result["svm"] = None

    return jsonify(result)
