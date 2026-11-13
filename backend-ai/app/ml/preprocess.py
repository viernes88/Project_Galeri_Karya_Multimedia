"""Pra-pemrosesan gambar, dipakai bersama oleh training dan inferensi."""
from PIL import ExifTags, Image, ImageOps

IMG_SIZE = 224
MEAN = [0.485, 0.456, 0.406]  # statistik ImageNet (wajib untuk transfer learning)
STD = [0.229, 0.224, 0.225]


def load_rgb(source):
    """Buka gambar dari path / file-like, putar sesuai EXIF, ubah ke RGB."""
    img = Image.open(source)
    img = ImageOps.exif_transpose(img)
    return img.convert("RGB")


def eval_transform():
    from torchvision import transforms
    return transforms.Compose([
        transforms.Resize((IMG_SIZE, IMG_SIZE)),
        transforms.ToTensor(),
        transforms.Normalize(MEAN, STD),
    ])


def train_transform():
    from torchvision import transforms
    return transforms.Compose([
        transforms.Resize((IMG_SIZE, IMG_SIZE)),
        transforms.RandomHorizontalFlip(),
        transforms.RandomRotation(10),
        transforms.ColorJitter(brightness=0.2, contrast=0.2, saturation=0.2),
        transforms.ToTensor(),
        transforms.Normalize(MEAN, STD),
    ])


def _num(v):
    try:
        return float(v)
    except Exception:
        return None


def extract_exif(img) -> dict:
    """Ambil data teknis dari EXIF (jika ada) untuk mengisi otomatis formulir."""
    try:
        exif = img.getexif()
        tags = dict(exif)
        tags.update(exif.get_ifd(0x8769))  # Exif sub-IFD (ISO, aperture, dll)
    except Exception:
        return {}

    named = {ExifTags.TAGS.get(k, k): v for k, v in tags.items()}
    out = {}

    make = str(named.get("Make", "")).strip("\x00 ").strip()
    model = str(named.get("Model", "")).strip("\x00 ").strip()
    camera = model if (model and model.startswith(make)) else f"{make} {model}".strip()
    if camera:
        out["camera"] = camera

    lens = named.get("LensModel")
    if lens:
        out["lens"] = str(lens).strip("\x00 ").strip()

    fl = _num(named.get("FocalLength"))
    if fl:
        out["focal_length"] = f"{fl:.0f}mm"

    fn = _num(named.get("FNumber"))
    if fn:
        out["aperture"] = f"f/{fn:.1f}"

    et = _num(named.get("ExposureTime"))
    if et and et > 0:
        out["shutter"] = f"1/{round(1 / et)}s" if et < 1 else f"{et:g}s"

    iso = named.get("ISOSpeedRatings") or named.get("PhotographicSensitivity")
    if isinstance(iso, (tuple, list)) and iso:
        iso = iso[0]
    if iso:
        out["iso"] = str(iso)

    return out
