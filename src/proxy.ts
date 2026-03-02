import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
    "/",
    "/challenges",
    "/challenges/(.*)",
    "/leaderboard",
    "/invite/(.*)",
    "/api/webhooks/(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
    if (!isPublicRoute(req)) {
        await auth.protect();
    }

    // Redirect authenticated users who haven't completed onboarding
    const { userId } = await auth();
    if (!userId) return;

    const isOnboarding = req.nextUrl.pathname === "/onboarding";
    const isApiRoute = req.nextUrl.pathname.startsWith("/api/");
    const hasOnboarded = req.cookies.get("eb_onboarded");

    if (!hasOnboarded && !isOnboarding && !isApiRoute) {
        return NextResponse.redirect(new URL("/onboarding", req.url));
    }
});

export const config = {
    matcher: [
        "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
        "/(api|trpc)(.*)",
    ],
};
