import { useState } from "react";
import { Link } from "react-router-dom";
import { ipfsToHttp } from "../services/ipfs";
import { getAttribute, shortAddress } from "../utils";

/** Karya ditampilkan seperti cetakan berbingkai putih dengan label di dinding. */
export default function PhotoCard({ photo }) {
  const { tokenId, creator, metadata } = photo;
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const name = metadata?.name || `Karya nomor ${tokenId}`;
  const genre = getAttribute(metadata, "Genre");
  const src = metadata?.image ? ipfsToHttp(metadata.image) : null;

  return (
    <figure className="print">
      <Link
        to={`/photo/${tokenId}`}
        className="print-link"
        aria-label={`Lihat ${name}`}
      >
        <div className="mat">
          {src && !failed ? (
            <img
              src={src}
              alt={name}
              loading="lazy"
              className={loaded ? "is-loaded" : ""}
              onLoad={() => setLoaded(true)}
              onError={() => setFailed(true)}
            />
          ) : (
            <div className="print-missing">
              Gambar belum bisa dimuat dari IPFS
            </div>
          )}
        </div>
      </Link>
      <figcaption className="wall-label">
        <Link to={`/photo/${tokenId}`}>
          <cite>{name}</cite>
        </Link>
        <span>oleh {shortAddress(creator)}</span>
        <span>
          {genre ? `${genre}, ` : ""}nomor {tokenId}
        </span>
      </figcaption>
    </figure>
  );
}
