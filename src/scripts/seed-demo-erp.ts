import { Client } from "pg";

const TR_FIRST = ["Ahmet", "Mehmet", "Ayşe", "Fatma", "Mustafa", "Ali", "Zeynep", "Hatice", "Hasan", "Hüseyin", "Emine", "Murat", "Elif", "İbrahim", "Halil"];
const TR_LAST = ["Yılmaz", "Kaya", "Demir", "Çelik", "Şahin", "Yıldız", "Yıldırım", "Öztürk", "Aydın", "Özdemir", "Arslan", "Doğan", "Kılıç", "Aslan", "Çetin"];
const SEHIRLER = ["İstanbul", "Ankara", "İzmir", "Bursa", "Antalya", "Adana", "Konya", "Gaziantep", "Mersin", "Diyarbakır"];
const KATEGORI = ["Tekstil", "Ayakkabı", "Aksesuar", "Çanta", "Spor", "Çocuk", "İç Giyim", "Plaj"];
const RENK = ["Siyah", "Beyaz", "Kırmızı", "Mavi", "Yeşil", "Sarı", "Bordo", "Gri", "Lacivert", "Kahverengi"];
const BEDEN = ["XS", "S", "M", "L", "XL", "XXL", "36", "38", "40", "42", "44"];

function rand<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function randFloat(min: number, max: number, decimals = 2): number {
  return parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
}
function pad(n: number, len = 6): string {
  return String(n).padStart(len, "0");
}

