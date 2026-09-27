"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Registration failed");
      }
      router.push("/");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const strength = password.length === 0 ? 0 : password.length < 6 ? 1 : password.length < 10 ? 2 : 3;
  const strengthLabel = ["", "Weak", "Fair", "Strong"];
  const strengthColor = ["", "bg-red-500", "bg-yellow-500", "bg-emerald-500"];

  return (
    <div className="min-h-screen bg-neutral-950 flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 bg-neutral-900 border-r border-neutral-800">
        <span className="text-white font-bold text-xl tracking-tight">TRADE SOCIAL</span>
        <div className="space-y-8">
          <div className="space-y-4">
            <p className="text-neutral-500 text-xs uppercase tracking-widest">What you get</p>
            {[
              { icon: "⬛", title: "Professional Backtesting", desc: "Test strategies against years of historical data with realistic fees and slippage." },
              { icon: "⬛", title: "Virtual Trading", desc: "Run strategies on live market data without risking real capital." },
              { icon: "⬛", title: "Risk Engine", desc: "Configurable position limits, daily loss caps, and drawdown controls." },
              { icon: "⬛", title: "Strategy Social", desc: "Share strategies and results with a community of quantitative traders." },
            ].map((f) => (
              <div key={f.title} className="flex gap-3">
                <div className="w-8 h-8 rounded bg-neutral-800 flex items-center justify-center text-xs shrink-0">✓</div>
                <div>
                  <p className="text-white text-sm font-medium">{f.title}</p>
                  <p className="text-neutral-500 text-xs mt-0.5 leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <p className="text-neutral-700 text-xs">Simulated trading only. Not financial advice.</p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm space-y-8">
          <div className="lg:hidden text-center">
            <span className="text-white font-bold text-xl tracking-tight">TRADE SOCIAL</span>
          </div>

          <div className="space-y-1">
            <h1 className="text-2xl font-semibold text-white">Create your account</h1>
            <p className="text-neutral-500 text-sm">Free to use. No credit card required.</p>
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
              <label className="text-sm font-medium text-neutral-300">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  placeholder="Min. 8 characters"
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-md px-3 py-2.5 text-white text-sm placeholder-neutral-600 focus:outline-none focus:border-neutral-500 focus:ring-1 focus:ring-neutral-500 transition-colors pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 text-xs"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
              {password.length > 0 && (
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex gap-1 flex-1">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i <= strength ? strengthColor[strength] : "bg-neutral-800"}`} />
                    ))}
                  </div>
                  <span className="text-xs text-neutral-500">{strengthLabel[strength]}</span>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-neutral-300">Confirm password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
                placeholder="••••••••"
                className={`w-full bg-neutral-900 border rounded-md px-3 py-2.5 text-white text-sm placeholder-neutral-600 focus:outline-none focus:ring-1 transition-colors ${
                  confirmPassword && confirmPassword !== password
                    ? "border-red-800 focus:border-red-700 focus:ring-red-900"
                    : "border-neutral-700 focus:border-neutral-500 focus:ring-neutral-500"
                }`}
              />
              {confirmPassword && confirmPassword !== password && (
                <p className="text-xs text-red-500">Passwords don&apos;t match</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || (!!confirmPassword && confirmPassword !== password)}
              className="w-full bg-white hover:bg-neutral-100 disabled:opacity-40 text-neutral-950 font-semibold py-2.5 px-4 rounded-md text-sm transition-colors mt-2"
            >
              {loading ? "Creating account…" : "Create account"}
            </button>
          </form>

          <p className="text-center text-sm text-neutral-500">
            Already have an account?{" "}
            <Link href="/login" className="text-white hover:underline font-medium">
              Sign in
            </Link>
          </p>

          <p className="text-center text-xs text-neutral-700">
            By creating an account you agree to our{" "}
            <span className="underline cursor-pointer">Terms</span> and{" "}
            <span className="underline cursor-pointer">Privacy Policy</span>.
          </p>
        </div>
      </div>
    </div>
  );
}
