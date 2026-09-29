import Link from "next/link";

export default function GrowwStyleHomepage() {
  const indices = [
    { name: "NIFTY 50", value: "24,380.15", change: "+156.40", percent: "+0.65%", isUp: true },
    { name: "SENSEX", value: "80,012.40", change: "+462.10", percent: "+0.58%", isUp: true },
    { name: "BANK NIFTY", value: "52,110.80", change: "-115.30", percent: "-0.22%", isUp: false },
    { name: "NASDAQ 100", value: "$19,850.30", change: "+220.50", percent: "+1.12%", isUp: true },
    { name: "BTC / USD", value: "$64,250.00", change: "+$1,510.00", percent: "+2.40%", isUp: true },
  ];

  const topStrategies = [
    { name: "EMA Cross Momentum", category: "Equities", author: "Priyanshu P.", returnPct: "+42.8%", winRate: "68%", sharpe: "2.1", risk: "Medium" },
    { name: "RSI Mean Reversion", category: "Indices", author: "Sarah C.", returnPct: "+31.2%", winRate: "62%", sharpe: "1.8", risk: "Low" },
    { name: "Bollinger Breakout", category: "Crypto", author: "Alex M.", returnPct: "+89.4%", winRate: "54%", sharpe: "2.4", risk: "High" },
    { name: "MACD Trend Rider", category: "FX", author: "David K.", returnPct: "+27.6%", winRate: "71%", sharpe: "1.9", risk: "Low" },
  ];

  const products = [
    {
      icon: "📊",
      title: "Market Intelligence",
      description: "Real-time charts, technical indicators, and quantitative orderbook statistics across global asset classes.",
      href: "/markets"
    },
    {
      icon: "⚡",
      title: "Strategy Builder",
      description: "No-code visual strategy studio. Build complex entry/exit rules, stop losses, and position sizing models.",
      href: "/strategies"
    },
    {
      icon: "🧪",
      title: "Backtest Studio",
      description: "Simulate strategies against multi-year tick data with accurate brokerage fee accounting and dynamic slippage.",
      href: "/backtest"
    },
    {
      icon: "🎯",
      title: "Virtual Trading",
      description: "Forward test algorithms in a live sandbox with zero real-money risk. Monitor live position state & order flow.",
      href: "/virtual"
    },
    {
      icon: "🛡️",
      title: "Risk Engine",
      description: "Institutional risk controls: hard daily loss limits, drawdown caps, position sizing rules, and emergency stop.",
      href: "/risk"
    },
    {
      icon: "🤖",
      title: "Gemini AI Copilot",
      description: "Turn natural language trading ideas into validated, executable strategies compiled directly into code.",
      href: "/ai"
    },
  ];

  return (
    <div suppressHydrationWarning className="min-h-screen bg-neutral-950 text-neutral-100 font-sans selection:bg-emerald-500 selection:text-black">
      {/* Groww-style Navigation Header */}
      <header className="sticky top-0 z-50 bg-neutral-950/80 backdrop-blur-md border-b border-neutral-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2 text-white font-bold text-xl tracking-tight">
              <span className="w-8 h-8 rounded-lg bg-emerald-500 text-neutral-950 flex items-center justify-center font-black text-sm">TS</span>
              <span>TRADE<span className="text-emerald-400">SOCIAL</span></span>
            </Link>
            
            {/* Search Bar - Groww style */}
            <div className="hidden lg:flex items-center bg-neutral-900 border border-neutral-800 rounded-full px-4 py-1.5 w-80 text-sm text-neutral-400 focus-within:border-emerald-500/50 transition-all">
              <span className="mr-2 text-neutral-500">🔍</span>
              <input 
                type="text" 
                placeholder="Search stocks, strategies, indicators..." 
                className="bg-transparent text-white placeholder-neutral-500 text-xs w-full focus:outline-none"
              />
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-neutral-400">
            <Link href="/markets" className="hover:text-white transition-colors">Markets</Link>
            <Link href="/strategies" className="hover:text-white transition-colors">Strategies</Link>
            <Link href="/backtest" className="hover:text-white transition-colors">Backtest</Link>
            <Link href="/virtual" className="hover:text-white transition-colors">Virtual Trading</Link>
            <Link href="/feed" className="hover:text-white transition-colors">Social Feed</Link>
          </nav>

          <div className="flex items-center gap-3">
            <Link 
              href="/login" 
              className="text-sm font-medium text-neutral-300 hover:text-white px-3 py-1.5 rounded-md transition-colors"
            >
              Sign In
            </Link>
            <Link 
              href="/register" 
              className="text-sm font-semibold bg-emerald-500 hover:bg-emerald-400 text-neutral-950 px-4 py-2 rounded-full transition-all shadow-lg shadow-emerald-500/10"
            >
              Get Started Free
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-16 pb-20 overflow-hidden border-b border-neutral-900">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-900/20 via-neutral-950 to-neutral-950 pointer-events-none" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-6">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            Groww-Style Algorithmic Trading Platform
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white max-w-4xl mx-auto leading-[1.1]">
            Build, Backtest & Simulate <br />
            <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
              Quantitative Strategies
            </span>
          </h1>

          <p className="mt-6 text-neutral-400 text-base sm:text-lg max-w-2xl mx-auto font-normal leading-relaxed">
            The all-in-one workstation for modern traders. Compose no-code strategies, run microsecond backtests with realistic slippage, and paper-trade risk-free.
          </p>

          {/* Quick Search Shortcuts */}
          <div className="mt-8 max-w-xl mx-auto flex flex-wrap justify-center gap-2 text-xs text-neutral-400">
            <span className="text-neutral-600 font-medium">Popular:</span>
            {["NIFTY 50", "BANK NIFTY", "EMA Crossover", "RSI Reversion", "BTC/USD", "SPY 5Y"].map((tag) => (
              <Link key={tag} href="/strategies" className="bg-neutral-900 hover:bg-neutral-800 text-neutral-300 px-2.5 py-1 rounded-full border border-neutral-800 transition-colors">
                {tag}
              </Link>
            ))}
          </div>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link 
              href="/strategies/new" 
              className="w-full sm:w-auto px-8 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold rounded-full text-sm transition-all shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2"
            >
              <span>🚀 Build Strategy Now</span>
            </Link>
            <Link 
              href="/backtest" 
              className="w-full sm:w-auto px-8 py-3.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-white font-medium rounded-full text-sm transition-all flex items-center justify-center gap-2"
            >
              <span>📈 Run a Backtest</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Live Market Indices Ticker (Groww Style) */}
      <section className="py-8 bg-neutral-950/60 border-b border-neutral-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Live Market Overview</h2>
            <Link href="/markets" className="text-xs text-emerald-400 hover:underline font-medium">View All Markets →</Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {indices.map((item) => (
              <div key={item.name} className="bg-neutral-900/60 hover:bg-neutral-900 border border-neutral-800/80 rounded-xl p-4 transition-all">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-bold text-neutral-300">{item.name}</span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${item.isUp ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                    {item.percent}
                  </span>
                </div>
                <div className="text-base font-bold text-white">{item.value}</div>
                <div className={`text-xs font-medium mt-0.5 ${item.isUp ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {item.change}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Products & Features Grid */}
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white">Everything you need to trade smarter</h2>
          <p className="mt-3 text-neutral-400 text-sm sm:text-base">
            Institutional tools designed for individual traders. Zero setup, 100% web-based.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((p) => (
            <Link key={p.title} href={p.href} className="group bg-neutral-900/40 hover:bg-neutral-900 border border-neutral-800/80 hover:border-emerald-500/40 rounded-2xl p-6 transition-all">
              <div className="text-3xl mb-4 p-3 bg-neutral-900 rounded-xl inline-block group-hover:scale-110 transition-transform">
                {p.icon}
              </div>
              <h3 className="text-lg font-bold text-white group-hover:text-emerald-400 transition-colors flex items-center gap-2">
                {p.title}
                <span className="text-neutral-600 group-hover:translate-x-1 transition-transform">→</span>
              </h3>
              <p className="mt-2 text-xs sm:text-sm text-neutral-400 leading-relaxed">
                {p.description}
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* Top Performing Strategies Table */}
      <section className="py-16 bg-neutral-900/30 border-y border-neutral-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <div>
              <h2 className="text-2xl font-bold text-white">Featured Community Strategies</h2>
              <p className="text-neutral-400 text-xs sm:text-sm mt-1">Verified backtested and virtual strategy sessions from active traders</p>
            </div>
            <Link href="/strategies" className="px-4 py-2 bg-neutral-900 border border-neutral-800 text-white text-xs font-semibold rounded-lg hover:bg-neutral-800 transition-colors">
              Explore Strategy Store
            </Link>
          </div>

          <div className="overflow-x-auto border border-neutral-800/80 rounded-xl bg-neutral-900/50 backdrop-blur">
            <table className="w-full text-left text-sm">
              <thead className="bg-neutral-900 text-neutral-400 text-xs uppercase border-b border-neutral-800">
                <tr>
                  <th className="p-4 font-semibold">Strategy Name</th>
                  <th className="p-4 font-semibold">Category</th>
                  <th className="p-4 font-semibold">Author</th>
                  <th className="p-4 font-semibold">1Y Return</th>
                  <th className="p-4 font-semibold">Win Rate</th>
                  <th className="p-4 font-semibold">Sharpe</th>
                  <th className="p-4 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/60 text-neutral-200 text-xs sm:text-sm">
                {topStrategies.map((st) => (
                  <tr key={st.name} className="hover:bg-neutral-900/80 transition-colors">
                    <td className="p-4 font-bold text-white">{st.name}</td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 text-xs font-medium">
                        {st.category}
                      </span>
                    </td>
                    <td className="p-4 text-neutral-400">{st.author}</td>
                    <td className="p-4 font-bold text-emerald-400">{st.returnPct}</td>
                    <td className="p-4 font-medium">{st.winRate}</td>
                    <td className="p-4 font-medium">{st.sharpe}</td>
                    <td className="p-4 text-right">
                      <Link href="/backtest" className="px-3 py-1.5 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-neutral-950 font-semibold text-xs rounded-md transition-all">
                        Backtest
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Safety & Compliance Banner */}
      <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6">
        <div className="bg-gradient-to-r from-emerald-950/40 via-neutral-900 to-neutral-950 border border-emerald-500/20 rounded-3xl p-8 sm:p-12 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-3 max-w-xl">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">100% Risk-Free Environment</span>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-white">Simulate before you speculate.</h3>
            <p className="text-neutral-400 text-sm leading-relaxed">
              Trade Social provides an institutional-grade sandbox environment. All order intents, virtual balances, and execution reports are 100% simulated.
            </p>
          </div>
          <Link href="/register" className="px-8 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold rounded-full text-sm transition-all whitespace-nowrap shadow-lg shadow-emerald-500/20">
            Open Free Account
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-neutral-900 bg-neutral-950 py-12 text-xs text-neutral-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
          <div className="col-span-2">
            <span className="text-white font-bold text-base tracking-tight">TRADE<span className="text-emerald-400">SOCIAL</span></span>
            <p className="mt-3 text-neutral-500 text-xs leading-relaxed max-w-sm">
              The modern web-based workstation for quantitative strategy building, backtesting, and virtual trading.
            </p>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-3">Products</h4>
            <ul className="space-y-2">
              <li><Link href="/markets" className="hover:text-white transition-colors">Markets</Link></li>
              <li><Link href="/strategies" className="hover:text-white transition-colors">Strategy Builder</Link></li>
              <li><Link href="/backtest" className="hover:text-white transition-colors">Backtest Studio</Link></li>
              <li><Link href="/virtual" className="hover:text-white transition-colors">Virtual Sandbox</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-3">Platform</h4>
            <ul className="space-y-2">
              <li><Link href="/risk" className="hover:text-white transition-colors">Risk Engine</Link></li>
              <li><Link href="/analytics" className="hover:text-white transition-colors">Analytics</Link></li>
              <li><Link href="/feed" className="hover:text-white transition-colors">Social Feed</Link></li>
              <li><Link href="/ai" className="hover:text-white transition-colors">Gemini AI</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-3">Account</h4>
            <ul className="space-y-2">
              <li><Link href="/login" className="hover:text-white transition-colors">Sign In</Link></li>
              <li><Link href="/register" className="hover:text-white transition-colors">Register</Link></li>
            </ul>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 border-t border-neutral-900 pt-6 flex flex-col sm:flex-row justify-between items-center gap-4 text-center sm:text-left">
          <p>© 2026 Trade Social Inc. All rights reserved. Simulated trading platform.</p>
          <p className="max-w-md text-[11px] text-neutral-600">
            Disclaimer: Trade Social is a strategy backtesting and paper trading platform. Past backtested performance does not guarantee future results.
          </p>
        </div>
      </footer>
    </div>
  );
}
