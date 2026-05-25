import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  isPathPublic,
  isMaintenanceBypassed,
  isApiPath,
  pickLandingFile,
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

  // Unauth user on root → serve static landing.html based on cookie language
  if (isRoot && !isLoggedIn) {
    const lang = req.cookies.get("erpaio_lang")?.value;
    return NextResponse.rewrite(new URL(pickLandingFile(lang), req.url));
  }

  if (!isLoggedIn && !isPathPublic(path) && !isApiPath(path)) {
    return Response.redirect(new URL("/login", req.url));
  }
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf)$).*)"],
};
