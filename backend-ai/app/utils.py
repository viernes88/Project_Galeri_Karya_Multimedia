import hashlib
import io

from flask import request
from PIL import Image, ImageOps

from .config import Config
from .ml.preprocess import extract_exif


class ApiError(Exception):
    def __init__(self, message, status=400):
        super().__init__(message)
        self.message = message
        self.status = status


def sha256_hex(data: bytes) -> str:
    """Hash SHA-256 (32 byte) berawalan 0x, langsung cocok dengan tipe bytes32 di Solidity."""
    return "0x" + hashlib.sha256(data).hexdigest()


def read_image_upload(field: str = "image"):
    """Validasi file upload. Return (bytes, PIL RGB, exif dict, mimetype, filename)."""
    f = request.files.get(field)
    if f is None or not f.filename:
        raise ApiError(f"File gambar wajib diunggah (field '{field}').")

    ext = f.filename.rsplit(".", 1)[-1].lower() if "." in f.filename else ""
    if ext not in Config.ALLOWED_EXTENSIONS:
        allowed = ", ".join(sorted(Config.ALLOWED_EXTENSIONS))
        raise ApiError(f"Format file tidak didukung. Gunakan: {allowed}.")

    data = f.read()
    try:
        img = Image.open(io.BytesIO(data))
        img.load()
    except Exception:
        raise ApiError("File bukan gambar yang valid.")

    exif = extract_exif(img)  # ambil EXIF sebelum orientasi diputar
    img = ImageOps.exif_transpose(img).convert("RGB")
    return data, img, exif, f.mimetype or "application/octet-stream", f.filename
