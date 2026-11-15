import { NextResponse, type NextRequest } from "next/server";

const GUEST_COOKIE = "pk_guest";
const ONE_YEAR = 60 * 60 * 24 * 365;

export function middleware(request: NextRequest) {
  if (request.cookies.get(GUEST_COOKIE)?.value) {
    return NextResponse.next();
  }

  const token = crypto.randomUUID();
  const cookieValue = `${GUEST_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${ONE_YEAR}`;
  const headers = new Headers(request.headers);
  headers.set("cookie", [request.headers.get("cookie"), cookieValue].filter(Boolean).join("; "));

  const response = NextResponse.next({ request: { headers } });
  response.cookies.set(GUEST_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ONE_YEAR,
  });

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
