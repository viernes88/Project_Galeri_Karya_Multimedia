"""Latih CNN (MobileNetV2, transfer learning) untuk 3 genre.

Fase 1: bekukan backbone, latih kepala klasifikasi.
Fase 2: fine-tuning beberapa blok terakhir dengan learning rate kecil.

Jalankan dari folder backend-ai:  python -m training.train_cnn
"""
import argparse
import json
import time
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import torch
import torch.nn as nn
from torch.utils.data import DataLoader
from torchvision import datasets

from app.ml.model import build_model
from app.ml.preprocess import IMG_SIZE, eval_transform, train_transform


def run_epoch(model, loader, criterion, device, optimizer=None, freeze_backbone=False):
    training = optimizer is not None
    model.train(training)
    if training and freeze_backbone:
        model.features.eval()  # jaga statistik BatchNorm backbone tetap

    total_loss, correct, n = 0.0, 0, 0
    with torch.set_grad_enabled(training):
        for x, y in loader:
            x, y = x.to(device), y.to(device)
            out = model(x)
            loss = criterion(out, y)
            if training:
                optimizer.zero_grad()
                loss.backward()
                optimizer.step()
            total_loss += loss.item() * x.size(0)
            correct += (out.argmax(1) == y).sum().item()
            n += x.size(0)
    return total_loss / n, correct / n


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", default="data")
    ap.add_argument("--out", default="saved_models")
    ap.add_argument("--epochs-head", type=int, default=8)
    ap.add_argument("--epochs-finetune", type=int, default=6)
    ap.add_argument("--batch-size", type=int, default=32)
    ap.add_argument("--lr", type=float, default=1e-3)
    ap.add_argument("--lr-finetune", type=float, default=1e-4)
    ap.add_argument("--workers", type=int, default=2, help="isi 0 jika error di Windows")
    args = ap.parse_args()

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print("Device:", device)

    data = Path(args.data)
    train_ds = datasets.ImageFolder(data / "train", transform=train_transform())
    val_ds = datasets.ImageFolder(data / "val", transform=eval_transform())
    classes = train_ds.classes
    print("Kelas:", classes, "| train:", len(train_ds), "| val:", len(val_ds))

    train_dl = DataLoader(train_ds, batch_size=args.batch_size, shuffle=True, num_workers=args.workers)
    val_dl = DataLoader(val_ds, batch_size=args.batch_size, shuffle=False, num_workers=args.workers)

    model = build_model(len(classes), pretrained=True).to(device)
    criterion = nn.CrossEntropyLoss()

    out_dir = Path(args.out)
    out_dir.mkdir(exist_ok=True)
    ckpt_path = out_dir / "cnn_genre.pt"
    best = {"acc": 0.0}
    history = []

    def fit(phase, epochs, params, lr, freeze_backbone):
        optimizer = torch.optim.Adam(params, lr=lr)
        for ep in range(1, epochs + 1):
            t0 = time.time()
            tl, ta = run_epoch(model, train_dl, criterion, device, optimizer, freeze_backbone)
            vl, va = run_epoch(model, val_dl, criterion, device)
            history.append({"phase": phase, "epoch": len(history) + 1,
                            "train_loss": tl, "train_acc": ta, "val_loss": vl, "val_acc": va})
            mark = ""
            if va > best["acc"]:
                best["acc"] = va
                torch.save({"state_dict": model.state_dict(), "classes": classes,
                            "img_size": IMG_SIZE, "val_acc": va}, ckpt_path)
                mark = "  <- tersimpan"
            print(f"[{phase}] ep {ep}/{epochs}  train {tl:.4f}/{ta:.3f}  "
                  f"val {vl:.4f}/{va:.3f}  ({time.time() - t0:.0f}s){mark}")

    # Fase 1: hanya kepala klasifikasi
    for p in model.features.parameters():
        p.requires_grad = False
    fit("head", args.epochs_head, model.classifier.parameters(), args.lr, True)

    # Fase 2: buka 4 blok terakhir backbone
    if args.epochs_finetune > 0:
        for p in model.features[-4:].parameters():
            p.requires_grad = True
        params = [p for p in model.parameters() if p.requires_grad]
        fit("finetune", args.epochs_finetune, params, args.lr_finetune, False)

    # Simpan riwayat + grafik untuk laporan
    res = Path("results")
    res.mkdir(exist_ok=True)
    (res / "cnn_history.json").write_text(json.dumps(history, indent=2))

    fig, ax = plt.subplots(1, 2, figsize=(10, 4))
    xs = [h["epoch"] for h in history]
    ax[0].plot(xs, [h["train_loss"] for h in history], label="train")
    ax[0].plot(xs, [h["val_loss"] for h in history], label="val")
    ax[0].set_title("Loss"); ax[0].set_xlabel("epoch"); ax[0].legend()
    ax[1].plot(xs, [h["train_acc"] for h in history], label="train")
    ax[1].plot(xs, [h["val_acc"] for h in history], label="val")
    ax[1].set_title("Akurasi"); ax[1].set_xlabel("epoch"); ax[1].legend()
    fig.tight_layout()
    fig.savefig(res / "cnn_training_curve.png", dpi=150)

    print(f"\nSelesai. Akurasi validasi terbaik: {best['acc']:.3f}")
    print("Model:", ckpt_path)


if __name__ == "__main__":
    main()
