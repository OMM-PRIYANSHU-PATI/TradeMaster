import Link from 'next/link';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const navigation = [
    { name: 'Home', href: '/' },
    { name: 'Discover', href: '/discover' },
    { name: 'Markets', href: '/markets' },
    { name: 'Strategies', href: '/strategies' },
    { name: 'Backtest', href: '/backtest' },
    { name: 'Virtual', href: '/virtual' },
    { name: 'Portfolio', href: '/portfolio' },
    { name: 'Journal', href: '/journal' },
    { name: 'Risk', href: '/risk' },
  ];

  return (
    <div className="flex h-screen bg-neutral-950 text-neutral-100 font-sans">
      {/* Sidebar */}
      <aside className="w-64 border-r border-neutral-800 bg-neutral-950/50 backdrop-blur flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-neutral-800">
          <h1 className="text-xl font-bold tracking-tight text-white">TRADEMASTER</h1>
        </div>
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {navigation.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className="flex items-center px-3 py-2 text-sm font-medium rounded-md text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
            >
              {item.name}
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-neutral-800">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center">
              <span className="text-xs font-medium text-neutral-400">TM</span>
            </div>
            <div>
              <p className="text-sm font-medium text-white">Profile</p>
              <p className="text-xs text-neutral-500">Settings</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-neutral-950">
        <div className="flex-1 overflow-y-auto p-6 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
