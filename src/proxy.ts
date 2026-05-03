import { auth } from "@/lib/auth";

const PUBLIC_PATHS = ["/login", "/privacy", "/terms", "/signup", "/forgot-password", "/reset-password", "/pricing", "/docs", "/status", "/accept-invite", "/verify-email", "/maintenance"];

const MAINTENANCE_BYPASS = ["/maintenance", "/status", "/api/health", "/api/cron"];

export default auth((req) => {
  const path = req.nextUrl.pathname;

  if (process.env.MAINTENANCE_MODE === "true") {
    const allowed = MAINTENANCE_BYPASS.some((p) => path === p || path.startsWith(p + "/"));
    if (!allowed) {
      return Response.redirect(new URL("/maintenance", req.url));
    }
  }

  const isLoggedIn = !!req.auth;
  const isPublic = PUBLIC_PATHS.some((p) => path === p || path.startsWith(p + "/"));
  const isApi = path.startsWith("/api");

  if (!isLoggedIn && !isPublic && !isApi) {
    return Response.redirect(new URL("/login", req.url));
  }
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf)$).*)"],
};
