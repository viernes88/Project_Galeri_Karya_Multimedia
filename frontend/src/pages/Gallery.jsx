import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PhotoCard from "../components/PhotoCard";
import { Empty, Notice, Spinner } from "../components/ui";
import { GENRES, RPC_URL } from "../config/constants";
import { fetchAllPhotos, isContractConfigured } from "../services/contract";
import { getAttribute } from "../utils";

export default function Gallery() {
  const [photos, setPhotos] = useState(null);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("semua");

  useEffect(() => {
    if (!isContractConfigured()) return;
    let off = false;
    fetchAllPhotos()
      .then((p) => !off && setPhotos(p))
      .catch((e) => {
        console.error(e);
        if (!off) {
          setError(
            `Blockchain di ${RPC_URL} tidak bisa dibaca. Pastikan "npx hardhat node" berjalan dan kontrak sudah di-deploy ulang.`,
          );
        }
      });
    return () => {
      off = true;
    };
  }, []);

  const visible = (photos || []).filter(
    (p) =>
      filter === "semua" ||
      getAttribute(p.metadata, "Genre").toLowerCase() === filter,
  );

  return (
    <div className="container">
      <div className="page-head">
        <h1>Galeri</h1>
        <p>
          Setiap karya sudah ditinjau kurator, tercatat sebagai NFT di
          blockchain, dan berkasnya tersimpan di IPFS.
        </p>
      </div>

      {!isContractConfigured() && (
        <Notice type="warn">
          Kontrak belum di-deploy. Jalankan <code>npm run deploy:local</code> di
          folder blockchain, lalu muat ulang halaman ini.
        </Notice>
      )}
      {error && <Notice type="error">{error}</Notice>}

      {photos && photos.length > 0 && (
        <div className="filters" role="group" aria-label="Filter genre">
          {[{ value: "semua", label: "Semua" }, ...GENRES].map((g) => (
            <button
              key={g.value}
              aria-pressed={filter === g.value}
              onClick={() => setFilter(g.value)}
            >
              {g.label}
            </button>
          ))}
          <span className="count">{visible.length} karya</span>
        </div>
      )}

      {isContractConfigured() && !photos && !error && (
        <p>
          <Spinner>Membaca karya dari blockchain</Spinner>
        </p>
      )}

      {photos && photos.length === 0 && (
        <Empty title="Belum ada karya yang terbit">
          <p>
            Karya yang diajukan akan muncul di sini setelah kurator
            menerbitkannya.
          </p>
          <Link className="btn" to="/upload">
            Unggah karya pertama
          </Link>
        </Empty>
      )}

      {visible.length > 0 && (
        <div className="prints">
          {visible.map((p) => (
            <PhotoCard key={p.tokenId} photo={p} />
          ))}
        </div>
      )}
    </div>
  );
}
