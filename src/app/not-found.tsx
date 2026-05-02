import Link from "next/link";

export default function NotFound() {
  return (
    <div style={{
      minHeight: "100vh",
      background: "#07090F",
      color: "#E8EDF5",
      fontFamily: "monospace",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 16,
      padding: 40,
    }}>
      <div style={{ color: "#FF6B6B", fontSize: 10, letterSpacing: 3 }}>404</div>
      <h1 style={{ fontSize: 24, margin: 0 }}>Sayfa bulunamadı</h1>
      <p style={{ color: "#3A4558", fontSize: 12, textAlign: "center", maxWidth: 400 }}>
        Aradığınız sayfa taşınmış veya hiç var olmamış olabilir.
      </p>
      <Link href="/dashboard" style={{
        background: "#00E5FF18",
        border: "1px solid #00E5FF40",
        borderRadius: 6,
        padding: "10px 20px",
        color: "#00E5FF",
        fontSize: 12,
        textDecoration: "none",
      }}>
        ← Dashboard
      </Link>
    </div>
  );
}
