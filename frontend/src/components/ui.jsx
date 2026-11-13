export function Spinner({ children }) {
  return (
    <span className="spinner-wrap" role="status">
      <span className="spinner" aria-hidden="true" />
      {children}
    </span>
  );
}

export function Notice({ type = "info", children }) {
  return (
    <div
      className={`notice ${type}`}
      role={type === "error" ? "alert" : "status"}
    >
      {children}
    </div>
  );
}

const STATUS_TEXT = {
  pending: "Menunggu kurator",
  minted: "Sudah terbit",
  rejected: "Ditolak",
};

export function StatusBadge({ status }) {
  return (
    <span className={`badge ${status}`}>{STATUS_TEXT[status] || status}</span>
  );
}

export function Empty({ title, children }) {
  return (
    <div className="empty">
      <h2>{title}</h2>
      {children}
    </div>
  );
}
