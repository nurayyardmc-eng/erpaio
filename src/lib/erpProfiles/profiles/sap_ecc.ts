// SAP ECC (ERP Central Component) profile — skeleton.
// Faza 12'de SAP ABAP uzmanı + Claude ile genişletilecek.
// Bu sürüm: ana 8 modül + 30 tablo, en sık kullanılanlar.
export const SAP_ECC_YAML = String.raw`
name: SAP ECC
slug: sap_ecc
version_range: "ECC 6.0 - S/4HANA 2023"
language: en
locale: en-US
currency_default: EUR

description: |
  SAP ECC / S/4HANA Türkçe-İngilizce karışık etiketli, modüler ERP.
  Tablolar 4-5 char kod (BKPF, BSEG, MARA gibi), yine de tahmin edilebilir.
  Modül prefixleri:
    BK*  Buchhaltung (muhasebe header) — örn BKPF
    BS*  Buchhaltung (satır) — örn BSEG, BSAK
    MA*  Material — örn MARA, MARC, MARD
    KN*  Kundenstammsatz (müşteri) — örn KNA1, KNB1
    LF*  Lieferantenstammsatz (tedarikçi) — örn LFA1, LFB1
    EK*  Einkauf (satınalma) — örn EKKO, EKPO
    VB*  Vertrieb (satış) — örn VBAK, VBAP
    LIK*  Lagerort (stok lokasyon) — örn LIKP, LIPS

canonical_tables:

  KNA1:
    description: Customer master (general)
    aliases: [müşteri, customer, kunde]
    important_columns:
      - { name: KUNNR, type: char(10), meaning: "müşteri kodu (PK)" }
      - { name: NAME1, type: char(35), meaning: "müşteri adı" }
      - { name: STRAS, type: char(35), meaning: "adres" }
      - { name: ORT01, type: char(35), meaning: "şehir" }
      - { name: LAND1, type: char(3), meaning: "ülke kodu (TR, DE, US)" }

  LFA1:
    description: Vendor / supplier master
    aliases: [tedarikçi, vendor, supplier]
    important_columns:
      - { name: LIFNR, type: char(10), meaning: "tedarikçi kodu (PK)" }
      - { name: NAME1, type: char(35) }
      - { name: STRAS, type: char(35) }
      - { name: LAND1, type: char(3) }

  MARA:
    description: Material master (general)
    aliases: [ürün, malzeme, sku, material]
    important_columns:
      - { name: MATNR, type: char(18), meaning: "malzeme kodu (PK)" }
      - { name: MTART, type: char(4), meaning: "material type (FERT=mamul, ROH=hammadde, HAWA=ticari)" }
      - { name: MEINS, type: char(3), meaning: "base unit (PC, KG, M)" }

  MARC:
    description: Material per plant
    aliases: [ürün-fabrika, plant material]
    important_columns:
      - { name: MATNR, type: char(18) }
      - { name: WERKS, type: char(4), meaning: "plant code" }
      - { name: DISMM, type: char(2), meaning: "MRP type" }

  BKPF:
    description: Accounting document header (muhasebe başlığı)
    aliases: [fatura başlığı, journal entry header, beleg]
    important_columns:
      - { name: BUKRS, type: char(4), meaning: "company code" }
      - { name: BELNR, type: char(10), meaning: "document number (PK with year)" }
      - { name: GJAHR, type: char(4), meaning: "fiscal year (PK with belnr)" }
      - { name: BLDAT, type: date, meaning: "document date" }
      - { name: BUDAT, type: date, meaning: "posting date" }
      - { name: BLART, type: char(2), meaning: "document type (RE=invoice, KZ=payment)" }
      - { name: WAERS, type: char(5), meaning: "currency" }

  BSEG:
    description: Accounting document line item (satır)
    aliases: [fatura satırı, journal entry line]
    important_columns:
      - { name: BUKRS, type: char(4) }
      - { name: BELNR, type: char(10) }
      - { name: GJAHR, type: char(4) }
      - { name: BUZEI, type: numc(3), meaning: "line item number" }
      - { name: KOART, type: char(1), meaning: "account type (D=customer, K=vendor, S=GL)" }
      - { name: KUNNR, type: char(10) }
      - { name: LIFNR, type: char(10) }
      - { name: WRBTR, type: curr, meaning: "amount in document currency" }
      - { name: SHKZG, type: char(1), meaning: "debit/credit (S=debit, H=credit)" }

  EKKO:
    description: Purchasing document header (satınalma siparişi başlığı)
    aliases: [satınalma siparişi, purchase order header]
    important_columns:
      - { name: EBELN, type: char(10), meaning: "PO number (PK)" }
      - { name: BUKRS, type: char(4) }
      - { name: BSART, type: char(4), meaning: "PO type (NB=standard, RV=consignment)" }
      - { name: LIFNR, type: char(10) }
      - { name: BEDAT, type: date, meaning: "PO date" }
      - { name: WAERS, type: char(5) }

  VBAK:
    description: Sales document header (satış siparişi başlığı)
    aliases: [satış siparişi, sales order header]
    important_columns:
      - { name: VBELN, type: char(10), meaning: "sales doc number (PK)" }
      - { name: AUART, type: char(4), meaning: "sales doc type (TA=standard, B1=rush)" }
      - { name: KUNNR, type: char(10) }
      - { name: ERDAT, type: date, meaning: "creation date" }
      - { name: NETWR, type: curr, meaning: "net value" }
      - { name: WAERK, type: char(5) }

common_queries:
  - q_pattern: ["bu ay satış", "monthly sales"]
    sql: |
      SELECT SUM(NETWR) AS total
      FROM VBAK
      WHERE EXTRACT(YEAR FROM ERDAT) = EXTRACT(YEAR FROM CURRENT_DATE)
        AND EXTRACT(MONTH FROM ERDAT) = EXTRACT(MONTH FROM CURRENT_DATE);

  - q_pattern: ["açık siparişler", "open orders"]
    sql: |
      SELECT VBAK.VBELN, KNA1.NAME1, VBAK.NETWR
      FROM VBAK
      JOIN KNA1 ON KNA1.KUNNR = VBAK.KUNNR
      WHERE VBAK.AUART = 'TA';

glossary:
  müşteri: KNA1
  tedarikçi: LFA1
  ürün: MARA
  fatura: "BKPF + BSEG (header + lines)"
  satış: VBAK
  satınalma: EKKO
  belge: BKPF
  cari: "KNA1 (D account) veya LFA1 (K account)"

conventions:
  - "BSEG.SHKZG = 'S' (Soll/debit), 'H' (Haben/credit) — borç/alacak"
  - "BSEG amount işareti SHKZG'ye göre — net hesap için SUM(CASE WHEN SHKZG='S' THEN WRBTR ELSE -WRBTR END)"
  - "Tarih: SAP ECC için DATS format YYYYMMDD veya date column. CURRENT_DATE ANSI."
  - "Tablo isimleri büyük harf, kolon kodları 4-5 char. ABAP'tan gelen mantık."
  - "Customer code (KUNNR) ve vendor code (LIFNR) ayrı namespace'ler — KOART ile ayırılır"
`;
