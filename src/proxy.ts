import { auth } from "@/lib/auth";

const PUBLIC_PATHS = ["/login", "/privacy", "/terms", "/signup", "/forgot-password", "/reset-password", "/pricing", "/docs", "/status", "/accept-invite"];

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const path = req.nextUrl.pathname;
  const isPublic = PUBLIC_PATHS.some((p) => path === p || path.startsWith(p + "/"));
  const isApi = path.startsWith("/api");

  if (!isLoggedIn && !isPublic && !isApi) {
    return Response.redirect(new URL("/login", req.url));
  }
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
