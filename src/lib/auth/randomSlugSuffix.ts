/**
 * Random base36 suffix for slug fallback / collision retry. Track KKKKKKKKKK.
 *
 * Önceden iki yerde inline duplicated: slugify boş-input fallback (6 char) ve
 * signup collision-retry loop (4 char). Tek noktada toplandı — entropi alanı
 * (base36) ve uzunluk kontratı testlerde sabitlendi.
 *
 * NOT: Math.random() kriptografik DEĞİL. Sadece slug çakışma azaltması için
 * uygundur. Token üretimi için generateSecureToken() kullan.
 */
export function randomSlugSuffix(length: number): string {
  if (length <= 0) return "";
  // toString(36) ~10-13 char base36 verir; slice(2) "0." kısmını atar.
  // Yetmezse loop ile genişlet (length > 11 senaryosu).
  let out = "";
  while (out.length < length) {
    out += Math.random().toString(36).slice(2);
  }
  return out.slice(0, length);
}
