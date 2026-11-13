export const shortAddress = (a) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "");
export const shortHash = (h) => (h ? `${h.slice(0, 10)}…${h.slice(-6)}` : "");
export const formatPercent = (v) => `${Math.round((v ?? 0) * 100)}%`;
export const formatDate = (iso) =>
  iso
    ? new Date(iso).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "";

/** Ambil nilai atribut metadata NFT, mis. getAttribute(meta, "Genre"). */
export const getAttribute = (metadata, trait) =>
  metadata?.attributes?.find((a) => a.trait_type === trait)?.value ?? "";
