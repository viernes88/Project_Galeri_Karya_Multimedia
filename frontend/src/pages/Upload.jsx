import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Notice, Spinner } from "../components/ui";
import { GENRES, MAX_UPLOAD_MB, TECH_FIELDS } from "../config/constants";
import { useWallet } from "../hooks/useWallet";
import {
  apiError,
  describePhoto,
  predictImage,
  submitToIPFS,
} from "../services/api";
import { formatPercent, shortHash } from "../utils";

const emptyTech = Object.fromEntries(TECH_FIELDS.map((f) => [f.key, ""]));
const cleanTech = (t) =>
  Object.fromEntries(
    Object.entries(t).filter(([, v]) => String(v).trim() !== ""),
  );

export default function Upload() {
  const { account, connect } = useWallet();
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [analysis, setAnalysis] = useState(null);
  const [genre, setGenre] = useState("");
  const [title, setTitle] = useState("");
  const [tech, setTech] = useState(emptyTech);
  const [description, setDescription] = useState("");
  const [approved, setApproved] = useState(false);
  const [busy, setBusy] = useState(""); // "analyze" | "describe" | "submit"
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );

  function resetAll() {
    setFile(null);
    setPreview("");
    setAnalysis(null);
    setGenre("");
    setTitle("");
    setTech(emptyTech);
    setDescription("");
    setApproved(false);
    setError("");
    setResult(null);
  }

  async function handleFile(e) {
    const f = e.target.files?.[0];
    e.target.value = ""; // supaya file yang sama bisa dipilih ulang
    if (!f) return;
    if (!f.type.startsWith("image/"))
      return setError("Pilih file gambar (JPG, PNG, atau WebP).");
    if (f.size > MAX_UPLOAD_MB * 1024 * 1024)
      return setError(`Ukuran file maksimal ${MAX_UPLOAD_MB} MB.`);

    resetAll();
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setBusy("analyze");
    try {
      const res = await predictImage(f);
      setAnalysis(res);
      setGenre(res.uncertain ? "" : res.genre);
      setTech({ ...emptyTech, ...res.exif }); // isi otomatis dari EXIF
    } catch (err) {
      setError(apiError(err));
    } finally {
      setBusy("");
    }
  }

  async function handleDescribe() {
    setBusy("describe");
    setError("");
    try {
      const res = await describePhoto({
        title,
        genre,
        confidence:
          analysis && genre === analysis.genre ? analysis.confidence : null,
        technical: cleanTech(tech),
      });
      setDescription(res.description);
      setApproved(false);
    } catch (err) {
      setError(apiError(err));
    } finally {
      setBusy("");
    }
  }

  async function handleSubmit() {
    setBusy("submit");
    setError("");
    try {
      const fd = new FormData();
      fd.append("image", file);
      fd.append("title", title.trim());
      fd.append("description", description.trim());
      fd.append("genre", genre);
      fd.append("creator", account);
      fd.append("technical", JSON.stringify(cleanTech(tech)));
      if (analysis && genre === analysis.genre)
        fd.append("confidence", analysis.confidence);
      setResult(await submitToIPFS(fd));
    } catch (err) {
      setError(apiError(err));
    } finally {
      setBusy("");
    }
  }

  const canSubmit =
    account &&
    file &&
    genre &&
    title.trim() &&
    description.trim() &&
    approved &&
    !busy;

  if (result) {
    return (
      <div className="container narrow">
        <div className="page-head">
          <h1>Pengajuan terkirim</h1>
          <p>
            Foto dan metadata sudah tersimpan di IPFS. Kurator akan meninjau
            karya ini; setelah diterbitkan, karya muncul di galeri dan di
            halaman Karya saya.
          </p>
        </div>
        <dl className="facts">
          <dt>Nomor pengajuan</dt>
          <dd>{result.submissionId}</dd>
          <dt>CID gambar</dt>
          <dd>{result.imageCid}</dd>
          <dt>CID metadata</dt>
          <dd>{result.metadataCid}</dd>
          <dt>Hash berkas</dt>
          <dd>{shortHash(result.fileHash)}</dd>
        </dl>
        <p className="actions">
          <Link className="btn" to="/my-works">
            Lihat karya saya
          </Link>
          <button className="btn secondary" onClick={resetAll}>
            Unggah foto lain
          </button>
        </p>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="page-head">
        <h1>Unggah karya</h1>
        <p>
          AI membantu menebak genre dan menyusun draf deskripsi. Anda tetap yang
          memutuskan: periksa dan ubah hasilnya sebelum diajukan ke kurator.
        </p>
      </div>

      {!account && (
        <Notice type="warn">
          Hubungkan wallet agar karya tercatat atas nama Anda.{" "}
          <button className="linklike" onClick={connect}>
            Hubungkan wallet
          </button>
        </Notice>
      )}
      {error && <Notice type="error">{error}</Notice>}

      <div className="upload">
        <div className="upload-preview">
          {preview ? (
            <div className="mat">
              <img
                className="is-loaded"
                src={preview}
                alt="Pratinjau foto yang dipilih"
              />
            </div>
          ) : (
            <label className="drop">
              <input
                className="sr-only"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFile}
              />
              <span>
                <strong>Pilih foto</strong>
                <br />
                JPG, PNG, atau WebP, maksimal {MAX_UPLOAD_MB} MB
              </span>
            </label>
          )}
          {preview && (
            <label className="linklike change">
              Ganti foto
              <input
                className="sr-only"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFile}
              />
            </label>
          )}
        </div>

        <div className="upload-form">
          {busy === "analyze" && (
            <p>
              <Spinner>Menganalisis foto</Spinner>
            </p>
          )}

          {analysis && (
            <>
              <section className="step">
                <h2>Hasil analisis AI</h2>
                <div className="plaque">
                  {analysis.uncertain ? (
                    <p>
                      AI kurang yakin (tertinggi{" "}
                      {formatPercent(analysis.confidence)}). Pilih genre secara
                      manual di bawah.
                    </p>
                  ) : (
                    <p>
                      Genre terdeteksi:{" "}
                      <strong>
                        {GENRES.find((g) => g.value === analysis.genre)?.label}
                      </strong>{" "}
                      dengan keyakinan {formatPercent(analysis.confidence)}.
                    </p>
                  )}
                  <div className="bars">
                    {analysis.classes.map((c) => (
                      <div className="bar-row" key={c}>
                        <span>
                          {GENRES.find((g) => g.value === c)?.label || c}
                        </span>
                        <div className="bar">
                          <span
                            style={{
                              width: formatPercent(analysis.probabilities[c]),
                            }}
                          />
                        </div>
                        <span>{formatPercent(analysis.probabilities[c])}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <fieldset className="genre-pick">
                  <legend>Genre karya</legend>
                  {GENRES.map((g) => (
                    <label key={g.value}>
                      <input
                        type="radio"
                        name="genre"
                        value={g.value}
                        checked={genre === g.value}
                        onChange={() => {
                          setGenre(g.value);
                          setApproved(false);
                        }}
                      />
                      {g.label}
                    </label>
                  ))}
                </fieldset>
              </section>

              <section className="step">
                <h2>Detail karya</h2>
                <div className="field">
                  <label htmlFor="title">Judul</label>
                  <input
                    id="title"
                    value={title}
                    maxLength={100}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>
                <div className="fields">
                  {TECH_FIELDS.map((f) => (
                    <div
                      className={`field${f.wide ? " wide" : ""}`}
                      key={f.key}
                    >
                      <label htmlFor={f.key}>{f.label}</label>
                      {f.wide ? (
                        <textarea
                          id={f.key}
                          rows={2}
                          placeholder={f.placeholder}
                          value={tech[f.key]}
                          onChange={(e) =>
                            setTech({ ...tech, [f.key]: e.target.value })
                          }
                        />
                      ) : (
                        <input
                          id={f.key}
                          placeholder={f.placeholder}
                          value={tech[f.key]}
                          onChange={(e) =>
                            setTech({ ...tech, [f.key]: e.target.value })
                          }
                        />
                      )}
                    </div>
                  ))}
                </div>
                <p className="fineprint">
                  Data kamera diisi otomatis dari EXIF foto bila tersedia.
                </p>
              </section>

              <section className="step">
                <h2>Deskripsi</h2>
                <p>
                  <button
                    className="btn secondary"
                    onClick={handleDescribe}
                    disabled={!genre || !!busy}
                  >
                    {busy === "describe"
                      ? "Menyusun draf…"
                      : "Buat draf deskripsi dengan AI"}
                  </button>
                </p>
                <div className="field">
                  <label htmlFor="desc">Teks deskripsi</label>
                  <textarea
                    id="desc"
                    rows={7}
                    maxLength={2000}
                    value={description}
                    placeholder="Tulis sendiri atau buat draf dengan AI, lalu ubah sesuai kebutuhan."
                    onChange={(e) => {
                      setDescription(e.target.value);
                      setApproved(false);
                    }}
                  />
                </div>
                <label className="check">
                  <input
                    type="checkbox"
                    checked={approved}
                    disabled={!description.trim()}
                    onChange={(e) => setApproved(e.target.checked)}
                  />
                  Saya sudah memeriksa deskripsi ini dan menyetujuinya.
                </label>
              </section>

              <p className="actions">
                <button
                  className="btn"
                  onClick={handleSubmit}
                  disabled={!canSubmit}
                >
                  {busy === "submit"
                    ? "Mengunggah ke IPFS…"
                    : "Ajukan ke kurator"}
                </button>
              </p>
              <p className="fineprint">
                Foto dan metadata diunggah ke IPFS, lalu menunggu persetujuan
                kurator. Anda tidak perlu membayar biaya gas; kurator yang
                menerbitkan.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
