import { Route, Routes } from "react-router-dom";
import Navbar from "./components/Navbar";
import { Notice } from "./components/ui";
import { CHAINS } from "./config/constants";
import { useWallet } from "./hooks/useWallet";
import { CHAIN_ID, isContractConfigured } from "./services/contract";
import CuratorPanel from "./pages/CuratorPanel";
import Gallery from "./pages/Gallery";
import MyWorks from "./pages/MyWorks";
import PhotoDetail from "./pages/PhotoDetail";
import Upload from "./pages/Upload";
import "./App.css";

function WalletBanner() {
  const { account, isCorrectChain, switchNetwork, error } = useWallet();
  const wrongChain = account && isContractConfigured() && !isCorrectChain;
  if (!wrongChain && !error) return null;
  return (
    <div className="container banner">
      {error && <Notice type="error">{error}</Notice>}
      {wrongChain && (
        <Notice type="warn">
          Wallet terhubung ke jaringan lain. Karya tetap bisa dilihat, tetapi untuk menerbitkan NFT
          pindah ke {CHAINS[CHAIN_ID]?.name || `chain ${CHAIN_ID}`}.{" "}
          <button className="linklike" onClick={switchNetwork}>Ganti jaringan</button>
        </Notice>
      )}
    </div>
  );
}

export default function App() {
  return (
    <>
      <Navbar />
      <WalletBanner />
      <main>
        <Routes>
          <Route path="/" element={<Gallery />} />
          <Route path="/photo/:id" element={<PhotoDetail />} />
          <Route path="/upload" element={<Upload />} />
          <Route path="/my-works" element={<MyWorks />} />
          <Route path="/curator" element={<CuratorPanel />} />
          <Route path="*" element={<div className="container page-head"><h1>Halaman tidak ditemukan</h1></div>} />
        </Routes>
      </main>
    </>
  );
}
