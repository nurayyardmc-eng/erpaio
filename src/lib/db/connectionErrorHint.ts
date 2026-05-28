/**
 * ERP DB connection error mesajını kullanıcı-dostu Türkçe hint'e çevirir.
 *
 * Feature 1.3 — Connection test fail edince catch block'ta sadece
 * "Bağlantı başarısız" diyorduk; kullanıcı neden olduğunu anlayamıyor.
 * Driver-level error message'lar (ECONNREFUSED, Login failed vb.)
 * pattern matching ile common cases'e map edilip Türkçe rehber +
 * öneri olarak döner.
 *
 * Pattern'lar 4 ana sınıfa ayrılır:
 *   1. Network unreachable (ECONNREFUSED, ETIMEDOUT, EHOSTUNREACH)
 *   2. Auth failure (Login failed, password authentication failed)
 *   3. DB not found / no permission (Cannot open database)
 *   4. SSL/TLS handshake
 *
 * Bilinmeyen mesaj -> generic fallback + ham error mesajı (debug için).
 */

export interface ConnectionErrorHint {
  /** UI'da gösterilecek user-friendly title. */
  title: string;
  /** Detaylı açıklama + IT/kullanıcı için öneri adımları. */
  hint: string;
  /** Match yapılan kategori (test edilebilir). */
  category: "network" | "auth" | "database" | "tls" | "unknown";
}

/** Pattern-based error → hint mapper. Case-insensitive matching. */
export function connectionErrorHint(rawError: string | null | undefined): ConnectionErrorHint {
  const msg = (rawError ?? "").toLowerCase();

  // 1. Auth failure — checked BEFORE network so "login timeout" hits auth.
  if (
    msg.includes("login failed for user") ||
    msg.includes("password authentication failed") ||
    msg.includes("invalid username") ||
    msg.includes("invalid credentials") ||
    msg.includes("authentication failed")
  ) {
    return {
      category: "auth",
      title: "Kullanıcı adı veya şifre hatalı",
      hint: "DB'ye verdiğiniz kullanıcı adı / şifre yanlış. IT'nizden 'erpaio_readonly' kullanıcısının doğru şifresini teyit alın. Şifrede özel karakter varsa kopyalama sırasında yutulmuş olabilir.",
    };
  }
  if (msg.includes("login timeout") || msg.includes("login expired")) {
    return {
      category: "auth",
      title: "Auth timeout",
      hint: "Kullanıcı login süreci timeout oldu. DB sunucusu yoğun olabilir, ya da auth provider (LDAP/AD) ulaşılamıyor olabilir.",
    };
  }

  // 2. Network/firewall
  if (msg.includes("econnrefused") || msg.includes("connection refused")) {
    return {
      category: "network",
      title: "Sunucuya bağlanılamadı",
      hint: "Host veya port hatalı olabilir, ya da DB sunucusu kapalı. Eğer host/port doğruysa ERPAIO'nun IP adresinin firewall whitelist'inde olduğundan emin olun (IT departmanınızla görüşün).",
    };
  }
  if (msg.includes("etimedout") || msg.includes("timeout") || msg.includes("ehostunreach")) {
    return {
      category: "network",
      title: "Sunucu erişilemiyor (timeout)",
      hint: "Network/firewall engelliyor olabilir. ERPAIO sunucumuzun IP'sini IT'nizden whitelist'e ekletmeniz gerekebilir. VPN/private network arkasındaki DB'ler için reverse-tunnel gerekir.",
    };
  }
  if (msg.includes("enotfound") || msg.includes("getaddrinfo")) {
    return {
      category: "network",
      title: "Host bulunamadı (DNS hatası)",
      hint: "Host adı yanlış yazılmış veya DNS çözümlenmedi. IP adresini doğrudan yazmayı deneyin (örn. 192.168.1.10), ya da host adının ERPAIO sunucudan erişilebilir olduğundan emin olun.",
    };
  }

  // 3. Database not found / no permission
  if (msg.includes("cannot open database") || msg.includes("database") && msg.includes("does not exist")) {
    return {
      category: "database",
      title: "Veritabanı bulunamadı",
      hint: "Veritabanı adı hatalı veya bu kullanıcının o DB'ye erişim yetkisi yok. IT'nizden DB adını teyit alın ve kullanıcıya 'CONNECT' (Postgres) / 'db_datareader' (MS SQL) yetkisinin verildiğini kontrol ettirin.",
    };
  }
  if (msg.includes("permission denied") || msg.includes("access denied")) {
    return {
      category: "database",
      title: "Erişim reddedildi",
      hint: "Kullanıcının bu DB'de yetkisi yok. IT'nizden okuma izni (SELECT, db_datareader, GRANT USAGE) eklenmesini isteyin. Bağlantı formundaki 'IT'ye gönder' butonunu kullanarak doğru SQL'i iletebilirsiniz.",
    };
  }

  // 4. TLS/SSL
  if (msg.includes("self-signed") || msg.includes("self signed") || msg.includes("ssl") || msg.includes("tls")) {
    return {
      category: "tls",
      title: "SSL/TLS sertifika sorunu",
      hint: "DB sunucusu self-signed sertifika kullanıyor olabilir. IT'nizden geçerli bir SSL sertifikası yüklenmesini isteyin, ya da bağlantı string'inde 'trustServerCertificate' opsiyonunun aktif olduğundan emin olun.",
    };
  }

  // Unknown — return raw error for debugging
  return {
    category: "unknown",
    title: "Bilinmeyen bağlantı hatası",
    hint: rawError
      ? `Detay: ${rawError}\n\nIT departmanınıza bu mesajı iletip kontrol ettirin. Sık görülen sebepler: yanlış host/port, kullanıcı yetki sorunu, network engeli.`
      : "Detay yok. IT departmanınızdan DB erişim loglarını kontrol etmesini isteyin.",
  };
}
