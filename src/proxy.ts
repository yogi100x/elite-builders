import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

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

    // Redirect new signups to onboarding
    const { userId } = await auth();
    const isNewUser = !req.cookies.get("eb_onboarded");
    if (userId && !isPublicRoute(req) && req.nextUrl.pathname !== "/onboarding" && isNewUser) {
        return Response.redirect(new URL("/onboarding", req.url));
    }
});

export const config = {
    matcher: [
        "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
        "/(api|trpc)(.*)",
    ],
};
