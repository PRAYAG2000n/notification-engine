"use client";

import { Suspense } from "react";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Bell, Github, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams?.get("callbackUrl") || "/dashboard";
  const error = searchParams?.get("error") ?? null;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(error);

  async function handleCredentialsLogin(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setLoginError(null);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl,
    });

    if (result?.error) {
      setLoginError(result.error);
      setIsLoading(false);
    } else if (result?.url) {
      router.push(result.url);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-50 px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-600">
            <Bell className="h-6 w-6 text-white" />
          </div>
          <h1 className="mt-4 text-xl font-bold text-surface-900">
            Sign in to NotifyHub
          </h1>
          <p className="mt-1 text-sm text-surface-500">
            Real-time notification dashboard
          </p>
        </div>

        {/* OAuth buttons */}
        <div className="space-y-3">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => signIn("github", { callbackUrl })}
          >
            <Github className="h-4 w-4" />
            Continue with GitHub
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => signIn("google", { callbackUrl })}
          >
            <Mail className="h-4 w-4" />
            Continue with Google
          </Button>
        </div>

        {/* Divider */}
        <div className="my-6 flex items-center gap-3">
          <span className="h-px flex-1 bg-surface-200" />
          <span className="text-xs text-surface-400">or</span>
          <span className="h-px flex-1 bg-surface-200" />
        </div>

        {/* Credentials form */}
        <form onSubmit={handleCredentialsLogin} className="space-y-4">
          {loginError && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {loginError}
            </div>
          )}

          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-surface-700"
            >
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-surface-300 bg-white px-3 py-2 text-sm text-surface-900 placeholder:text-surface-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-surface-700"
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-surface-300 bg-white px-3 py-2 text-sm text-surface-900 placeholder:text-surface-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              placeholder="Your password"
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? "Signing in..." : "Sign in"}
          </Button>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
