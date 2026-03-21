import { NextRequest, NextResponse } from "next/server"

const PUBLIC_ROUTES = ["/login"]
const STAFF_ONLY_ROUTES = ["/profile"]
const MANAGER_ONLY_ROUTES = ["/people", "/tasks", "/calendar"]

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Legge il cookie auth
  const auth = req.cookies.get("shiftplanner-auth")?.value
  let currentUser = null
  try {
    const parsed = JSON.parse(auth ?? "{}")
    currentUser = parsed?.state?.currentUser ?? null
  } catch { }

  // Se non loggato e non è una route pubblica → login
  if (!currentUser && !PUBLIC_ROUTES.includes(pathname)) {
    return NextResponse.redirect(new URL("/login", req.url))
  }

  // Se loggato e va su /login → home
  if (currentUser && pathname === "/login") {
    return NextResponse.redirect(new URL("/", req.url))
  }

  // Staff non può vedere route manager
  if (currentUser?.role === "staff" && MANAGER_ONLY_ROUTES.some(r => pathname.startsWith(r))) {
    return NextResponse.redirect(new URL("/profile", req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next|api|favicon.ico|.*\\..*).*)"],
}
