"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Home, 
  Compass, 
  BarChart2, 
  Layers, 
  History, 
  MonitorPlay, 
  Briefcase, 
  Shield, 
  PieChart, 
  BookOpen 
} from 'lucide-react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  const navigation = [
    { name: 'Feed', href: '/feed', icon: Home },
    { name: 'Discover', href: '/discover', icon: Compass },
    { name: 'Markets', href: '/markets', icon: BarChart2 },
    { name: 'Strategies', href: '/strategies', icon: Layers },
    { name: 'Backtest', href: '/backtest', icon: History },
    { name: 'Virtual', href: '/virtual', icon: MonitorPlay },
    { name: 'Portfolio', href: '/paper', icon: Briefcase },
    { name: 'Risk', href: '/risk', icon: Shield },
    { name: 'Analytics', href: '/analytics', icon: PieChart },
    { name: 'Journal', href: '/journal', icon: BookOpen },
  ];

  return (
    <div className="flex h-screen bg-neutral-950 text-neutral-100 font-sans">
      {/* Sidebar */}
      <aside className="w-64 border-r border-neutral-800 bg-neutral-950/50 backdrop-blur flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-neutral-800">
          <h1 className="text-xl font-bold tracking-tight text-white">TRADE SOCIAL</h1>
        </div>
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/' && pathname?.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  isActive 
                    ? 'text-white bg-neutral-800' 
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-800/50'
                }`}
              >
                <Icon className={`mr-3 h-5 w-5 flex-shrink-0 ${isActive ? 'text-white' : 'text-neutral-500'}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-neutral-800">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center">
              <span className="text-xs font-medium text-neutral-400">TS</span>
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
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
