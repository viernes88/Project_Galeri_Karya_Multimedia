from flask import Blueprint, jsonify, request

from .. import db
from ..utils import ApiError

bp = Blueprint("submissions", __name__)

VALID_STATUS = {"pending", "minted", "rejected"}


def _get_pending(sub_id):
    sub = db.get_submission(sub_id)
    if not sub:
        raise ApiError("Pengajuan tidak ditemukan.", 404)
    if sub["status"] != "pending":
        raise ApiError(f"Pengajuan sudah berstatus '{sub['status']}'.", 409)
    return sub


@bp.get("/submissions")
def list_submissions():
    """Query opsional: ?status=pending|minted|rejected&creator=0x..."""
    status = request.args.get("status")
    if status and status not in VALID_STATUS:
        raise ApiError("status tidak valid.")
    return jsonify(db.list_submissions(status=status, creator=request.args.get("creator")))


@bp.get("/submissions/<int:sub_id>")
def get_submission(sub_id):
    sub = db.get_submission(sub_id)
    if not sub:
        raise ApiError("Pengajuan tidak ditemukan.", 404)
    return jsonify(sub)


@bp.post("/submissions/<int:sub_id>/minted")
def mark_minted(sub_id):
    """Dipanggil frontend setelah transaksi mint sukses. Body: { tokenId, txHash }"""
    _get_pending(sub_id)
    body = request.get_json(silent=True) or {}
    try:
        token_id = int(body.get("tokenId"))
    except (TypeError, ValueError):
        raise ApiError("tokenId wajib berupa angka.")
    db.update_status(sub_id, "minted", token_id=token_id, tx_hash=body.get("txHash"))
    return jsonify(db.get_submission(sub_id))


@bp.post("/submissions/<int:sub_id>/reject")
def reject(sub_id):
    """Body opsional: { note }"""
    _get_pending(sub_id)
    body = request.get_json(silent=True) or {}
    db.update_status(sub_id, "rejected", note=str(body.get("note", ""))[:500] or None)
    return jsonify(db.get_submission(sub_id))
