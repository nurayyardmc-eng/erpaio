import Link from "next/link";

export default function NotFound() {
  return (
    <div style={{
      minHeight: "100vh",
      background: "#F9FAFB",
      color: "#0F172A",
      fontFamily: "inherit",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 16,
      padding: 40,
    }}>
      <div style={{ color: "#EF4444", fontSize: 10, letterSpacing: 3 }}>404</div>
      <h1 style={{ fontSize: 24, margin: 0 }}>Sayfa bulunamadı</h1>
      <p style={{ color: "#94A3B8", fontSize: 12, textAlign: "center", maxWidth: 400 }}>
        Aradığınız sayfa taşınmış veya hiç var olmamış olabilir.
      </p>
      <Link href="/dashboard" style={{
        background: "#0A0A0A18",
        border: "1px solid #0A0A0A40",
        borderRadius: 6,
        padding: "10px 20px",
        color: "#0A0A0A",
        fontSize: 12,
        textDecoration: "none",
      }}>
        ← Dashboard
      </Link>
    </div>
  );
}
