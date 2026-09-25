export default function PaperLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Paper Trading</h1>
      <nav className="flex gap-4 mb-4">
        <a href="/paper" className="text-blue-500 hover:underline">Dashboard</a>
        <a href="/paper/account" className="text-blue-500 hover:underline">Account</a>
        <a href="/paper/orders" className="text-blue-500 hover:underline">Orders</a>
        <a href="/paper/positions" className="text-blue-500 hover:underline">Positions</a>
        <a href="/paper/ledger" className="text-blue-500 hover:underline">Ledger</a>
      </nav>
      {children}
    </div>
  );
}
