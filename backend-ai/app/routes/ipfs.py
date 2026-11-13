import json
import re
from datetime import datetime, timezone

from flask import Blueprint, jsonify, request

from .. import db
from ..config import Config
from ..services import ipfs_service
from ..utils import ApiError, read_image_upload, sha256_hex

bp = Blueprint("ipfs", __name__)

ADDRESS_RE = re.compile(r"^0x[a-fA-F0-9]{40}$")
TECH_ATTRS = [
    ("camera", "Kamera"), ("lens", "Lensa"), ("focal_length", "Panjang Fokus"),
    ("aperture", "Aperture"), ("shutter", "Shutter Speed"), ("iso", "ISO"),
    ("location", "Lokasi"),
]


@bp.post("/ipfs/upload")
def upload_to_ipfs():
    """multipart/form-data:
       image, title, description, genre, creator (alamat wallet),
       confidence (opsional), technical (opsional, string JSON).
    Mengunggah gambar lalu metadata ke IPFS, menyimpan pengajuan berstatus 'pending'."""
    data, _img, _exif, mimetype, filename = read_image_upload("image")
    form = request.form

    title = form.get("title", "").strip()
    description = form.get("description", "").strip()
    genre = form.get("genre", "").strip().lower()
    creator = form.get("creator", "").strip()

    if not title or len(title) > 100:
        raise ApiError("title wajib diisi (maksimal 100 karakter).")
    if not description or len(description) > 2000:
        raise ApiError("description wajib diisi (maksimal 2000 karakter).")
    if genre not in Config.GENRES:
        raise ApiError(f"genre harus salah satu dari: {', '.join(Config.GENRES)}")
    if not ADDRESS_RE.match(creator):
        raise ApiError("creator harus berupa alamat wallet Ethereum yang valid.")

    try:
        technical = json.loads(form.get("technical") or "{}")
        if not isinstance(technical, dict):
            raise ValueError
    except ValueError:
        raise ApiError("technical harus berupa string JSON objek.")

    try:
        confidence = float(form["confidence"]) if form.get("confidence") else None
    except ValueError:
        raise ApiError("confidence harus berupa angka.")

    file_hash = sha256_hex(data)
    if db.find_by_hash(file_hash):
        raise ApiError("Foto ini sudah pernah diajukan atau diterbitkan.", 409)

    attributes = [{"trait_type": "Genre", "value": genre.capitalize()}]
    attributes += [
        {"trait_type": label, "value": str(technical[key])}
        for key, label in TECH_ATTRS if technical.get(key)
    ]

    try:
        image_cid = ipfs_service.upload_file(data, filename, mimetype, name=title)
        metadata = {
            "name": title,
            "description": description,
            "image": f"ipfs://{image_cid}",
            "attributes": attributes,
            "properties": {
                "creator": creator.lower(),
                "fileHash": file_hash,
                "aiConfidence": confidence,
                "createdAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
            },
        }
        metadata_cid = ipfs_service.upload_json(metadata, name=f"{title} (metadata)")
    except ipfs_service.IPFSError as e:
        raise ApiError(str(e), 502)

    token_uri = f"ipfs://{metadata_cid}"
    sub_id = db.insert_submission({
        "creator": creator.lower(), "title": title, "description": description,
        "genre": genre, "confidence": confidence, "file_hash": file_hash,
        "image_cid": image_cid, "metadata_cid": metadata_cid, "token_uri": token_uri,
    })

    return jsonify(
        submissionId=sub_id, imageCid=image_cid, metadataCid=metadata_cid,
        tokenURI=token_uri, fileHash=file_hash,
        imageUrl=f"{Config.IPFS_GATEWAY}/{image_cid}", status="pending",
    ), 201
