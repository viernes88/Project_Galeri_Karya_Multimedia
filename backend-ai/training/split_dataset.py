"""Bagi data/raw/<kelas>/* menjadi data/train, data/val, data/test (stratified per kelas).

Jalankan dari folder backend-ai:  python -m training.split_dataset
"""
import argparse
import random
import shutil
import sys
from pathlib import Path

EXTS = {".jpg", ".jpeg", ".png", ".webp"}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--raw", default="data/raw")
    ap.add_argument("--out", default="data")
    ap.add_argument("--ratios", nargs=3, type=float, default=[0.70, 0.15, 0.15])
    ap.add_argument("--seed", type=int, default=42)
    ap.add_argument("--force", action="store_true", help="timpa train/val/test yang sudah ada")
    args = ap.parse_args()

    raw, out = Path(args.raw), Path(args.out)
    if abs(sum(args.ratios) - 1.0) > 1e-6:
        sys.exit("Jumlah rasio harus 1.0")

    splits = ["train", "val", "test"]
    existing = [out / s for s in splits if (out / s).exists()]
    if existing and not args.force:
        sys.exit(f"{[str(p) for p in existing]} sudah ada. Gunakan --force untuk menimpa.")
    for p in existing:
        shutil.rmtree(p)

    classes = sorted(d.name for d in raw.iterdir() if d.is_dir())
    if not classes:
        sys.exit(f"Tidak ada folder kelas di {raw}")

    rng = random.Random(args.seed)
    print(f"{'kelas':<10}{'total':>7}{'train':>7}{'val':>6}{'test':>6}")
    for cls in classes:
        files = sorted(f for f in (raw / cls).iterdir() if f.suffix.lower() in EXTS)
        if len(files) < 10:
            print(f"PERINGATAN: kelas '{cls}' hanya punya {len(files)} gambar.")
        rng.shuffle(files)

        n = len(files)
        n_train = int(n * args.ratios[0])
        n_val = int(n * args.ratios[1])
        parts = {
            "train": files[:n_train],
            "val": files[n_train:n_train + n_val],
            "test": files[n_train + n_val:],
        }
        for split, items in parts.items():
            dest = out / split / cls
            dest.mkdir(parents=True, exist_ok=True)
            for f in items:
                shutil.copy2(f, dest / f.name)
        print(f"{cls:<10}{n:>7}{len(parts['train']):>7}{len(parts['val']):>6}{len(parts['test']):>6}")


if __name__ == "__main__":
    main()
