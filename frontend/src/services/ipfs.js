import axios from "axios";
import { IPFS_GATEWAY } from "../config/constants";

export const ipfsToHttp = (uri) =>
  uri && uri.startsWith("ipfs://") ? `${IPFS_GATEWAY}/${uri.slice(7)}` : uri;

const cache = new Map();

/** Ambil metadata JSON dari IPFS. Gagal => null (galeri tetap tampil). */
export async function fetchMetadata(tokenURI) {
  if (!tokenURI) return null;
  if (cache.has(tokenURI)) return cache.get(tokenURI);
  try {
    const { data } = await axios.get(ipfsToHttp(tokenURI), { timeout: 20000 });
    const metadata = typeof data === "object" ? data : null;
    cache.set(tokenURI, metadata);
    return metadata;
  } catch {
    return null;
  }
}
