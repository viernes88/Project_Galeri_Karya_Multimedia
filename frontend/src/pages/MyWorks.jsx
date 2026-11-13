import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PhotoCard from "../components/PhotoCard";
import { Empty, Notice, Spinner, StatusBadge } from "../components/ui";
import { useWallet } from "../hooks/useWallet";
import { listSubmissions } from "../services/api";
import { fetchOwnedPhotos, isContractConfigured } from "../services/contract";
import { formatDate } from "../utils";

export default function MyWorks() {
  const { account, connect } = useWallet();
  const [owned, setOwned] = useState(null);
  const [subs, setSubs] = useState([]);
  const [warning, setWarning] = useState("");

  useEffect(() => {
    if (!account) return;
    let off = false;
    const nftJob = isContractConfigured()
      ? fetchOwnedPhotos(account)
      : Promise.resolve([]);
    Promise.allSettled([nftJob, listSubmissions({ creator: account })]).then(
      ([nft, sub]) => {
        if (off) return;
        const problems = [];
        if (nft.status === "fulfilled") setOwned(nft.value);
        else {
          setOwned([]);
          problems.push("NFT tidak bisa dibaca dari blockchain.");
        }
        if (sub.status === "fulfilled")
          setSubs(sub.value.filter((s) => s.status !== "minted"));
        else problems.push("Daftar pengajuan tidak bisa dimuat dari server.");
        setWarning(problems.join(" "));
      },
    );
    return () => {
      off = true;
    };
  }, [account]);

  if (!account) {
    return (
      <div className="container">
        <div className="page-head">
          <h1>Karya saya</h1>
        </div>
        <Notice type="warn">
          Hubungkan wallet untuk melihat karya Anda.{" "}
          <button className="linklike" onClick={connect}>
            Hubungkan wallet
          </button>
        </Notice>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="page-head">
        <h1>Karya saya</h1>
        <p>NFT yang Anda miliki dan pengajuan yang belum terbit.</p>
      </div>
      {warning && <Notice type="error">{warning}</Notice>}
      {!owned && (
        <p>
          <Spinner>Memuat karya</Spinner>
        </p>
      )}

      {subs.length > 0 && (
        <section className="block">
          <h2>Pengajuan</h2>
          <div className="rows">
            {subs.map((s) => (
              <div className="row" key={s.id}>
                <img src={s.imageUrl} alt="" />
                <div>
                  <cite>{s.title}</cite>
                  <div className="fineprint">
                    Diajukan {formatDate(s.createdAt)}
                    {s.status === "rejected" && s.note
                      ? `. Catatan kurator: ${s.note}`
                      : ""}
                  </div>
                </div>
                <StatusBadge status={s.status} />
              </div>
            ))}
          </div>
        </section>
      )}

      {owned && (
        <section className="block">
          <h2>NFT saya</h2>
          {owned.length === 0 ? (
            <Empty title="Belum ada NFT">
              <p>
                Karya yang diterbitkan kurator atas nama Anda akan muncul di
                sini.
              </p>
              <Link className="btn" to="/upload">
                Unggah karya
              </Link>
            </Empty>
          ) : (
            <div className="prints">
              {owned.map((p) => (
                <PhotoCard key={p.tokenId} photo={p} />
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
