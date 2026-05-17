# Dashboard i18n

Lean, dependency-free i18n for the dashboard. Cookie-backed (`erpaio_lang`),
shared with the landing language flow defined in `src/proxy.ts`.

## Kullanım

```tsx
"use client";
import { useT } from "@/lib/i18n/context";

export default function MyPage() {
  const t = useT();
  return <h1>{t.settings.title}</h1>;
}
```

`useI18n()` ayrıca `locale` ve `setLocale(next)` döner — language switcher
için kullanılabilir (örnek: `app/dashboard/settings/page.tsx`).

## Yeni anahtar ekleme

1. `dictionary.ts` içinde `Dictionary` arayüzüne anahtarı ekle (zorunlu alan).
2. `tr.ts` ve `en.ts` içine aynı anahtarı doldur — TypeScript eksik anahtarda
   derleme hatası verir.
3. Kullanan component'te `t.namespace.key` olarak çağır.

## Yeni dil ekleme (örn. `ar`)

1. `dictionary.ts` → `Locale = "tr" | "en" | "ar"` ve `SUPPORTED_LOCALES`
2. `src/lib/i18n/ar.ts` yeni dosya, tüm anahtarları çevir.
3. `context.tsx` → `DICTS` map'ine `ar` ekle.
4. RTL ihtiyacı varsa `<html dir>` veya component bazlı yönetilebilir.

## Aşamalı migrasyon

Şu an sadece **Ayarlar > Dil** UI'da i18n aktif. Diğer sayfalar TR
hardcoded — incremental migrasyon planı:

1. Login + Signup ekranları
2. DashboardSidebar + DashboardHeader nav etiketleri
3. Settings page tamamı (mevcut TR'leri `t.settings.*`'a taşı)
4. Security, Chat, Alerts ekranları
5. API error mesajları (sunucu tarafı için ayrı `Accept-Language` header'a
   bakacak utility gerekir)

## Mobile mirror

`mobile/src/lib/i18n/` aynı yapıyı AsyncStorage ile barındırır. Anahtarları
senkronize tutun — değişiklik yaparken iki taraftaki dictionary'i de güncelleyin.
