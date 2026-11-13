import { Link, NavLink } from "react-router-dom";
import { useWallet } from "../hooks/useWallet";
import { shortAddress } from "../utils";

export default function Navbar() {
  const { account, connect, isCurator } = useWallet();

  return (
    <header className="site-header">
      <div className="container bar">
        <Link to="/" className="brand">
          Galeri Terverifikasi
        </Link>
        <nav className="nav" aria-label="Menu utama">
          <NavLink to="/" end>
            Galeri
          </NavLink>
          <NavLink to="/upload">Unggah karya</NavLink>
          {account && <NavLink to="/my-works">Karya saya</NavLink>}
          {isCurator && <NavLink to="/curator">Panel kurator</NavLink>}
        </nav>
        {account ? (
          <span className="wallet-tag" title={account}>
            {shortAddress(account)}
          </span>
        ) : (
          <button className="btn secondary" onClick={connect}>
            Hubungkan wallet
          </button>
        )}
      </div>
    </header>
  );
}
