"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Invalid credentials");
      }
      router.push("/");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 bg-neutral-900 border-r border-neutral-800">
        <div>
          <span className="text-white font-bold text-xl tracking-tight">TRADE SOCIAL</span>
        </div>
        <div className="space-y-6">
          <div className="space-y-2">
            <p className="text-neutral-500 text-sm uppercase tracking-widest">What traders are saying</p>
            <blockquote className="text-white text-xl font-light leading-relaxed">
              "The backtest engine is the most accurate I've used. Finally a platform that treats slippage and fees seriously."
            </blockquote>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-neutral-700 flex items-center justify-center text-sm font-medium text-white">A</div>
            <div>
              <p className="text-white text-sm font-medium">Arjun Mehta</p>
              <p className="text-neutral-500 text-xs">Quantitative Trader · Mumbai</p>
            </div>
          </div>
        </div>
        <div className="flex gap-6 text-neutral-600 text-xs">
          <span>Backtesting</span>
          <span>Virtual Trading</span>
          <span>Risk Engine</span>
          <span>Analytics</span>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm space-y-8">
          {/* Mobile brand */}
          <div className="lg:hidden text-center">
            <span className="text-white font-bold text-xl tracking-tight">TRADE SOCIAL</span>
          </div>

          <div className="space-y-1">
            <h1 className="text-2xl font-semibold text-white">Welcome back</h1>
            <p className="text-neutral-500 text-sm">Sign in to your account to continue</p>
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 rounded-md bg-red-950/50 border border-red-900/50 text-red-400 text-sm">
              <span className="mt-0.5">⚠</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-neutral-300">Email address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="you@example.com"
                className="w-full bg-neutral-900 border border-neutral-700 rounded-md px-3 py-2.5 text-white text-sm placeholder-neutral-600 focus:outline-none focus:border-neutral-500 focus:ring-1 focus:ring-neutral-500 transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-neutral-300">Password</label>
                <button type="button" className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors">
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-md px-3 py-2.5 text-white text-sm placeholder-neutral-600 focus:outline-none focus:border-neutral-500 focus:ring-1 focus:ring-neutral-500 transition-colors pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 text-xs transition-colors"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-white hover:bg-neutral-100 disabled:opacity-40 text-neutral-950 font-semibold py-2.5 px-4 rounded-md text-sm transition-colors mt-2"
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <p className="text-center text-sm text-neutral-500">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="text-white hover:underline font-medium">
              Create one
            </Link>
          </p>

          <p className="text-center text-xs text-neutral-700">
            By signing in you agree to our{" "}
            <span className="underline cursor-pointer">Terms</span> and{" "}
            <span className="underline cursor-pointer">Privacy Policy</span>.
          </p>
        </div>
      </div>
    </div>
  );
}
