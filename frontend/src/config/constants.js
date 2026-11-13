export const API_URL =
  import.meta.env.VITE_API_URL || "http://127.0.0.1:5000/api";
export const RPC_URL = import.meta.env.VITE_RPC_URL || "http://127.0.0.1:8545";
export const IPFS_GATEWAY = (
  import.meta.env.VITE_IPFS_GATEWAY || "https://gateway.pinata.cloud/ipfs"
).replace(/\/$/, "");

export const MAX_UPLOAD_MB = 10; // samakan dengan MAX_UPLOAD_MB di backend-ai

export const GENRES = [
  { value: "lanskap", label: "Lanskap" },
  { value: "makro", label: "Makro" },
  { value: "potret", label: "Potret" },
];

export const TECH_FIELDS = [
  { key: "camera", label: "Kamera", placeholder: "Sony A7 III" },
  { key: "lens", label: "Lensa", placeholder: "FE 85mm F1.8" },
  { key: "focal_length", label: "Panjang fokus", placeholder: "85mm" },
  { key: "aperture", label: "Aperture", placeholder: "f/1.8" },
  { key: "shutter", label: "Shutter speed", placeholder: "1/250s" },
  { key: "iso", label: "ISO", placeholder: "100" },
  { key: "location", label: "Lokasi", placeholder: "Samarinda" },
  {
    key: "notes",
    label: "Catatan untuk deskripsi",
    placeholder: "Cerita singkat di balik foto",
    wide: true,
  },
];

export const CHAINS = {
  31337: {
    name: "Hardhat lokal",
    add: {
      chainName: "Hardhat lokal",
      rpcUrls: ["http://127.0.0.1:8545"],
      nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    },
  },
  11155111: { name: "Sepolia" }, // sudah bawaan MetaMask
};
