import axios from "axios";
import { API_URL } from "../config/constants";

const http = axios.create({ baseURL: API_URL, timeout: 120000 });

export function apiError(e) {
  if (e.response?.data?.error) return e.response.data.error;
  if (e.code === "ERR_NETWORK")
    return "Server tidak dapat dihubungi. Pastikan backend-ai sedang berjalan.";
  return e.message || "Terjadi kesalahan.";
}

export const predictImage = (file) => {
  const fd = new FormData();
  fd.append("image", file);
  return http.post("/predict", fd).then((r) => r.data);
};

export const describePhoto = (body) =>
  http.post("/describe", body).then((r) => r.data);
export const submitToIPFS = (formData) =>
  http.post("/ipfs/upload", formData).then((r) => r.data);
export const listSubmissions = (params) =>
  http.get("/submissions", { params }).then((r) => r.data);
export const markMinted = (id, body) =>
  http.post(`/submissions/${id}/minted`, body).then((r) => r.data);
export const rejectSubmission = (id, note) =>
  http.post(`/submissions/${id}/reject`, { note }).then((r) => r.data);
