# ERPAIO'ya Katkıda Bulunma

Bu doküman ERPAIO projesinde geliştirme yapacak yeni geliştiriciler için hızlı başlangıç rehberidir. Mimari ve detaylar için [`CLAUDE.md`](./CLAUDE.md) dosyasına bakın.

## İlk Kurulum

### Gereksinimler
- **Node.js 20+** ve **npm 10+**
- PostgreSQL veritabanı (yerel veya [Supabase](https://supabase.com))
- ERP DB erişimi (MS SQL veya PostgreSQL — read-only kullanıcı önerilir)
- [Anthropic Console](https://console.anthropic.com) API key

### Adımlar

```bash
# 1. Repo'yu klonla
git clone https://github.com/nurayyardmc-eng/erpaio.git
cd erpaio

# 2. Bağımlılıkları yükle
npm install

# 3. Env dosyasını hazırla
cp .env.example .env.local
# .env.local'i editörde açıp gerçek değerlerle doldur

# 4. Veritabanını migrate et
npx prisma migrate deploy

# 5. Dev sunucu başlat
npm run dev    # http://localhost:3000
```

İlk kullanıcıyı kayıt etmek için: `http://localhost:3000/signup`

## Kullanışlı komutlar

```bash
npm test                 # Vitest — 63 unit test
npm run build            # Production build (Turbopack)
npx tsc --noEmit         # Type check
npx prisma studio        # DB GUI
npx prisma migrate dev   # Yerel migration oluştur + uygula
npx prisma generate      # Prisma Client'i yeniden oluştur
```

## PR Akışı

1. **Branch oluştur** — `feat/xxx`, `fix/xxx`, `chore/xxx` prefix'i
2. **Değişiklik yap** — küçük commit'ler tercih edilir
3. **Lokal kontrol** — `npm test && npx tsc --noEmit && npm run build` hepsi geçmeli
4. **Push + PR aç** — açıklamada ne/neden yazılmalı
5. **CI bekle** — GitHub Actions test+tsc+build çalıştırır
6. **Review** — onaylanınca merge

### Commit mesaj stili
- `feat:` yeni özellik
- `fix:` bug fix
- `security:` güvenlik düzeltmesi
- `chore:` temizlik, refactor
- `docs:` doküman
- `test:` test eklendi/değişti

## Mimari prensipler

### 1. Multi-tenant izolasyon (CRITICAL)
**Her** Prisma sorgusunda `tenantId` filter olmalı. Tek istisna: public auth endpoint'leri (signup, login, forgot-password).

```typescript
// ✓ Doğru
await prisma.alert.findMany({
  where: { tenantId: session.user.tenantId },
});

// ✗ YANLIŞ — başka tenant'ın verisini sızdırır
await prisma.alert.findMany({ where: { status: "open" } });
```

### 2. Read-only ERP
ERP veritabanlarında **sadece** SELECT/WITH izinli. `src/lib/validators/sql.ts` 50+ test ile koruyor. Yeni endpoint eklerken `validateSQL()` çağırın.

### 3. Auth pattern
- **Web** (cookie session): NextAuth JWT
- **Mobile/API** (Bearer token): `apiToken` table
- **Helper**: `getAuth(req)` ikisini de destekler — `src/lib/auth/dual.ts`

```typescript
const session = await getAuth(req);
if (!session?.user) return Response.json({ error: "Yetkisiz." }, { status: 401 });
```

### 4. Validation
Tüm POST/PATCH endpoint'leri Zod ile validate eder + body size kontrolü:

```typescript
const tooBig = checkBodySize(req);
if (tooBig) return tooBig;

const body = Schema.safeParse(await req.json());
if (!body.success) return Response.json({ error: body.error.issues[0]?.message ?? "Geçersiz veri" }, { status: 400 });
```

### 5. Encryption
ERP credential'ları AES-256-GCM ile şifreli. `src/lib/crypto/encrypt.ts` — `ENCRYPTION_KEY` env değişkenine bağlı. Anahtar değişirse mevcut credentials okunamaz hale gelir.

## Klasör yapısı (özet)

```
src/
├── app/
│   ├── api/                 # 50+ API endpoint
│   ├── dashboard/           # Auth-required SPA pages
│   └── (landing)/           # /pricing, /docs, /help, vb.
├── components/              # Toaster, Confirm, EmptyState, ErrorState…
├── lib/
│   ├── auth/                # NextAuth + dual auth
│   ├── crypto/              # AES-256-GCM
│   ├── db/connector.ts      # MS SQL + Postgres dual ERP connector
│   ├── validators/sql.ts    # Read-only SQL validator
│   ├── notifications/       # email, whatsapp, push, slack, teams
│   └── theme.ts             # Renk token'ları
└── proxy.ts                 # Auth middleware + maintenance
```

## Test yaklaşımı

- **Unit**: vitest, `tests/` klasörü, 63 test mevcut
- **Critical paths**: validators/sql.ts, crypto/, anomaly/detectors
- **Yeni feature için**: ilgili lib fonksiyonu için unit test ekle

## Production deploy

```bash
vercel --prod --yes      # Sadece /Users/nurayyardimci/erpaio'dan
```

**Vercel Hobby** plan: günlük 100 deploy limiti — çoğu zaman GitHub push otomatik deploy yeterli.

## Sorun çıkarsa

- **Build hatası**: `rm -rf .next && npm run build`
- **Prisma client güncel değil**: `npx prisma generate`
- **Type error sürekli**: `npx tsc --noEmit`
- **Sentry'de hata**: [Sentry dashboard](https://sentry.io)
- **DB bağlantı**: `DATABASE_URL` (pooled) ve `DIRECT_URL` (direct) ayrı

## Bilinen kısıtlar

- Custom domain henüz yok (`erpaio.vercel.app`)
- Email deliverability düşük (Resend `onboarding@resend.dev` — kendi domain alındığında DNS doğrulanmalı)
- Stripe TR'de yok → manuel pilot faturalandırma (iyzico planlı)
- Dashboard sadece Türkçe (landing 3 dil)

## İletişim

Soru/sorun: GitHub Issue veya `support@erpaio.com`
