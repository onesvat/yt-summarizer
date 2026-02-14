
import NextAuth from "next-auth"
import authConfig from "@/lib/auth.config"

// Use the Edge-safe config (no Prisma) for middleware
const { auth } = NextAuth(authConfig)

export default auth((req) => {
    const isLoggedIn = !!req.auth
    const isOnDashboard = req.nextUrl.pathname.startsWith("/dashboard")

    if (isOnDashboard && !isLoggedIn) {
        return Response.redirect(new URL("/signin", req.nextUrl))
    }

    if (isLoggedIn && req.nextUrl.pathname.startsWith("/signin")) {
        return Response.redirect(new URL("/dashboard", req.nextUrl))
    }
})

export const config = {
    matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}
