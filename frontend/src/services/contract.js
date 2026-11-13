import { BrowserProvider, Contract, JsonRpcProvider } from "ethers";
import deployment from "../abi/PhotoNFT.json";
import { RPC_URL } from "../config/constants";
import { fetchMetadata } from "./ipfs";

export const CONTRACT_ADDRESS =
  import.meta.env.VITE_CONTRACT_ADDRESS || deployment.address || "";
export const CHAIN_ID = Number(
  import.meta.env.VITE_CHAIN_ID || deployment.chainId || 31337,
);
const ABI = deployment.abi || [];

export const isContractConfigured = () =>
  Boolean(CONTRACT_ADDRESS) && ABI.length > 0;

// ---------- Koneksi ----------
let readContract = null;

function reader() {
  if (!isContractConfigured()) {
    throw new Error(
      "Kontrak belum di-deploy. Jalankan `npm run deploy:local` di folder blockchain.",
    );
  }
  if (!readContract) {
    const provider = new JsonRpcProvider(RPC_URL, CHAIN_ID, {
      staticNetwork: true,
    });
    readContract = new Contract(CONTRACT_ADDRESS, ABI, provider);
  }
  return readContract;
}

async function writer() {
  if (!window.ethereum) throw new Error("MetaMask tidak ditemukan.");
  const signer = await new BrowserProvider(window.ethereum).getSigner();
  return new Contract(CONTRACT_ADDRESS, ABI, signer);
}

// ---------- Baca ----------
export async function checkIsCurator(address) {
  const c = reader();
  return c.hasRole(await c.MINTER_ROLE(), address);
}

export async function fetchPhoto(tokenId) {
  const p = await reader().getPhoto(tokenId);
  const metadata = await fetchMetadata(p.uri);
  return {
    tokenId: Number(tokenId),
    creator: p.creator,
    owner: p.currentOwner,
    tokenURI: p.uri,
    metadata,
  };
}

/** Semua karya, yang terbaru di depan. */
export async function fetchAllPhotos() {
  const c = reader();
  const total = Number(await c.totalSupply());
  const ids = await Promise.all(
    Array.from({ length: total }, (_, i) => c.tokenByIndex(i)),
  );
  const photos = await Promise.all(ids.map((id) => fetchPhoto(id)));
  return photos.reverse();
}

export async function fetchOwnedPhotos(address) {
  const ids = await reader().tokensOfOwner(address);
  const photos = await Promise.all(ids.map((id) => fetchPhoto(id)));
  return photos.reverse();
}

// ---------- Tulis ----------
/** Hanya kurator (MINTER_ROLE) yang berhasil. Return { tokenId, txHash }. */
export async function mintPhoto({ creator, tokenURI, fileHash }) {
  const c = await writer();
  const tx = await c.mintPhoto(creator, tokenURI, fileHash);
  const receipt = await tx.wait();

  let tokenId = null;
  for (const log of receipt.logs) {
    try {
      const parsed = c.interface.parseLog(log);
      if (parsed?.name === "PhotoMinted") tokenId = Number(parsed.args.tokenId);
    } catch {
      /* log dari event lain, abaikan */
    }
  }
  return { tokenId, txHash: receipt.hash };
}

// ---------- Pesan galat ----------
const REVERTS = {
  DuplicatePhoto: "Foto ini sudah pernah diterbitkan.",
  InvalidCreator: "Alamat kreator tidak valid.",
  EmptyTokenURI: "Alamat metadata IPFS kosong.",
  AccessControlUnauthorizedAccount: "Akun ini bukan kurator.",
};

export function friendlyError(err) {
  if (err?.code === "ACTION_REJECTED") return "Transaksi dibatalkan di wallet.";
  const name = err?.revert?.name;
  if (name && REVERTS[name]) return REVERTS[name];
  return err?.shortMessage || err?.message || "Terjadi kesalahan.";
}
