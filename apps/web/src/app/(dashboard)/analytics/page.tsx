'use client';

import { useState, useEffect } from 'react';

// Simplified types for the frontend
interface BacktestSummary {
  id: string;
  instrumentId: string;
  status: string;
}

interface AnalyticsData {
  returns: { netPnl: string; totalReturn: number | null; grossProfit: string; grossLoss: string; fees: string };
  drawdown: { peakEquity: string; maxDrawdown: string; maxDrawdownPercent: number | null; recoveryPeriod: number | null };
  trades: { total: number; winning: number; losing: number; winRate: number | null; averageWin: string | null; averageLoss: string | null; profitFactor: number | null; expectancy: string | null; riskReward: number | null };
  portfolio: { exposure: number | null; turnover: number | null; concentration: number | null; strategyContribution: Record<string, string> | null };
}

export default function AnalyticsPage() {
  const [backtests, setBacktests] = useState<BacktestSummary[]>([]);
  const [selectedBacktestId, setSelectedBacktestId] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/v1/backtest')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setBacktests(data);
        }
      })
      .catch(console.error);
  }, []);

  const fetchAnalytics = async (id: string) => {
    setSelectedBacktestId(id);
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/v1/analytics/backtests/${id}`);
      if (!res.ok) throw new Error('Failed to load analytics');
      const data = await res.json();
      setAnalytics(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>

      <div className="flex gap-4 items-center">
        <span className="font-semibold">Select Backtest:</span>
        <select
          className="p-2 border rounded"
          value={selectedBacktestId || ''}
          onChange={e => fetchAnalytics(e.target.value)}
        >
          <option value="" disabled>Select a backtest</option>
          {backtests.map(bt => (
            <option key={bt.id} value={bt.id}>
              {bt.id} - {bt.instrumentId} ({bt.status})
            </option>
          ))}
        </select>
      </div>

      {loading && <p>Loading analytics...</p>}
      {error && <p className="text-red-500">{error}</p>}

      {!loading && analytics && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="border rounded-lg shadow-sm bg-white">
              <div className="p-4 border-b bg-gray-50">
                <h3 className="text-sm font-medium text-gray-500">Net P&L</h3>
              </div>
              <div className="p-4">
                <div className="text-2xl font-bold">${analytics.returns.netPnl}</div>
              </div>
            </div>
            
            <div className="border rounded-lg shadow-sm bg-white">
              <div className="p-4 border-b bg-gray-50">
                <h3 className="text-sm font-medium text-gray-500">Total Return</h3>
              </div>
              <div className="p-4">
                <div className="text-2xl font-bold">
                  {analytics.returns.totalReturn !== null 
                    ? (analytics.returns.totalReturn * 100).toFixed(2) + '%'
                    : 'N/A'}
                </div>
              </div>
            </div>
            
            <div className="border rounded-lg shadow-sm bg-white">
              <div className="p-4 border-b bg-gray-50">
                <h3 className="text-sm font-medium text-gray-500">Win Rate</h3>
              </div>
              <div className="p-4">
                <div className="text-2xl font-bold">
                  {analytics.trades.winRate !== null 
                    ? (analytics.trades.winRate * 100).toFixed(2) + '%'
                    : 'N/A'}
                </div>
              </div>
            </div>

            <div className="border rounded-lg shadow-sm bg-white">
              <div className="p-4 border-b bg-gray-50">
                <h3 className="text-sm font-medium text-gray-500">Max Drawdown</h3>
              </div>
              <div className="p-4">
                <div className="text-2xl font-bold">
                  {analytics.drawdown.maxDrawdownPercent !== null 
                    ? (analytics.drawdown.maxDrawdownPercent * 100).toFixed(2) + '%'
                    : 'N/A'}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Absolute: ${analytics.drawdown.maxDrawdown}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border rounded-lg shadow-sm bg-white">
              <div className="p-4 border-b bg-gray-50">
                <h3 className="font-semibold text-lg">Trade Statistics</h3>
              </div>
              <div className="p-4 space-y-2">
                <div className="flex justify-between">
                  <span>Total Trades:</span>
                  <span className="font-semibold">{analytics.trades.total}</span>
                </div>
                <div className="flex justify-between">
                  <span>Winning Trades:</span>
                  <span className="font-semibold text-green-600">{analytics.trades.winning}</span>
                </div>
                <div className="flex justify-between">
                  <span>Losing Trades:</span>
                  <span className="font-semibold text-red-600">{analytics.trades.losing}</span>
                </div>
                <div className="flex justify-between">
                  <span>Average Win:</span>
                  <span className="font-semibold">{analytics.trades.averageWin ? `$${analytics.trades.averageWin}` : 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Average Loss:</span>
                  <span className="font-semibold">{analytics.trades.averageLoss ? `$${analytics.trades.averageLoss}` : 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Profit Factor:</span>
                  <span className="font-semibold">{analytics.trades.profitFactor ? analytics.trades.profitFactor.toFixed(2) : 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Expectancy:</span>
                  <span className="font-semibold">{analytics.trades.expectancy ? `$${analytics.trades.expectancy}` : 'N/A'}</span>
                </div>
              </div>
            </div>
            
            <div className="border rounded-lg shadow-sm bg-white">
              <div className="p-4 border-b bg-gray-50">
                <h3 className="font-semibold text-lg">Returns & Portfolio</h3>
              </div>
              <div className="p-4 space-y-2">
                <div className="flex justify-between">
                  <span>Gross Profit:</span>
                  <span className="font-semibold text-green-600">${analytics.returns.grossProfit}</span>
                </div>
                <div className="flex justify-between">
                  <span>Gross Loss:</span>
                  <span className="font-semibold text-red-600">-${analytics.returns.grossLoss.replace('-', '')}</span>
                </div>
                <div className="flex justify-between">
                  <span>Fees:</span>
                  <span className="font-semibold">${analytics.returns.fees}</span>
                </div>
                <div className="flex justify-between mt-4 border-t pt-2">
                  <span>Exposure (Time in Market):</span>
                  <span className="font-semibold">
                    {analytics.portfolio.exposure !== null ? (analytics.portfolio.exposure * 100).toFixed(2) + '%' : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Recovery Period:</span>
                  <span className="font-semibold">
                    {analytics.drawdown.recoveryPeriod !== null ? `${analytics.drawdown.recoveryPeriod} days` : 'N/A'}
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="border rounded-lg shadow-sm bg-yellow-50 border-yellow-200">
            <div className="p-4 border-b border-yellow-200">
              <h3 className="font-semibold text-yellow-800">Deferred Metrics</h3>
            </div>
            <div className="p-4">
              <p className="text-sm text-yellow-700">
                Sharpe Ratio, Sortino Ratio, Volatility, and Annualized Return are deferred until standard sampling frequency rules (e.g. daily, 252 days) are explicitly defined by product specification.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
