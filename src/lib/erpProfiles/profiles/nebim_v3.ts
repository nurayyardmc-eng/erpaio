export const NEBIM_V3_YAML = String.raw`
name: Nebim V3
slug: nebim_v3
version_range: "v25.x - v26.x"
language: tr
locale: tr-TR
currency_default: TRY

description: |
  Nebim V3, perakende ve toptan ticaret odaklı Türk ERP sistemidir.
  Tablolar üç ana prefix kullanır:
    cd* (card / kart) — referans tabloları (cdCariKart, cdStokKart)
    tr* (transaction / işlem) — işlem hareketleri (trFatura, trSiparis)
    ix* (index) — index/lookup tabloları
  PK: GenelKayitNo (auto-increment), bazı tablolarda LogicalRef kullanılır.

canonical_tables:

  cdCariKart:
    description: Müşteri ve tedarikçi kartları (cariler)
    aliases: [müşteri, tedarikçi, cari, firma, customer, supplier]
    important_columns:
      - { name: CariKodu, type: nvarchar, meaning: "cari kodu (tekil)" }
      - { name: CariUnvani, type: nvarchar, meaning: "şirket adı / unvanı" }
      - { name: CariTipi, type: int, values: { 1: "Alıcı (müşteri)", 2: "Satıcı (tedarikçi)", 3: "Hem alıcı hem satıcı" } }
      - { name: VergiNo, type: nvarchar, meaning: "vergi numarası" }
      - { name: Sehir, type: nvarchar, meaning: "şehir" }
      - { name: Email, type: nvarchar }
      - { name: Telefon, type: nvarchar }
    primary_key: GenelKayitNo

  cdStokKart:
    description: Stok kartları (ürünler / SKU'lar)
    aliases: [stok, ürün, malzeme, sku, product, inventory]
    important_columns:
      - { name: StokKodu, type: nvarchar, meaning: "stok kodu / SKU" }
      - { name: StokAdi, type: nvarchar, meaning: "ürün adı" }
      - { name: Marka, type: nvarchar }
      - { name: GrupKodu, type: nvarchar, meaning: "ürün grup kodu" }
      - { name: AlisFiyati, type: money, meaning: "alış fiyatı (KDV hariç)" }
      - { name: SatisFiyati, type: money, meaning: "liste satış fiyatı (KDV hariç)" }
      - { name: KdvOrani, type: decimal, meaning: "KDV oranı (%)" }
      - { name: MinStok, type: decimal, meaning: "minimum stok seviyesi (kritik)" }
      - { name: MaxStok, type: decimal, meaning: "maksimum stok seviyesi" }
      - { name: PasifMi, type: bit, values: { 0: "aktif", 1: "pasif" } }

  trStokHareket:
    description: Stok giriş/çıkış hareketleri (transactions)
    aliases: [stok hareket, giriş çıkış, stock movement]
    important_columns:
      - { name: StokKodu, type: nvarchar }
      - { name: HareketTarihi, type: datetime }
      - { name: HareketTipi, type: int, values: { 1: "Giriş", 2: "Çıkış", 3: "Sayım", 4: "Transfer" } }
      - { name: Miktar, type: decimal, meaning: "(+) giriş, (-) çıkış için signed" }
      - { name: BirimFiyat, type: money }
      - { name: DepoKodu, type: nvarchar }

  trFatura:
    description: Faturalar (satış + alış + iade)
    aliases: [fatura, invoice, billing]
    important_columns:
      - { name: FaturaNo, type: nvarchar, meaning: "fatura numarası (tekil)" }
      - { name: FaturaTarihi, type: datetime }
      - { name: CariKodu, type: nvarchar, meaning: "cdCariKart.CariKodu ile join" }
      - { name: NetTutar, type: money, meaning: "vergisiz tutar (TL)" }
      - { name: KdvTutar, type: money, meaning: "KDV tutarı (TL)" }
      - { name: GenelToplam, type: money, meaning: "KDV dahil toplam (TL)" }
      - { name: FaturaTipi, type: int, values: { 1: "Satış", 2: "Hizmet satış", 3: "İade (iade alınan)", 4: "Alış", 5: "Alış iade" } }
      - { name: IptalDurumu, type: int, values: { 0: "geçerli", 1: "iptal edilmiş" } }
      - { name: VadeTarihi, type: datetime, meaning: "ödeme vade tarihi" }
      - { name: ParaBirimi, type: nvarchar, default: "TRY" }
    relationships:
      - { with: cdCariKart, on: "CariKodu = CariKodu", type: many_to_one }
      - { with: trFaturaSatir, on: "FaturaNo = FaturaNo", type: one_to_many }

  trFaturaSatir:
    description: Fatura kalemleri (satır bazlı detay)
    aliases: [fatura kalem, fatura detay, fatura satır]
    important_columns:
      - { name: FaturaNo, type: nvarchar }
      - { name: StokKodu, type: nvarchar }
      - { name: Miktar, type: decimal }
      - { name: BirimFiyat, type: money }
      - { name: NetTutar, type: money }
      - { name: KdvOrani, type: decimal }

  trSiparis:
    description: Müşteri ve tedarikçi siparişleri
    aliases: [sipariş, order]
    important_columns:
      - { name: SiparisNo, type: nvarchar }
      - { name: SiparisTarihi, type: datetime }
      - { name: CariKodu, type: nvarchar }
      - { name: SiparisTipi, type: int, values: { 1: "Müşteri siparişi", 2: "Tedarikçi siparişi" } }
      - { name: Durum, type: int, values: { 1: "Açık", 2: "Kısmen sevk", 3: "Tamamlandı", 4: "İptal" } }
      - { name: ToplamTutar, type: money }
      - { name: TeslimTarihi, type: datetime }
      - { name: IptalDurumu, type: int }

  trCariHareket:
    description: Cari hesap hareketleri (borç/alacak, ödemeler, tahsilatlar)
    aliases: [cari hareket, borç, alacak, ödeme, tahsilat, payment]
    important_columns:
      - { name: CariKodu, type: nvarchar }
      - { name: HareketTarihi, type: datetime }
      - { name: HareketTipi, type: int, values: { 1: "Borç (fatura)", 2: "Alacak (ödeme)", 3: "Çek", 4: "Senet" } }
      - { name: Tutar, type: money, meaning: "(+) borç, (-) alacak için signed" }
      - { name: KalanTutar, type: money, meaning: "henüz tahsil edilmemiş tutar" }
      - { name: VadeTarihi, type: datetime }
      - { name: ReferansNo, type: nvarchar, meaning: "fatura/sipariş referansı" }
      - { name: ParaBirimi, type: nvarchar }

  trCekSenet:
    description: Çek ve senet kayıtları
    aliases: [çek, senet, kambiyo]
    important_columns:
      - { name: BelgeNo, type: nvarchar }
      - { name: CariKodu, type: nvarchar }
      - { name: Tutar, type: money }
      - { name: VadeTarihi, type: datetime }
      - { name: BelgeTipi, type: int, values: { 1: "Çek", 2: "Senet" } }
      - { name: Durum, type: int, values: { 1: "Portföyde", 2: "Tahsil edildi", 3: "Karşılıksız", 4: "Ciro edildi" } }

  cdDepo:
    description: Depolar
    aliases: [depo, warehouse, lokasyon]
    important_columns:
      - { name: DepoKodu, type: nvarchar }
      - { name: DepoAdi, type: nvarchar }
      - { name: Adres, type: nvarchar }

  cdKasa:
    description: Kasa hesapları
    aliases: [kasa]
    important_columns:
      - { name: KasaKodu, type: nvarchar }
      - { name: KasaAdi, type: nvarchar }
      - { name: ParaBirimi, type: nvarchar }

  cdBanka:
    description: Banka hesapları
    aliases: [banka, bank]
    important_columns:
      - { name: BankaKodu, type: nvarchar }
      - { name: BankaAdi, type: nvarchar }
      - { name: HesapNo, type: nvarchar }
      - { name: IBAN, type: nvarchar }
      - { name: ParaBirimi, type: nvarchar }

common_queries:
  - q_pattern: ["bu ay satış", "aylık satış", "bu ayki ciro"]
    sql: |
      SELECT ISNULL(SUM(NetTutar), 0) AS toplam_satis
      FROM dbo.trFatura
      WHERE YEAR(FaturaTarihi) = YEAR(GETDATE())
        AND MONTH(FaturaTarihi) = MONTH(GETDATE())
        AND FaturaTipi IN (1, 2)
        AND IptalDurumu = 0;
    explanation: "Bu ayın satış faturalarının net tutar toplamı (iadeler hariç)"

  - q_pattern: ["en çok satan", "best seller", "top product"]
    sql: |
      SELECT TOP 10 fs.StokKodu, sk.StokAdi,
             SUM(fs.Miktar) AS adet,
             SUM(fs.NetTutar) AS ciro
      FROM dbo.trFaturaSatir fs
      INNER JOIN dbo.trFatura f ON f.FaturaNo = fs.FaturaNo
      LEFT JOIN dbo.cdStokKart sk ON sk.StokKodu = fs.StokKodu
      WHERE f.FaturaTipi IN (1, 2) AND f.IptalDurumu = 0
        AND f.FaturaTarihi >= DATEADD(MONTH, -1, GETDATE())
      GROUP BY fs.StokKodu, sk.StokAdi
      ORDER BY adet DESC;

  - q_pattern: ["kritik stok", "az kalmış", "stok altında", "low stock"]
    sql: |
      SELECT sk.StokKodu, sk.StokAdi, sk.MinStok,
             ISNULL(SUM(sh.Miktar), 0) AS mevcut_stok
      FROM dbo.cdStokKart sk
      LEFT JOIN dbo.trStokHareket sh ON sh.StokKodu = sk.StokKodu
      WHERE sk.MinStok > 0 AND sk.PasifMi = 0
      GROUP BY sk.StokKodu, sk.StokAdi, sk.MinStok
      HAVING ISNULL(SUM(sh.Miktar), 0) <= sk.MinStok
      ORDER BY mevcut_stok ASC;

  - q_pattern: ["vadesi geçmiş", "geç ödemeler", "overdue"]
    sql: |
      SELECT ch.CariKodu, ck.CariUnvani,
             SUM(ch.KalanTutar) AS bakiye,
             MIN(ch.VadeTarihi) AS en_eski_vade
      FROM dbo.trCariHareket ch
      LEFT JOIN dbo.cdCariKart ck ON ck.CariKodu = ch.CariKodu
      WHERE ch.VadeTarihi < GETDATE()
        AND ch.KalanTutar > 0
        AND ch.IptalDurumu = 0
      GROUP BY ch.CariKodu, ck.CariUnvani
      ORDER BY bakiye DESC;

  - q_pattern: ["müşteri bazlı", "cari raporu", "top customer"]
    sql: |
      SELECT TOP 20 f.CariKodu, ck.CariUnvani,
             COUNT(*) AS fatura_sayisi,
             SUM(f.NetTutar) AS toplam_satis
      FROM dbo.trFatura f
      LEFT JOIN dbo.cdCariKart ck ON ck.CariKodu = f.CariKodu
      WHERE f.FaturaTipi IN (1, 2) AND f.IptalDurumu = 0
        AND f.FaturaTarihi >= DATEADD(YEAR, -1, GETDATE())
      GROUP BY f.CariKodu, ck.CariUnvani
      ORDER BY toplam_satis DESC;

glossary:
  fatura: trFatura
  satış: "trFatura (FaturaTipi IN 1,2)"
  iade: "trFatura (FaturaTipi IN 3,5)"
  alış: "trFatura (FaturaTipi = 4)"
  müşteri: "cdCariKart (CariTipi = 1)"
  tedarikçi: "cdCariKart (CariTipi = 2)"
  cari: cdCariKart
  ürün: cdStokKart
  stok: "cdStokKart + trStokHareket"
  sipariş: trSiparis
  borç: "trCariHareket (HareketTipi = 1)"
  alacak: "trCariHareket (HareketTipi = 2)"
  ödeme: "trCariHareket (HareketTipi = 2)"
  tahsilat: "trCariHareket (HareketTipi = 2)"
  çek: "trCekSenet (BelgeTipi = 1)"
  senet: "trCekSenet (BelgeTipi = 2)"
  depo: cdDepo
  kasa: cdKasa
  banka: cdBanka
  vade: "VadeTarihi (trFatura veya trCariHareket)"
  KDV: "KdvTutar / KdvOrani"
  iptal: "IptalDurumu = 1"

conventions:
  - "FaturaTipi = 1 (Satış) ve 2 (Hizmet) = pozitif satış. 3, 5 iadelerdir → SUM hesabına eklerken IADELERI ÇIKAR veya HARİÇ TUT."
  - "IptalDurumu HER ZAMAN filtre edilmeli (= 0). İptal edilmiş kayıtlar veride durur."
  - "Tarih formatı: SQL Server datetime, GETDATE() current. CAST(... AS DATE) ile gün karşılaştır."
  - "Türkçe karakterler için NVARCHAR ve N'...' prefix kullan."
  - "Para tutarları money tipi, KDV genelde dahil değil — NetTutar vergisiz, GenelToplam KDV dahil."
  - "Stok mevcudunu doğrudan cdStokKart'tan değil, trStokHareket SUM(Miktar) ile hesapla."
  - "Cari bakiye = trCariHareket SUM(Tutar) — pozitif borç, negatif alacak."
`;
