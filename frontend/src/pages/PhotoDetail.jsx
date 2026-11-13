import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Notice, Spinner } from "../components/ui";
import { fetchPhoto } from "../services/contract";
import { ipfsToHttp } from "../services/ipfs";
import { getAttribute } from "../utils";

export default function PhotoDetail() {
  const { id } = useParams();
  const [photo, setPhoto] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let off = false;
    setPhoto(null);
    setError("");
    fetchPhoto(id)
      .then((p) => !off && setPhoto(p))
      .catch(() => !off && setError("Karya dengan nomor ini tidak ditemukan."));
    return () => {
      off = true;
    };
  }, [id]);

  if (error) {
    return (
      <div className="container page-head">
        <Notice type="error">{error}</Notice>
        <p>
          <Link to="/">Kembali ke galeri</Link>
        </p>
      </div>
    );
  }
  if (!photo)
    return (
      <div className="container page-head">
        <Spinner>Memuat karya</Spinner>
      </div>
    );

  const { metadata, tokenId, creator, owner, tokenURI } = photo;
  const name = metadata?.name || `Karya nomor ${tokenId}`;
  const technical = (metadata?.attributes || []).filter(
    (a) => a.trait_type !== "Genre",
  );
  const fileHash = metadata?.properties?.fileHash;

  return (
    <div className="container detail">
      <div className="mat">
        {metadata?.image ? (
          <img
            className="is-loaded"
            src={ipfsToHttp(metadata.image)}
            alt={name}
          />
        ) : (
          <div className="print-missing">
            Gambar belum bisa dimuat dari IPFS
          </div>
        )}
      </div>

      <div className="detail-info">
        <h1>{name}</h1>
        {metadata?.description && (
          <p className="lead">{metadata.description}</p>
        )}

        <dl className="facts">
          <dt>Genre</dt>
          <dd>{getAttribute(metadata, "Genre") || "-"}</dd>
          {technical.map((a) => (
            <div className="fact-row" key={a.trait_type}>
              <dt>{a.trait_type}</dt>
              <dd>{a.value}</dd>
            </div>
          ))}
          <dt>Nomor token</dt>
          <dd>{tokenId}</dd>
          <dt>Kreator</dt>
          <dd>{creator}</dd>
          <dt>Pemilik saat ini</dt>
          <dd>{owner}</dd>
          {fileHash && (
            <>
              <dt>Hash berkas</dt>
              <dd>{fileHash}</dd>
            </>
          )}
          <dt>Tautan IPFS</dt>
          <dd>
            <a href={ipfsToHttp(tokenURI)} target="_blank" rel="noreferrer">
              Metadata
            </a>
            {metadata?.image && (
              <>
                {", "}
                <a
                  href={ipfsToHttp(metadata.image)}
                  target="_blank"
                  rel="noreferrer"
                >
                  Gambar asli
                </a>
              </>
            )}
          </dd>
        </dl>

        <p className="fineprint">
          Karya ini tercatat di blockchain dan diterbitkan oleh kurator.
          Pencatatan membuktikan kapan dan atas nama siapa karya diterbitkan,
          bukan siapa pembuat aslinya.
        </p>
        <p>
          <Link to="/">Kembali ke galeri</Link>
        </p>
      </div>
    </div>
  );
}
