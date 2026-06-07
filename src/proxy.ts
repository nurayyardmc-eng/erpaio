import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  isPathPublic,
  isMaintenanceBypassed,
  isApiPath,
  isSupportedLandingLang,
} from "@/lib/proxy-helpers";

export default auth((req) => {
  const path = req.nextUrl.pathname;

  if (process.env.MAINTENANCE_MODE === "true") {
    if (!isMaintenanceBypassed(path)) {
      return Response.redirect(new URL("/maintenance", req.url));
    }
  }

  const isLoggedIn = !!req.auth;
  const isRoot = path === "/";

  // Lang query param → set cookie + redirect (clean URL)
  const langParam = req.nextUrl.searchParams.get("lang");
  if (isRoot && isSupportedLandingLang(langParam)) {
    const res = NextResponse.redirect(new URL("/", req.url));
    res.cookies.set("erpaio_lang", langParam!, { maxAge: 60 * 60 * 24 * 365, path: "/" });
    return res;
  }

  // Sprint G — landing cutover. Unauth visitors at root now get the SSR
  // landing (/landing-ssr) instead of the static /landing-*.html files,
  // so the new Product & Growth sections (AI demo, analytics, enterprise
  // trust, data connection, lead-gen) are live. The SSR page resolves
  // locale from the erpaio_lang cookie itself (same cookie the old static
  // rewrite keyed on), so language selection is preserved.
  //
  // Cache: locale is cookie-determined, so this response is NOT safe to
  // share-cache at the CDN — every locale would collide on the "/" key
  // and a TR visitor could be served a cached EN page. Mark it private +
  // must-revalidate; the SSR render is light and fast, while the heavy
  // assets (landing.css, fonts, images) carry their own long-lived cache
  // headers. (CDN-level stale-while-revalidate would require moving the
  // locale into the URL path — a follow-up, not needed for correctness.)
  //
  // Rollback: the static /landing-*.html files remain on disk; reverting
  // this block to the previous rewrite restores them instantly.
  if (isRoot && !isLoggedIn) {
    const res = NextResponse.rewrite(new URL("/landing-ssr", req.url));
    res.headers.set("Cache-Control", "private, no-cache, must-revalidate");
    return res;
  }

  if (!isLoggedIn && !isPathPublic(path) && !isApiPath(path)) {
    return Response.redirect(new URL("/login", req.url));
  }
});

// Sprint F.12 — exclude .css, .js, .html, .json, .txt, .xml from middleware.
// Original matcher only excluded image + font extensions, so /landing.css
// (introduced by F.5a) was 302'ing to /login. Production / landing pages
// have been unstyled since F.5a as a result. Hot fix.
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|css|js|html|json|txt|xml|map)$).*)"],
};
