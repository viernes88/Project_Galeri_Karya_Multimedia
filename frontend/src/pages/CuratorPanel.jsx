import { useCallback, useEffect, useState } from "react";
import { Empty, Notice, Spinner } from "../components/ui";
import { useWallet } from "../hooks/useWallet";
import {
  apiError,
  listSubmissions,
  markMinted,
  rejectSubmission,
} from "../services/api";
import { friendlyError, mintPhoto } from "../services/contract";
import { formatDate, formatPercent, shortHash } from "../utils";

export default function CuratorPanel() {
  const { account, isCurator, isCorrectChain, connect, switchNetwork } =
    useWallet();
  const [items, setItems] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    try {
      setItems(await listSubmissions({ status: "pending" }));
    } catch (e) {
      setError(apiError(e));
    }
  }, []);

  useEffect(() => {
    if (isCurator) load();
  }, [isCurator, load]);

  async function handleMint(s) {
    setBusyId(s.id);
    setError("");
    setNotice("");
    try {
      const { tokenId, txHash } = await mintPhoto({
        creator: s.creator,
        tokenURI: s.tokenURI,
        fileHash: s.fileHash,
      });
      try {
        await markMinted(s.id, { tokenId, txHash });
      } catch (e) {
        setNotice(
          `NFT nomor ${tokenId} berhasil terbit, tetapi status pengajuan belum diperbarui di server (${apiError(e)}).`,
        );
        return;
      }
      setItems((list) => list.filter((x) => x.id !== s.id));
      setNotice(`"${s.title}" terbit sebagai NFT nomor ${tokenId}.`);
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusyId(null);
    }
  }

  async function handleReject(s) {
    const note = window.prompt(
      `Alasan menolak "${s.title}" (boleh dikosongkan):`,
    );
    if (note === null) return;
    setBusyId(s.id);
    setError("");
    try {
      await rejectSubmission(s.id, note);
      setItems((list) => list.filter((x) => x.id !== s.id));
      setNotice(`Pengajuan "${s.title}" ditolak.`);
    } catch (e) {
      setError(apiError(e));
    } finally {
      setBusyId(null);
    }
  }

  const head = (
    <div className="page-head">
      <h1>Panel kurator</h1>
      <p>
        Tinjau karya yang diajukan, lalu terbitkan sebagai NFT atas nama
        kreatornya.
      </p>
    </div>
  );

  if (!account) {
    return (
      <div className="container">
        {head}
        <Notice type="warn">
          Hubungkan wallet kurator untuk melanjutkan.{" "}
          <button className="linklike" onClick={connect}>
            Hubungkan wallet
          </button>
        </Notice>
      </div>
    );
  }
  if (!isCurator) {
    return (
      <div className="container">
        {head}
        <Notice type="error">
          Akun ini bukan kurator. Admin kontrak perlu memberi peran kurator ke
          alamat ini dengan <code>grantRole</code>.
        </Notice>
      </div>
    );
  }

  return (
    <div className="container">
      {head}
      {!isCorrectChain && (
        <Notice type="warn">
          Wallet berada di jaringan yang berbeda dari kontrak.{" "}
          <button className="linklike" onClick={switchNetwork}>
            Ganti jaringan
          </button>
        </Notice>
      )}
      {notice && <Notice type="ok">{notice}</Notice>}
      {error && <Notice type="error">{error}</Notice>}

      {!items && !error && (
        <p>
          <Spinner>Memuat pengajuan</Spinner>
        </p>
      )}
      {items && items.length === 0 && (
        <Empty title="Tidak ada pengajuan yang menunggu">
          <p>Pengajuan baru dari kreator akan muncul di sini.</p>
        </Empty>
      )}

      {items?.map((s) => (
        <article className="review" key={s.id}>
          <div className="mat">
            <img className="is-loaded" src={s.imageUrl} alt={s.title} />
          </div>
          <div>
            <h2>
              <cite>{s.title}</cite>
            </h2>
            <p className="lead">{s.description}</p>
            <dl className="facts">
              <dt>Genre</dt>
              <dd>
                {s.genre}
                {s.confidence != null && ` (AI ${formatPercent(s.confidence)})`}
              </dd>
              <dt>Kreator</dt>
              <dd>{s.creator}</dd>
              <dt>Diajukan</dt>
              <dd>{formatDate(s.createdAt)}</dd>
              <dt>Hash berkas</dt>
              <dd>{shortHash(s.fileHash)}</dd>
            </dl>
            <p className="actions">
              <button
                className="btn"
                disabled={busyId !== null || !isCorrectChain}
                onClick={() => handleMint(s)}
              >
                {busyId === s.id ? "Menunggu wallet…" : "Terbitkan sebagai NFT"}
              </button>
              <button
                className="btn danger"
                disabled={busyId !== null}
                onClick={() => handleReject(s)}
              >
                Tolak pengajuan
              </button>
            </p>
          </div>
        </article>
      ))}
    </div>
  );
}
