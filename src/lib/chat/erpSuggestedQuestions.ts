/**
 * ERP'ye göre kullanıcıya gösterilen örnek sorular (chat boş ekran chip'leri).
 *
 * Feature 1.2 — yeni kullanıcı ERP'sini bağlamış ama ilk soruyu yazmak
 * için takılıyor. Generic 4 soru ("Son 30 günde toplam satış?") Nebim
 * için iyi ama SAP'nin endüstriyel kullanıcısı için yabancı geliyor.
 *
 * ERP-spesifik öneri setleri:
 *   - Nebim V3: perakende (satış, stok, iade, müşteri sadakat)
 *   - Dynamics 365: kurumsal (müşteri, finans, satınalma)
 *   - SAP: muhasebe + üretim + satınalma
 *   - PostgreSQL: jenerik (custom app, başka domain olabilir)
 *
 * Sorular i18n catalog yerine direkt TR (chat tek dilli; multilang
 * refactor pending). Her set 4 soru — UI 4 chip gösteriyor.
 */
import type { ErpType } from "@/lib/db/erpTypes";

const NEBIM_V3_QUESTIONS = [
  "Son 30 günde toplam satış ne kadar?",
  "Kritik stoktaki ürünler hangileri?",
  "En çok satan 10 ürün?",
  "Bugünkü iade oranı nedir?",
];

const DYNAMICS_365_QUESTIONS = [
  "Bu ay en yüksek faturalı müşterilerim?",
  "Açık (unpaid) satış faturalarının toplamı?",
  "Son 7 gündeki yeni siparişler?",
  "Vadesi geçmiş alacaklar listesi?",
];

const SAP_QUESTIONS = [
  "Bu çeyrek brüt kâr marjı nedir?",
  "En yüksek stok değerine sahip 10 malzeme?",
  "Bekleyen satınalma talepleri kaç adet?",
  "Son ay üretim hattı doluluk oranı?",
];

const POSTGRES_QUESTIONS = [
  "En aktif 10 kullanıcı kim?",
  "Son 7 günde toplam kayıt artışı?",
  "En çok kullanılan tablolar hangileri?",
  "Bu hafta ortalama günlük transaction sayısı?",
];

export function erpSuggestedQuestions(erpType: ErpType | null | undefined): readonly string[] {
  switch (erpType) {
    case "nebim_v3":
      return NEBIM_V3_QUESTIONS;
    case "dynamics365":
      return DYNAMICS_365_QUESTIONS;
    case "sap":
      return SAP_QUESTIONS;
    case "postgres":
      return POSTGRES_QUESTIONS;
    default:
      // Bilinmeyen / null erpType → Nebim default (TR perakende ağırlıklı kitle)
      return NEBIM_V3_QUESTIONS;
  }
}
