import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/api/webhooks/clerk",
  "/auth/signin(.*)",
  "/auth/signup(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  // Pass the entire NextRequest into your matcher
  if (isPublicRoute(req)) {
    return NextResponse.next();
  }

  // Protect anything that isn’t in your public matcher
  await auth.protect();
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
