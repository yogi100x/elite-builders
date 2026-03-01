import { SignIn } from "@clerk/nextjs";

export default function LoginPage() {
    return (
        <div className="flex h-[calc(100vh-4rem)] items-center justify-center p-4">
            <div className="w-full max-w-md space-y-8">
                <div className="text-center">
                    <h1 className="font-display text-2xl font-bold tracking-tight">
                        Sign in to EliteBuilders
                    </h1>
                    <p className="text-sm text-muted-foreground mt-2">
                        Welcome back! Please enter your details.
                    </p>
                </div>

                <div className="flex justify-center">
                    <SignIn
                        routing="hash"
                        fallbackRedirectUrl="/dashboard"
                    />
                </div>
            </div>
        </div>
    );
}
