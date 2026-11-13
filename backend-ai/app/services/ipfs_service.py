import json

import requests

from ..config import Config

PINATA_API = "https://api.pinata.cloud"


class IPFSError(RuntimeError):
    pass


def _auth():
    if not Config.PINATA_JWT:
        raise IPFSError("PINATA_JWT belum diisi di .env")
    return {"Authorization": f"Bearer {Config.PINATA_JWT}"}


def _check(r):
    if r.status_code != 200:
        raise IPFSError(f"Pinata mengembalikan status {r.status_code}: {r.text[:200]}")
    cid = r.json().get("IpfsHash")
    if not cid:
        raise IPFSError("Respons Pinata tidak berisi CID.")
    return cid


def upload_file(data: bytes, filename: str, mimetype: str, name: str = None) -> str:
    """Pin file ke IPFS lewat Pinata. Return CID."""
    try:
        r = requests.post(
            f"{PINATA_API}/pinning/pinFileToIPFS",
            headers=_auth(),
            files={"file": (filename, data, mimetype)},
            data={"pinataMetadata": json.dumps({"name": name or filename})},
            timeout=120,
        )
    except requests.RequestException as e:
        raise IPFSError(f"Tidak dapat menghubungi Pinata: {e}")
    return _check(r)


def upload_json(obj: dict, name: str) -> str:
    """Pin objek JSON ke IPFS. Return CID."""
    try:
        r = requests.post(
            f"{PINATA_API}/pinning/pinJSONToIPFS",
            headers={**_auth(), "Content-Type": "application/json"},
            json={"pinataContent": obj, "pinataMetadata": {"name": name}},
            timeout=60,
        )
    except requests.RequestException as e:
        raise IPFSError(f"Tidak dapat menghubungi Pinata: {e}")
    return _check(r)
