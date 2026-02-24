import { NextRequest, NextResponse } from "next/server";
import { verifyJWT } from "@/lib/auth";

// Routes that require a valid JWT (all mutating operations on groups)
const PROTECTED_PATTERNS = [
  /^\/api\/groups(\/.*)?$/,  // all group writes
];

// These paths are always public (no auth required)
const PUBLIC_PATHS = [
  "/api/auth/nonce",
  "/api/auth/verify",
  "/api/users",
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const method = req.method;

  // Only guard mutating methods
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
    return NextResponse.next();
  }

  // Allow public paths
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Check if this path needs protection
  const needsAuth = PROTECTED_PATTERNS.some((re) => re.test(pathname));
  if (!needsAuth) return NextResponse.next();

  // Extract token from Bearer header or cookie
  const authHeader = req.headers.get("authorization");
  const token =
    authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : req.cookies.get("sb_token")?.value;

  if (!token) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const address = await verifyJWT(token);
  if (!address) {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
  }

  // Attach verified address to request headers for API routes
  const headers = new Headers(req.headers);
  headers.set("x-wallet-address", address);

  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: ["/api/:path*"],
};
