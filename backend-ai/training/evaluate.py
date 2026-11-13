"""Evaluasi CNN vs SVM pada data uji: akurasi, precision/recall/F1, confusion matrix, waktu.

Jalankan dari folder backend-ai:  python -m training.evaluate
Hasil tersimpan di folder results/
"""
import argparse
import json
import time
from pathlib import Path

import joblib
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import torch
from sklearn.metrics import (ConfusionMatrixDisplay, accuracy_score,
                             classification_report, precision_recall_fscore_support)
from torchvision import datasets

from app.ml.features import extract_features
from app.ml.model import build_model
from app.ml.preprocess import eval_transform, load_rgb


def metrics(name, y_true, y_pred, classes, ms_per_image, out_dir):
    acc = accuracy_score(y_true, y_pred)
    p, r, f1, _ = precision_recall_fscore_support(y_true, y_pred, average="macro", zero_division=0)
    report = classification_report(y_true, y_pred, target_names=classes, zero_division=0)
    print(f"\n===== {name} =====\n{report}")

    fig, ax = plt.subplots(figsize=(5, 4.5))
    ConfusionMatrixDisplay.from_predictions(
        y_true, y_pred, display_labels=classes, cmap="Blues", ax=ax, colorbar=False)
    ax.set_title(f"Confusion Matrix - {name}")
    fig.tight_layout()
    fig.savefig(out_dir / f"confusion_{name.lower()}.png", dpi=150)
    plt.close(fig)

    (out_dir / f"report_{name.lower()}.txt").write_text(report)
    return {"model": name, "accuracy": acc, "precision_macro": p, "recall_macro": r,
            "f1_macro": f1, "ms_per_image": ms_per_image}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", default="data")
    ap.add_argument("--models", default="saved_models")
    ap.add_argument("--out", default="results")
    args = ap.parse_args()

    out_dir = Path(args.out)
    out_dir.mkdir(exist_ok=True)

    ds = datasets.ImageFolder(Path(args.data) / "test")
    classes = ds.classes
    paths = [p for p, _ in ds.samples]
    y_true = [t for _, t in ds.samples]
    print("Kelas:", classes, "| data uji:", len(paths))

    rows = []

    # ---- CNN ----
    ckpt = torch.load(Path(args.models) / "cnn_genre.pt", map_location="cpu")
    if ckpt["classes"] != classes:
        raise SystemExit(f"Urutan kelas model {ckpt['classes']} berbeda dengan data uji {classes}")
    model = build_model(len(classes))
    model.load_state_dict(ckpt["state_dict"])
    model.eval()
    tf = eval_transform()

    t0 = time.perf_counter()
    y_cnn = []
    with torch.no_grad():
        for i in range(0, len(paths), 32):
            batch = torch.stack([tf(load_rgb(p)) for p in paths[i:i + 32]])
            y_cnn += model(batch).argmax(1).tolist()
    cnn_ms = (time.perf_counter() - t0) / len(paths) * 1000
    rows.append(metrics("CNN", y_true, y_cnn, classes, cnn_ms, out_dir))

    # ---- SVM ----
    pipe = joblib.load(Path(args.models) / "svm_baseline.joblib")
    t0 = time.perf_counter()
    feats = np.stack([extract_features(load_rgb(p)) for p in paths])
    y_svm = [classes.index(label) for label in pipe.predict(feats)]
    svm_ms = (time.perf_counter() - t0) / len(paths) * 1000
    rows.append(metrics("SVM", y_true, y_svm, classes, svm_ms, out_dir))

    (out_dir / "comparison.json").write_text(json.dumps(rows, indent=2))

    print("\n===== PERBANDINGAN (data uji) =====")
    print(f"{'Model':<6}{'Akurasi':>9}{'Precision':>11}{'Recall':>8}{'F1':>8}{'ms/img':>9}")
    for r in rows:
        print(f"{r['model']:<6}{r['accuracy']:>9.3f}{r['precision_macro']:>11.3f}"
              f"{r['recall_macro']:>8.3f}{r['f1_macro']:>8.3f}{r['ms_per_image']:>9.1f}")
    print(f"\nHasil lengkap tersimpan di {out_dir}/")


if __name__ == "__main__":
    main()
