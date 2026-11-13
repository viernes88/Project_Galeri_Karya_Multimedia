"""Latih baseline SVM (histogram warna HSV + tekstur GLCM).

Jalankan dari folder backend-ai:  python -m training.train_svm
"""
import argparse
from pathlib import Path

import joblib
import numpy as np
from sklearn.metrics import accuracy_score
from sklearn.model_selection import GridSearchCV
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.svm import SVC

from app.ml.features import extract_features
from app.ml.preprocess import load_rgb

EXTS = {".jpg", ".jpeg", ".png", ".webp"}


def load_split(folder: Path):
    X, y = [], []
    for cls_dir in sorted(d for d in folder.iterdir() if d.is_dir()):
        files = [f for f in cls_dir.iterdir() if f.suffix.lower() in EXTS]
        print(f"  {folder.name}/{cls_dir.name}: {len(files)} gambar")
        for f in files:
            X.append(extract_features(load_rgb(f)))
            y.append(cls_dir.name)
    return np.array(X), np.array(y)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", default="data")
    ap.add_argument("--out", default="saved_models/svm_baseline.joblib")
    args = ap.parse_args()

    data = Path(args.data)
    print("Ekstraksi fitur...")
    X_train, y_train = load_split(data / "train")
    X_val, y_val = load_split(data / "val")

    pipe = Pipeline([
        ("scaler", StandardScaler()),
        ("svc", SVC(kernel="rbf", probability=True, random_state=42)),
    ])
    grid = {"svc__C": [1, 10, 100], "svc__gamma": ["scale", 0.01, 0.001]}
    search = GridSearchCV(pipe, grid, cv=3, n_jobs=-1, verbose=1)
    search.fit(X_train, y_train)

    print("Parameter terbaik:", search.best_params_)
    print(f"Akurasi CV (train): {search.best_score_:.3f}")
    print(f"Akurasi validasi  : {accuracy_score(y_val, search.predict(X_val)):.3f}")

    out = Path(args.out)
    out.parent.mkdir(exist_ok=True)
    joblib.dump(search.best_estimator_, out)
    print("Model:", out)


if __name__ == "__main__":
    main()
