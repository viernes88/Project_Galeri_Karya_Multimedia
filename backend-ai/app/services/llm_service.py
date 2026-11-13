import requests

from ..config import Config

# Nama model sering berubah. Jika default tidak tersedia lagi, isi LLM_MODEL di .env.
DEFAULT_MODELS = {
    "gemini": "gemini-2.5-flash",
    "groq": "llama-3.3-70b-versatile",
    "ollama": "llama3.2",
}

SYSTEM_PROMPT = (
    "Kamu adalah asisten penulis katalog galeri fotografi. "
    "Tulis dengan bahasa yang hangat, ringkas, dan profesional."
)

TECH_LABELS = [
    ("camera", "Kamera"),
    ("lens", "Lensa"),
    ("focal_length", "Panjang fokus"),
    ("aperture", "Aperture"),
    ("shutter", "Shutter speed"),
    ("iso", "ISO"),
    ("location", "Lokasi"),
    ("notes", "Catatan kreator"),
]


class LLMError(RuntimeError):
    pass


def build_prompt(title, genre, confidence, technical) -> str:
    lines = [f"- {label}: {technical[key]}" for key, label in TECH_LABELS if technical.get(key)]
    tech_block = "\n".join(lines) if lines else "- (tidak ada data teknis)"

    conf_note = ""
    if confidence is not None:
        conf_note = f" (tingkat keyakinan model {confidence * 100:.0f}%)"
        if confidence < Config.CONFIDENCE_THRESHOLD:
            conf_note += ", keyakinan rendah sehingga jangan terlalu menekankan genre"

    return (
        "Tulis draf deskripsi karya untuk galeri foto dalam Bahasa Indonesia.\n\n"
        f"Judul: {title or '(belum ada judul)'}\n"
        f"Genre: {genre}{conf_note}\n"
        f"Data teknis:\n{tech_block}\n\n"
        "Aturan:\n"
        "- Maksimal 2 paragraf, sekitar 80-120 kata.\n"
        "- Gunakan HANYA informasi di atas. Jangan mengarang lokasi, nama orang, atau peristiwa.\n"
        "- Jelaskan karakter visual yang lazim untuk genre tersebut dan hubungkan dengan data teknis bila relevan.\n"
        "- Keluarkan teks deskripsi saja, tanpa judul, tanpa markdown, tanpa kalimat pembuka."
    )


def _post(url, **kwargs):
    try:
        r = requests.post(url, timeout=60, **kwargs)
    except requests.RequestException as e:
        raise LLMError(f"Tidak dapat menghubungi layanan LLM: {e}")
    if r.status_code != 200:
        raise LLMError(f"LLM mengembalikan status {r.status_code}: {r.text[:200]}")
    return r.json()


def _gemini(prompt, model):
    if not Config.LLM_API_KEY:
        raise LLMError("LLM_API_KEY belum diisi di .env")
    data = _post(
        f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent",
        headers={"x-goog-api-key": Config.LLM_API_KEY, "Content-Type": "application/json"},
        json={
            "systemInstruction": {"parts": [{"text": SYSTEM_PROMPT}]},
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"temperature": 0.7},
        },
    )
    try:
        return data["candidates"][0]["content"]["parts"][0]["text"]
    except (KeyError, IndexError):
        raise LLMError("Respons Gemini tidak berisi teks (mungkin diblokir filter keamanan).")


def _groq(prompt, model):
    if not Config.LLM_API_KEY:
        raise LLMError("LLM_API_KEY belum diisi di .env")
    data = _post(
        "https://api.groq.com/openai/v1/chat/completions",
        headers={"Authorization": f"Bearer {Config.LLM_API_KEY}"},
        json={
            "model": model,
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ],
            "temperature": 0.7,
            "max_tokens": 500,
        },
    )
    try:
        return data["choices"][0]["message"]["content"]
    except (KeyError, IndexError):
        raise LLMError("Respons Groq tidak berisi teks.")


def _ollama(prompt, model):
    data = _post(
        f"{Config.OLLAMA_URL}/api/chat",
        json={
            "model": model,
            "stream": False,
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ],
        },
    )
    try:
        return data["message"]["content"]
    except KeyError:
        raise LLMError("Respons Ollama tidak berisi teks.")


def generate_description(title, genre, confidence, technical):
    """Return (teks, provider, model)."""
    provider = Config.LLM_PROVIDER
    handlers = {"gemini": _gemini, "groq": _groq, "ollama": _ollama}
    if provider not in handlers:
        raise LLMError(f"LLM_PROVIDER '{provider}' tidak dikenal. Pilih: gemini, groq, ollama.")
    model = Config.LLM_MODEL or DEFAULT_MODELS[provider]

    text = handlers[provider](build_prompt(title, genre, confidence, technical), model).strip()
    if not text:
        raise LLMError("LLM mengembalikan teks kosong.")
    return text, provider, model
