from flask import Blueprint, jsonify, request

from ..config import Config
from ..services import llm_service
from ..utils import ApiError

bp = Blueprint("describe", __name__)


@bp.post("/describe")
def describe():
    """Body JSON: { title, genre, confidence?, technical: {camera, lens, focal_length,
    aperture, shutter, iso, location, notes} }"""
    body = request.get_json(silent=True) or {}

    genre = str(body.get("genre", "")).lower()
    if genre not in Config.GENRES:
        raise ApiError(f"genre harus salah satu dari: {', '.join(Config.GENRES)}")

    technical = body.get("technical") or {}
    if not isinstance(technical, dict):
        raise ApiError("technical harus berupa objek.")

    confidence = body.get("confidence")
    try:
        confidence = float(confidence) if confidence is not None else None
    except (TypeError, ValueError):
        raise ApiError("confidence harus berupa angka.")

    try:
        text, provider, model = llm_service.generate_description(
            str(body.get("title", ""))[:100], genre, confidence, technical
        )
    except llm_service.LLMError as e:
        raise ApiError(str(e), 502)

    return jsonify(description=text, provider=provider, model=model)
