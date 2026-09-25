'use client';

import { useState, useEffect } from 'react';

interface PaperAccountSummary {
  id: string;
  accountName: string;
}

interface PaperAnalyticsData {
  accountId: string;
  returns: {
    initialBalance: string;
    currentPortfolioValue: string;
    netPnl: string;
    totalReturn: number;
    realizedPnl: string;
    unrealizedPnl: string;
    totalFees: string;
  };
  positions: Array<{
    symbol: string;
    quantity: string;
    averageEntryPrice: string;
    currentPrice: string;
    marketValue: string;
    unrealizedPnl: string;
    realizedPnl: string;
  }>;
  activity: {
    executionCount: number;
  };
}

export default function PaperAnalyticsPage() {
  const [accounts, setAccounts] = useState<PaperAccountSummary[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<PaperAnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/v1/trading/accounts')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setAccounts(data);
          if (data.length > 0) setSelectedAccountId(data[0].id);
        }
      })
      .catch(() => setError('Failed to load accounts'));
  }, []);

  useEffect(() => {
    if (!selectedAccountId) return;
    
    let active = true;
    const loadData = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/v1/analytics/paper-accounts/${selectedAccountId}`);
        if (!res.ok) throw new Error('API Error');
        const data = await res.json();
        if (active) setAnalytics(data);
      } catch {
        if (active) {
          setError('Failed to load paper analytics');
          setAnalytics(null);
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    loadData();
    return () => { active = false; };
  }, [selectedAccountId]);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Paper Trading Analytics</h1>
        <div>
          <select 
            value={selectedAccountId || ''} 
            onChange={e => setSelectedAccountId(e.target.value)}
            className="border p-2 rounded"
          >
            {accounts.map(acc => (
              <option key={acc.id} value={acc.id}>{acc.accountName}</option>
            ))}
          </select>
        </div>
      </div>

      {error && <div className="text-red-500">{error}</div>}

      {loading ? (
        <div>Loading analytics...</div>
      ) : !analytics ? (
        <div>No analytics data available.</div>
      ) : (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h2 className="text-lg font-semibold mb-4">Portfolio Summary</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-500">Initial Balance</p>
                <p className="text-xl font-medium">${parseFloat(analytics.returns.initialBalance).toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Current Value</p>
                <p className="text-xl font-medium">${parseFloat(analytics.returns.currentPortfolioValue).toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Net P&L</p>
                <p className={`text-xl font-medium ${parseFloat(analytics.returns.netPnl) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ${parseFloat(analytics.returns.netPnl).toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Return</p>
                <p className={`text-xl font-medium ${analytics.returns.totalReturn >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {(analytics.returns.totalReturn * 100).toFixed(2)}%
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Realized P&L</p>
                <p className="text-xl font-medium">${parseFloat(analytics.returns.realizedPnl).toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Unrealized P&L</p>
                <p className="text-xl font-medium">${parseFloat(analytics.returns.unrealizedPnl).toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Fees</p>
                <p className="text-xl font-medium text-gray-700">${parseFloat(analytics.returns.totalFees).toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Executions</p>
                <p className="text-xl font-medium">{analytics.activity.executionCount}</p>
              </div>
            </div>
          </div>

          <div className="bg-yellow-50 p-4 border border-yellow-200 rounded-md">
            <h3 className="font-semibold text-yellow-800">Historical Metrics Deferred</h3>
            <p className="text-yellow-700 text-sm mt-1">
              Metrics requiring historical equity snapshots (e.g. Drawdown, Recovery Period, Sharpe, Volatility, Trade Statistics) 
              are intentionally omitted because time-series snapshot storage is not currently implemented in Phase 2.
            </p>
          </div>

          {analytics.positions.length > 0 && (
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mt-6">
              <h2 className="text-lg font-semibold mb-4">Current Positions</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="pb-2 font-medium">Asset</th>
                      <th className="pb-2 font-medium">Qty</th>
                      <th className="pb-2 font-medium">Avg Entry</th>
                      <th className="pb-2 font-medium">Current Price</th>
                      <th className="pb-2 font-medium">Market Value</th>
                      <th className="pb-2 font-medium">Unrealized</th>
                      <th className="pb-2 font-medium">Realized</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.positions.map((p, i) => (
                      <tr key={i} className="border-b last:border-0">
                        <td className="py-2">{p.symbol}</td>
                        <td className="py-2">{parseFloat(p.quantity).toFixed(4)}</td>
                        <td className="py-2">${parseFloat(p.averageEntryPrice).toFixed(2)}</td>
                        <td className="py-2">${parseFloat(p.currentPrice).toFixed(2)}</td>
                        <td className="py-2">${parseFloat(p.marketValue).toFixed(2)}</td>
                        <td className={`py-2 ${parseFloat(p.unrealizedPnl) >= 0 ? 'text-green-600' : 'text-red-600'}`}>${parseFloat(p.unrealizedPnl).toFixed(2)}</td>
                        <td className="py-2">${parseFloat(p.realizedPnl).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
