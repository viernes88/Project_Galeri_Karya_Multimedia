import logging
from flask import Flask, jsonify
from flask_cors import CORS

from .config import Config
from .utils import ApiError


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    CORS(app, origins=Config.CORS_ORIGINS)
    logging.basicConfig(level=logging.INFO)

    from .db import init_db
    init_db()

    from .routes.predict import bp as predict_bp
    from .routes.describe import bp as describe_bp
    from .routes.ipfs import bp as ipfs_bp
    from .routes.submissions import bp as submissions_bp

    for bp in (predict_bp, describe_bp, ipfs_bp, submissions_bp):
        app.register_blueprint(bp, url_prefix="/api")

    @app.get("/api/health")
    def health():
        return jsonify(
            status="ok",
            cnnModel=Config.CNN_MODEL_PATH.exists(),
            svmModel=Config.SVM_MODEL_PATH.exists(),
            llmProvider=Config.LLM_PROVIDER,
            llmConfigured=bool(Config.LLM_API_KEY) or Config.LLM_PROVIDER == "ollama",
            pinataConfigured=bool(Config.PINATA_JWT),
        )

    @app.errorhandler(ApiError)
    def handle_api_error(e):
        return jsonify(error=e.message), e.status

    @app.errorhandler(413)
    def too_large(_):
        mb = Config.MAX_CONTENT_LENGTH // (1024 * 1024)
        return jsonify(error=f"Ukuran file melebihi batas {mb} MB."), 413

    @app.errorhandler(404)
    def not_found(_):
        return jsonify(error="Endpoint tidak ditemukan."), 404

    @app.errorhandler(Exception)
    def unexpected(e):
        app.logger.exception("Kesalahan tak terduga")
        return jsonify(error="Terjadi kesalahan pada server."), 500

    return app
