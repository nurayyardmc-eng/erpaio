# ERPAIO ile DB bağlantısı — Read-only User Oluşturma

ERPAIO ERP veritabanınıza **yalnızca okuma yetkisiyle** bağlanır. Müşteri olarak güvenliğinizi sağlamak için aşağıdaki SQL Server komutlarını **kendi DB sunucunuzda** (DBA olarak) çalıştırın.

## Adım 1: Read-only login + user oluştur

```sql
USE master;
CREATE LOGIN erpaio_readonly WITH
    PASSWORD = 'STRONG_RANDOM_PASSWORD_HERE',
    CHECK_POLICY = ON,
    DEFAULT_DATABASE = NebimDB;

USE NebimDB;
CREATE USER erpaio_readonly FOR LOGIN erpaio_readonly;
```

## Adım 2: Sadece SELECT yetkisi ver

```sql
USE NebimDB;

-- Tüm dbo şemasında SELECT'i aç
GRANT SELECT ON SCHEMA::dbo TO erpaio_readonly;

-- Diğer write yetkilerini açıkça reddet (defense in depth)
DENY INSERT, UPDATE, DELETE, ALTER, CONTROL ON SCHEMA::dbo TO erpaio_readonly;
DENY EXECUTE ON SCHEMA::dbo TO erpaio_readonly;
```

## Adım 3: (Opsiyonel) Hassas tablolar için DENY

ERPAIO'nun ASLA sorgulamaması gereken tablolar varsa açıkça reddedin:

```sql
DENY SELECT ON dbo.PersonelMaaslari TO erpaio_readonly;
DENY SELECT ON dbo.MusteriParolasi TO erpaio_readonly;
-- Her hassas tablo için tekrar
```

## Adım 4: ERPAIO panelinde bağlantı ekle

Dashboard → ERP Bağlantıları → Yeni Bağlantı:

- **Host:** SQL Server hostname/IP
- **Port:** 1433 (default)
- **Database:** `NebimDB` (kendi DB adınız)
- **Username:** `erpaio_readonly`
- **Password:** Adım 1'de oluşturduğunuz parola

## Doğrulama

ERPAIO bağlantı eklenince otomatik test eder. Başarılı bağlantı:
- ✓ "Bağlantı başarılı! N tablo bulundu"
- ✗ "Erişim reddedildi" → adımları gözden geçirin

## Güvenlik garantileri

ERPAIO ile birlikte çalışan **5 katmanlı koruma**:

1. **DB-side (siz):** SELECT-only user (yukarıdaki adımlar)
2. **ERPAIO SQL validator:** SELECT/WITH dışında her şey reddedilir (DROP, UPDATE, DELETE, EXEC, vb.)
3. **Schema constraint:** Yalnızca canlı şemada bulunan tablo/kolon referansı
4. **Prompt injection detection:** "Önceki talimatları unut" gibi saldırılar tespit edilir
5. **Audit log:** Tüm sorgularınız `/dashboard/audit` sayfasında, KVKK uyumlu

## Sorular?

İletişim: support@erpaio.com
