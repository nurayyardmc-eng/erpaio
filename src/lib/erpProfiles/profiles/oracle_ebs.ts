// Oracle E-Business Suite profile — skeleton.
// Faza 12'de EBS uzmanı + Claude ile genişletilecek.
export const ORACLE_EBS_YAML = String.raw`
name: Oracle E-Business Suite
slug: oracle_ebs
version_range: "R12.1 - R12.2"
language: en
locale: en-US
currency_default: USD

description: |
  Oracle EBS modüler ERP. Schema'lar her modül için ayrı:
    AR        Accounts Receivable (alacak)
    AP        Accounts Payable (borç)
    GL        General Ledger (defter-i kebir)
    INV       Inventory
    OM        Order Management (sipariş)
    PO        Purchasing (satınalma)
    HR_HRMS   HR
  Tablolar genelde _ALL suffix'li (multi-org), ama _V view'leri daha kullanışlı.

canonical_tables:

  HZ_PARTIES:
    description: Trading Community Architecture — all parties (customers + suppliers + employees)
    aliases: [parti, customer, supplier, contact]
    important_columns:
      - { name: PARTY_ID, type: number, meaning: "PK" }
      - { name: PARTY_NAME, type: varchar2(360) }
      - { name: PARTY_TYPE, type: varchar2(30), values: { ORGANIZATION: "şirket", PERSON: "kişi", PARTNER: "ortak" } }
      - { name: ADDRESS1, type: varchar2(240) }
      - { name: COUNTRY, type: varchar2(2) }

  AR_CUSTOMERS:
    description: Customer master (legacy view, 11i compatibility)
    aliases: [müşteri, customer]
    important_columns:
      - { name: CUSTOMER_ID, type: number }
      - { name: CUSTOMER_NAME, type: varchar2(50) }
      - { name: STATUS, type: varchar2(1), values: { A: "active", I: "inactive" } }

  RA_CUSTOMER_TRX_ALL:
    description: Customer transactions / invoices header
    aliases: [müşteri faturası, customer invoice, satış faturası]
    important_columns:
      - { name: CUSTOMER_TRX_ID, type: number, meaning: "PK" }
      - { name: TRX_NUMBER, type: varchar2(20), meaning: "invoice number" }
      - { name: TRX_DATE, type: date }
      - { name: BILL_TO_CUSTOMER_ID, type: number }
      - { name: ORG_ID, type: number, meaning: "operating unit" }
      - { name: INVOICE_CURRENCY_CODE, type: varchar2(15) }

  RA_CUSTOMER_TRX_LINES_ALL:
    description: Invoice lines
    aliases: [fatura satırı, invoice line]
    important_columns:
      - { name: CUSTOMER_TRX_ID, type: number }
      - { name: CUSTOMER_TRX_LINE_ID, type: number }
      - { name: LINE_TYPE, type: varchar2(20), values: { LINE: "ürün", FREIGHT: "nakliye", TAX: "vergi" } }
      - { name: QUANTITY_INVOICED, type: number }
      - { name: UNIT_SELLING_PRICE, type: number }
      - { name: EXTENDED_AMOUNT, type: number }

  AP_INVOICES_ALL:
    description: Vendor invoices (payable)
    aliases: [tedarikçi faturası, vendor invoice, alış faturası]
    important_columns:
      - { name: INVOICE_ID, type: number }
      - { name: INVOICE_NUM, type: varchar2(50) }
      - { name: VENDOR_ID, type: number }
      - { name: INVOICE_DATE, type: date }
      - { name: INVOICE_AMOUNT, type: number }
      - { name: PAYMENT_STATUS_FLAG, type: varchar2(1), values: { Y: "paid", N: "unpaid", P: "partially" } }

  PO_HEADERS_ALL:
    description: Purchase order header
    aliases: [satınalma siparişi, PO]
    important_columns:
      - { name: PO_HEADER_ID, type: number }
      - { name: SEGMENT1, type: varchar2(20), meaning: "PO number" }
      - { name: VENDOR_ID, type: number }
      - { name: AUTHORIZATION_STATUS, type: varchar2(25), values: { APPROVED: "onaylı", IN_PROCESS: "süreçte", REJECTED: "red" } }

  MTL_SYSTEM_ITEMS_B:
    description: Inventory item master
    aliases: [ürün, item, malzeme]
    important_columns:
      - { name: INVENTORY_ITEM_ID, type: number }
      - { name: SEGMENT1, type: varchar2(40), meaning: "item number" }
      - { name: DESCRIPTION, type: varchar2(240) }
      - { name: ORGANIZATION_ID, type: number }

common_queries:
  - q_pattern: ["bu ay satış", "monthly sales"]
    sql: |
      SELECT SUM(EXTENDED_AMOUNT) AS total
      FROM RA_CUSTOMER_TRX_LINES_ALL l
      JOIN RA_CUSTOMER_TRX_ALL h ON h.CUSTOMER_TRX_ID = l.CUSTOMER_TRX_ID
      WHERE EXTRACT(YEAR FROM h.TRX_DATE) = EXTRACT(YEAR FROM SYSDATE)
        AND EXTRACT(MONTH FROM h.TRX_DATE) = EXTRACT(MONTH FROM SYSDATE)
        AND l.LINE_TYPE = 'LINE';

  - q_pattern: ["ödenmemiş tedarikçi", "unpaid vendor invoices"]
    sql: |
      SELECT INVOICE_NUM, VENDOR_ID, INVOICE_AMOUNT, INVOICE_DATE
      FROM AP_INVOICES_ALL
      WHERE PAYMENT_STATUS_FLAG IN ('N', 'P')
      ORDER BY INVOICE_DATE;

glossary:
  müşteri: AR_CUSTOMERS
  tedarikçi: HZ_PARTIES (PARTY_TYPE='ORGANIZATION') + AP vendor
  ürün: MTL_SYSTEM_ITEMS_B
  fatura: "RA_CUSTOMER_TRX_ALL (header) + RA_CUSTOMER_TRX_LINES_ALL"
  alış: AP_INVOICES_ALL
  sipariş: "PO_HEADERS_ALL (satınalma) veya OE_ORDER_HEADERS_ALL (satış)"
  belge: "trx_id veya invoice_id"

conventions:
  - "Tarih: Oracle SYSDATE, date type. EXTRACT(YEAR FROM ...) ANSI."
  - "_ALL suffix multi-org tabloları gösterir, ORG_ID filter genelde gerekli"
  - "RA_*_V view'leri 11i'den kalma, _ALL kullanımı daha güncel"
  - "Tutar işaretsiz, line_type ile ayrılır (LINE, TAX, FREIGHT)"
  - "Customer ID iki yerde: HZ_PARTIES.PARTY_ID (modern) veya AR_CUSTOMERS.CUSTOMER_ID (legacy)"
`;