async function main() {
  const url = process.env.DEMO_ERP_URL ?? process.argv[2];
  if (!url) {
    console.error("Usage: DEMO_ERP_URL=<postgres-url> npx tsx src/scripts/seed-demo-erp.ts");
    process.exit(1);
  }

  const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await client.connect();
  console.log("✓ Bağlandı");

  await client.query(`
    DROP TABLE IF EXISTS satis_detay CASCADE;
    DROP TABLE IF EXISTS satis CASCADE;
    DROP TABLE IF EXISTS musteri CASCADE;
    DROP TABLE IF EXISTS urun CASCADE;
    DROP TABLE IF EXISTS magaza CASCADE;
    DROP TABLE IF EXISTS kategori CASCADE;

    CREATE TABLE kategori (
      kategori_id SERIAL PRIMARY KEY,
      ad TEXT NOT NULL,
      ust_kategori_id INTEGER REFERENCES kategori(kategori_id)
    );

    CREATE TABLE magaza (
      magaza_id SERIAL PRIMARY KEY,
      magaza_kodu TEXT UNIQUE NOT NULL,
      ad TEXT NOT NULL,
      sehir TEXT NOT NULL,
      adres TEXT,
      acilis_tarihi DATE NOT NULL
    );

    CREATE TABLE urun (
      urun_id SERIAL PRIMARY KEY,
      barkod TEXT UNIQUE NOT NULL,
      ad TEXT NOT NULL,
      kategori_id INTEGER NOT NULL REFERENCES kategori(kategori_id),
      renk TEXT,
      beden TEXT,
      fiyat NUMERIC(10,2) NOT NULL,
      maliyet NUMERIC(10,2),
      stok INTEGER NOT NULL DEFAULT 0,
      olusturma_tarihi TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE musteri (
      musteri_id SERIAL PRIMARY KEY,
      ad TEXT NOT NULL,
      soyad TEXT NOT NULL,
      email TEXT,
      telefon TEXT,
      sehir TEXT,
      kayit_tarihi TIMESTAMP DEFAULT NOW(),
      sadakat_puan INTEGER DEFAULT 0
    );

    CREATE TABLE satis (
      satis_id SERIAL PRIMARY KEY,
      satis_no TEXT UNIQUE NOT NULL,
      magaza_id INTEGER NOT NULL REFERENCES magaza(magaza_id),
      musteri_id INTEGER REFERENCES musteri(musteri_id),
      satis_tarihi TIMESTAMP NOT NULL,
      odeme_tipi TEXT NOT NULL,
      toplam NUMERIC(12,2) NOT NULL,
      kdv NUMERIC(10,2) NOT NULL,
      indirim NUMERIC(10,2) DEFAULT 0
    );

    CREATE TABLE satis_detay (
      detay_id SERIAL PRIMARY KEY,
      satis_id INTEGER NOT NULL REFERENCES satis(satis_id),
      urun_id INTEGER NOT NULL REFERENCES urun(urun_id),
      adet INTEGER NOT NULL,
      birim_fiyat NUMERIC(10,2) NOT NULL,
      indirim NUMERIC(10,2) DEFAULT 0
    );
  `);
  console.log("✓ Tablolar oluşturuldu");

  for (const k of KATEGORI) {
    await client.query("INSERT INTO kategori (ad) VALUES ($1)", [k]);
  }
  console.log(`✓ ${KATEGORI.length} kategori eklendi`);

  for (let i = 0; i < 12; i++) {
    const sehir = rand(SEHIRLER);
    await client.query(
      "INSERT INTO magaza (magaza_kodu, ad, sehir, adres, acilis_tarihi) VALUES ($1, $2, $3, $4, $5)",
      [`M${pad(i + 1, 3)}`, `${sehir} ${rand(["Mağaza", "AVM Şube", "Outlet"])}`, sehir, `${sehir} merkez`, new Date(2018 + randInt(0, 7), randInt(0, 11), randInt(1, 28))]
    );
  }
  console.log("✓ 12 mağaza eklendi");

  for (let i = 0; i < 500; i++) {
    const fiyat = randFloat(50, 2500);
    await client.query(
      "INSERT INTO urun (barkod, ad, kategori_id, renk, beden, fiyat, maliyet, stok) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
      [
        `868${pad(i + 1, 10)}`,
        `${rand(KATEGORI)} ${rand(["Erkek", "Kadın", "Çocuk", "Unisex"])} ${rand(["Klasik", "Spor", "Modern", "Bohem", "Vintage"])} ${i + 1}`,
        randInt(1, KATEGORI.length),
        rand(RENK),
        rand(BEDEN),
        fiyat,
        fiyat * randFloat(0.4, 0.7),
        randInt(0, 200),
      ]
    );
  }
  console.log("✓ 500 ürün eklendi");

  for (let i = 0; i < 800; i++) {
    const ad = rand(TR_FIRST);
    const soyad = rand(TR_LAST);
    await client.query(
      "INSERT INTO musteri (ad, soyad, email, telefon, sehir, kayit_tarihi, sadakat_puan) VALUES ($1, $2, $3, $4, $5, $6, $7)",
      [
        ad, soyad,
        `${ad.toLowerCase()}.${soyad.toLowerCase()}${i}@email.com`,
        `0${randInt(530, 559)}${randInt(1000000, 9999999)}`,
        rand(SEHIRLER),
        new Date(2022 + randInt(0, 3), randInt(0, 11), randInt(1, 28)),
        randInt(0, 5000),
      ]
    );
  }
  console.log("✓ 800 müşteri eklendi");

  console.log("Satışlar oluşturuluyor (~3000 satış, ~10000 detay)...");
  const startDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);

  for (let i = 0; i < 3000; i++) {
    const tarih = new Date(startDate.getTime() + Math.random() * (Date.now() - startDate.getTime()));
    const magazaId = randInt(1, 12);
    const musteriId = Math.random() > 0.2 ? randInt(1, 800) : null;
    const adetUrun = randInt(1, 5);

    let toplam = 0;
    const detaylar: Array<[number, number, number, number]> = [];
    for (let d = 0; d < adetUrun; d++) {
      const urunId = randInt(1, 500);
      const r = await client.query("SELECT fiyat FROM urun WHERE urun_id = $1", [urunId]);
      const fiyat = parseFloat(r.rows[0].fiyat);
      const adet = randInt(1, 3);
      const indirim = Math.random() < 0.15 ? fiyat * adet * randFloat(0.05, 0.25) : 0;
      detaylar.push([urunId, adet, fiyat, indirim]);
      toplam += fiyat * adet - indirim;
    }
    const kdv = toplam * 0.20;
    const indirimToplam = detaylar.reduce((s, d) => s + d[3], 0);

    const satisRes = await client.query(
      "INSERT INTO satis (satis_no, magaza_id, musteri_id, satis_tarihi, odeme_tipi, toplam, kdv, indirim) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING satis_id",
      [
        `S${pad(i + 1, 8)}`,
        magazaId,
        musteriId,
        tarih,
        rand(["Nakit", "Kredi Kartı", "Banka Kartı", "Havale"]),
        toplam.toFixed(2),
        kdv.toFixed(2),
        indirimToplam.toFixed(2),
      ]
    );
    const satisId = satisRes.rows[0].satis_id;

    for (const [urunId, adet, fiyat, indirim] of detaylar) {
      await client.query(
        "INSERT INTO satis_detay (satis_id, urun_id, adet, birim_fiyat, indirim) VALUES ($1, $2, $3, $4, $5)",
        [satisId, urunId, adet, fiyat, indirim]
      );
    }
    if ((i + 1) % 500 === 0) console.log(`  ${i + 1}/3000 satış`);
  }
  console.log("✓ 3000 satış + ~6000 detay eklendi");

  const counts = await client.query(`
    SELECT
      (SELECT COUNT(*) FROM kategori) as kategori,
      (SELECT COUNT(*) FROM magaza) as magaza,
      (SELECT COUNT(*) FROM urun) as urun,
      (SELECT COUNT(*) FROM musteri) as musteri,
      (SELECT COUNT(*) FROM satis) as satis,
      (SELECT COUNT(*) FROM satis_detay) as detay
  `);
  console.log("\n=== Özet ===");
  console.log(counts.rows[0]);

  await client.end();
  console.log("✓ Tamamlandı");
}

main().catch((err) => {
  console.error("Hata:", err);
  process.exit(1);
});
