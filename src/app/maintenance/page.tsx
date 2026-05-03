export const metadata = { title: "Bakım · ERPAIO" };

export default function MaintenancePage() {
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
      textAlign: "center",
    }}>
      <div style={{ color: "#FF9500", fontSize: 10, letterSpacing: 3 }}>BAKIM</div>
      <h1 style={{ fontSize: 28, margin: 0 }}>ERPAIO geçici olarak kapalı</h1>
      <p style={{ color: "#9AA5B4", fontSize: 13, maxWidth: 480, lineHeight: 1.6 }}>
        Sistemde planlı bakım yapıyoruz. En kısa sürede geri döneceğiz.
        Acil durumlar için: <a href="mailto:support@erpaio.com" style={{ color: "#00E5FF" }}>support@erpaio.com</a>
      </p>
      <a href="https://erpaio.vercel.app/status" style={{
        marginTop: 16,
        background: "#00E5FF18",
        border: "1px solid #00E5FF40",
        padding: "10px 20px",
        borderRadius: 8,
        color: "#00E5FF",
        textDecoration: "none",
        fontSize: 12,
      }}>
        Durum Sayfası →
      </a>
    </div>
  );
}
