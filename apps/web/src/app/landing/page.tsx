import Link from "next/link";

export default function LandingPage() {
  const stats = [
    { value: "25+", label: "Analytics Metrics" },
    { value: "6", label: "Risk Controls" },
    { value: "100%", label: "Simulated — No Real Money" },
    { value: "∞", label: "Strategy Backtests" },
  ];

  const features = [
    {
      title: "Strategy Builder",
      desc: "Compose strategies from indicators like EMA, RSI, MACD, and Bollinger Bands using a structured visual builder. No coding required.",
      tag: "Builder",
    },
    {
      title: "Professional Backtesting",
      desc: "Run strategies against historical data with configurable brokerage fees, slippage models, and per-trade cost accounting.",
      tag: "Backtest",
    },
    {
      title: "Virtual Trading",
      desc: "Deploy validated strategies against live market data in a fully isolated paper environment before risking real capital.",
      tag: "Simulation",
    },
    {
      title: "Risk Engine",
      desc: "Set hard limits on daily loss, maximum drawdown, position exposure, and concurrent positions. Emergency stop included.",
      tag: "Risk",
    },
    {
      title: "AI Strategy Assistant",
      desc: "Describe a trading idea in plain English. Gemini converts it to a structured strategy that passes through validation and compilation.",
      tag: "AI",
    },
    {
      title: "Social Feed",
      desc: "Share backtest results and virtual performance with the community. Follow traders, explore strategies, and compare performance.",
      tag: "Social",
    },
  ];

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      {/* Nav */}
      <header className="border-b border-neutral-900">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <span className="font-bold text-sm tracking-tight">TRADE SOCIAL</span>
          <nav className="hidden md:flex items-center gap-6 text-sm text-neutral-400">
            <span className="hover:text-white cursor-pointer transition-colors">Features</span>
            <span className="hover:text-white cursor-pointer transition-colors">Pricing</span>
            <span className="hover:text-white cursor-pointer transition-colors">Docs</span>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-neutral-400 hover:text-white transition-colors">
              Sign in
            </Link>
            <Link
              href="/register"
              className="text-sm bg-white text-neutral-950 font-semibold px-4 py-1.5 rounded-md hover:bg-neutral-100 transition-colors"
            >
              Get started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-24 pb-20 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-900 border border-neutral-800 text-neutral-400 text-xs mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Simulated trading only — no real money involved
        </div>
        <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-white max-w-3xl mx-auto leading-tight">
          Build, test, and share
          <span className="text-neutral-500"> trading strategies</span>
        </h1>
        <p className="mt-6 text-neutral-400 text-lg max-w-xl mx-auto leading-relaxed">
          A professional platform for quantitative traders to backtest strategies, run virtual sessions, manage risk, and discover what works.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/register"
            className="w-full sm:w-auto bg-white text-neutral-950 font-semibold px-6 py-3 rounded-md hover:bg-neutral-100 transition-colors text-sm"
          >
            Start for free
          </Link>
          <Link
            href="/login"
            className="w-full sm:w-auto border border-neutral-800 text-neutral-300 font-medium px-6 py-3 rounded-md hover:border-neutral-600 hover:text-white transition-colors text-sm"
          >
            Sign in to your account
          </Link>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-neutral-900 bg-neutral-900/30">
        <div className="max-w-6xl mx-auto px-6 py-10 grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-3xl font-bold text-white">{s.value}</p>
              <p className="text-sm text-neutral-500 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 py-24">
        <div className="mb-12">
          <p className="text-xs text-neutral-600 uppercase tracking-widest mb-2">Platform</p>
          <h2 className="text-3xl font-bold text-white">Everything you need to trade smarter</h2>
          <p className="text-neutral-500 mt-3 max-w-lg">
            From strategy creation to performance analytics — built for traders who take their process seriously.
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-px bg-neutral-900 rounded-xl overflow-hidden border border-neutral-900">
          {features.map((f) => (
            <div key={f.title} className="bg-neutral-950 p-6 hover:bg-neutral-900/50 transition-colors">
              <span className="inline-block text-xs font-medium text-neutral-500 bg-neutral-900 border border-neutral-800 rounded px-2 py-0.5 mb-4">
                {f.tag}
              </span>
              <h3 className="text-white font-semibold mb-2">{f.title}</h3>
              <p className="text-neutral-500 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-neutral-900">
        <div className="max-w-6xl mx-auto px-6 py-20 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to start testing strategies?</h2>
          <p className="text-neutral-500 mb-8 max-w-md mx-auto">
            Create a free account and run your first backtest in minutes. No credit card required.
          </p>
          <Link
            href="/register"
            className="inline-block bg-white text-neutral-950 font-semibold px-8 py-3 rounded-md hover:bg-neutral-100 transition-colors text-sm"
          >
            Create free account
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-neutral-900">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-neutral-600">
          <span className="font-bold tracking-tight text-neutral-500">TRADE SOCIAL</span>
          <p>Simulated trading platform. Not financial advice. Past performance is not indicative of future results.</p>
          <div className="flex gap-4">
            <span className="hover:text-neutral-400 cursor-pointer transition-colors">Terms</span>
            <span className="hover:text-neutral-400 cursor-pointer transition-colors">Privacy</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
