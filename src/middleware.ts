// src/middleware.ts
import {
  clerkMiddleware,
  createRouteMatcher,
  clerkClient,
} from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// 1) Define truly public routes
const isPublicRoute = createRouteMatcher([
  "/",
  "/api/webhook/register",
  "/auth/signup",
  "/auth/signin",
]);

export default clerkMiddleware(async (auth, req: NextRequest) => {
  const url = req.nextUrl.clone();

  // 2) If user is signed in and is hitting /auth pages, bounce to dashboard
  const { userId, sessionId } = await auth();
  if (sessionId && userId && isPublicRoute(req)) {
    // Redirect signed‑in users away from the sign‑in/sign‑up UI
    url.pathname = "/dashboard";
    return NextResponse.redirect(url); // temporary 307 redirect by default :contentReference[oaicite:4]{index=4}
  }

  // 3) Allow public routes (except we already handled signed‑in case above)
  if (isPublicRoute(req)) {
    return NextResponse.next();
  }

  // 4) Enforce authentication
  const { redirectToSignIn } = await auth();
  if (!sessionId || !userId) {
    return redirectToSignIn({ returnBackUrl: req.nextUrl.pathname });
  }

  // 5) Fetch role for admin routing
  let role: string | undefined;
  try {
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    role = user.publicMetadata.role as string | undefined;
  } catch (err) {
    console.error("Error fetching user metadata:", err);
    return NextResponse.redirect(new URL("/error", req.url));
  }

  // 6) Admins to /admin/dashboard
  if (url.pathname === "/dashboard" && role === "admin") {
    url.pathname = "/admin/dashboard";
    return NextResponse.redirect(url);
  }

  // 7) Block non‑admins from /admin/*
  if (url.pathname.startsWith("/admin") && role !== "admin") {
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  // 8) All other authenticated routes proceed
  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|png|gif|svg|woff2?|ico)).*)",
    "/(api|trpc)(.*)",
  ],
};
