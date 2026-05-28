/**
 * ERP'ye göre read-only DB user oluşturma SQL scripti.
 *
 * Yeni kullanıcılar IT departmanlarına "erpaio için ne yetki vermem
 * gerek?" sorduğunda kopyala-yapıştır gidebilecek bir script. SADECE
 * SELECT yetkisi verir; INSERT/UPDATE/DELETE/DDL hiçbir tabloda yok.
 *
 * ERP-spesifik kararlar:
 *   - MS SQL (Nebim, Dynamics 365): CREATE LOGIN + CREATE USER + GRANT SELECT
 *     ON SCHEMA::dbo. Database-level scope; cross-schema yetki yok.
 *   - PostgreSQL (Odoo, ERPNext, custom): CREATE ROLE LOGIN + GRANT USAGE
 *     ON SCHEMA + GRANT SELECT ON ALL TABLES + default privilege.
 *   - SAP (Oracle): CREATE USER + GRANT CONNECT + GRANT SELECT ON
 *     specific schemas. Oracle SAP genelde SAPSR3 schema'da; user yine
 *     de SELECT ANY TABLE değil, sadece SAPSR3.* kapsamı.
 *
 * NOT: Script'i kopyalayan IT admin'i kendi password politikasıyla
 * UPPERCASE/lowercase/sayı zorunluluğunu karşılayacak password seçmeli.
 * '<güçlü-şifre>' placeholder mesajla anlatılır UI'da.
 */
import type { ErpType } from "./erpTypes";

export interface ReadOnlyUserScript {
  /** Multi-line SQL — IT admin doğrudan kopyalar. */
  sql: string;
  /** Açıklama — kullanıcıya gösterilecek kısa not. */
  notes: string;
}

export function readOnlyUserSql(erpType: ErpType): ReadOnlyUserScript {
  switch (erpType) {
    case "nebim_v3":
    case "dynamics365":
      return {
        sql: `-- MS SQL Server için read-only kullanıcı (erpaio için)
-- Bu komutları master DB'de çalıştırın, sonra hedef DB'ye geçin.

USE master;
GO

CREATE LOGIN erpaio_readonly WITH PASSWORD = '<güçlü-şifre>';
GO

USE <veritabani-adi>;
GO

CREATE USER erpaio_readonly FOR LOGIN erpaio_readonly;
GO

-- Yalnızca okuma yetkisi (db_datareader rolü tüm tablolara SELECT verir).
ALTER ROLE db_datareader ADD MEMBER erpaio_readonly;
GO

-- İsteğe bağlı: information_schema'ya da erişim (ERPAIO schema tarama için).
GRANT VIEW DEFINITION TO erpaio_readonly;
GO`,
        notes:
          "MS SQL Server. '<güçlü-şifre>' yerine kendi politikanıza uygun bir şifre seçin. '<veritabani-adi>' yerine ERPAIO ile bağlanacağınız DB adını yazın (örn. NebimDB). Bu kullanıcı sadece SELECT yapabilir.",
      };

    case "postgres":
      return {
        sql: `-- PostgreSQL için read-only kullanıcı (erpaio için)

CREATE ROLE erpaio_readonly WITH LOGIN PASSWORD '<güçlü-şifre>';

-- Hedef veritabanına bağlanma yetkisi
GRANT CONNECT ON DATABASE <veritabani-adi> TO erpaio_readonly;

-- Bu komutları hedef DB'ye bağlıyken çalıştırın:
\\c <veritabani-adi>

GRANT USAGE ON SCHEMA public TO erpaio_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO erpaio_readonly;

-- İleride eklenecek tablolar için de SELECT default privilege:
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO erpaio_readonly;`,
        notes:
          "PostgreSQL. '<güçlü-şifre>' ve '<veritabani-adi>' yerine kendi değerlerinizi yazın. Default privilege sayesinde ileride eklenen tablolar da otomatik okunabilir olur.",
      };

    case "sap":
      return {
        sql: `-- SAP / Oracle için read-only kullanıcı (erpaio için)
-- Bu komutları SYSTEM veya DBA yetkili kullanıcıyla çalıştırın.

CREATE USER erpaio_readonly IDENTIFIED BY "<güçlü-şifre>";

-- Bağlantı + tablo görme yetkileri
GRANT CONNECT TO erpaio_readonly;
GRANT SELECT ANY DICTIONARY TO erpaio_readonly;

-- SAP standart şemasına SELECT (genelde SAPSR3):
-- Aşağıdaki komutu her hedef tablo için tekrarlayın veya toplu
-- script ile USER_TABLES'tan generate edin.
GRANT SELECT ON SAPSR3.<tablo-adi> TO erpaio_readonly;

-- Veya tüm SAPSR3 şemasına okuma yetkisi (SAP basis ekibinden onay):
-- GRANT SELECT ANY TABLE TO erpaio_readonly;

-- Default tablespace + quota (Oracle gereği):
ALTER USER erpaio_readonly DEFAULT TABLESPACE USERS;
ALTER USER erpaio_readonly QUOTA UNLIMITED ON USERS;`,
        notes:
          "SAP üzerinde Oracle DB. SAPSR3 standart SAP şema adı; kendi SAP kurulumunuza göre değişebilir. Toplu erişim için SAP basis ekibinden onay alın — SELECT ANY TABLE geniş kapsamlı bir yetkidir.",
      };
  }
}
