"use client";
import React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { 
  ArrowLeft,
  ThumbsUp, 
  MessageSquare, 
  Share2, 
  Bookmark, 
  Activity, 
  Layers, 
  History, 
  MonitorPlay,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';

// Dummy trade history for demonstration
const dummyTrades = [
  { id: 't1', asset: 'AAPL', type: 'LONG', entryPrice: 173.50, exitPrice: 178.20, quantity: 100, pnl: 470.00, closedAt: '2026-09-28 14:30' },
  { id: 't2', asset: 'TSLA', type: 'SHORT', entryPrice: 210.00, exitPrice: 202.50, quantity: 50, pnl: 375.00, closedAt: '2026-09-28 15:45' },
  { id: 't3', asset: 'NVDA', type: 'LONG', entryPrice: 850.20, exitPrice: 845.00, quantity: 20, pnl: -104.00, closedAt: '2026-09-29 09:30' },
  { id: 't4', asset: 'MSFT', type: 'LONG', entryPrice: 410.10, exitPrice: 418.90, quantity: 40, pnl: 352.00, closedAt: '2026-09-29 11:15' },
  { id: 't5', asset: 'BTC/USD', type: 'SHORT', entryPrice: 65100, exitPrice: 64200, quantity: 0.5, pnl: 450.00, closedAt: '2026-09-29 13:20' },
];

export default function FeedPostDetailPage() {
  const params = useParams();
  const postId = params.id as string;

  return (
    <div className="max-w-4xl mx-auto py-8 space-y-8 px-4">
      {/* Back Navigation */}
      <Link href="/feed" className="inline-flex items-center gap-2 text-neutral-400 hover:text-white transition-colors text-sm font-medium">
        <ArrowLeft className="w-4 h-4" />
        Back to Feed
      </Link>

      {/* Main Post Header (Simulated specific post) */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
        <div className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div className="flex gap-3">
              <div className="w-12 h-12 rounded-full bg-neutral-800 flex items-center justify-center text-base font-bold text-neutral-300 shrink-0">
                MT
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white text-lg">Marcus Trading</span>
                  <span className="text-neutral-500">@marcus_t</span>
                  <span className="text-neutral-600">•</span>
                  <span className="text-neutral-500">5h ago</span>
                </div>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-amber-500/10 text-amber-400">
                    BACKTEST
                  </span>
                </div>
              </div>
            </div>
          </div>

          <p className="text-neutral-200 text-base leading-relaxed mb-6">
            Ran a 5-year backtest on the Momentum Breakout strategy through the recent bear market. Surprisingly resilient results given the market conditions.
          </p>

          {/* Performance Metrics Card */}
          <div className="border border-neutral-800 rounded-xl overflow-hidden mb-6">
            <div className="bg-neutral-950 p-4 border-b border-neutral-800 flex items-center gap-2">
              <History className="w-5 h-5 text-amber-400" />
              <span className="font-semibold text-white">Momentum Breakout 5Y SPY</span>
            </div>
            <div className="bg-neutral-900/50 p-6 grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <div className="text-sm text-neutral-500 mb-1">Total Return</div>
                <div className="text-2xl font-bold text-emerald-400">+142.5%</div>
              </div>
              <div>
                <div className="text-sm text-neutral-500 mb-1">CAGR</div>
                <div className="text-2xl font-bold text-white">19.4%</div>
              </div>
              <div>
                <div className="text-sm text-neutral-500 mb-1">Win Rate</div>
                <div className="text-2xl font-bold text-white">58.2%</div>
              </div>
              <div>
                <div className="text-sm text-neutral-500 mb-1">Max Drawdown</div>
                <div className="text-2xl font-bold text-rose-400">-12.4%</div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Bar */}
        <div className="px-6 py-4 bg-neutral-950/50 border-t border-neutral-800 flex items-center gap-8 text-neutral-400">
          <button className="flex items-center gap-2 hover:text-emerald-400 transition-colors font-medium">
            <ThumbsUp className="w-5 h-5" /> 89
          </button>
          <button className="flex items-center gap-2 hover:text-blue-400 transition-colors font-medium text-white">
            <MessageSquare className="w-5 h-5" /> 12
          </button>
          <button className="flex items-center gap-2 hover:text-indigo-400 transition-colors font-medium">
            <Share2 className="w-5 h-5" /> Share
          </button>
          <button className="flex items-center gap-2 hover:text-amber-400 transition-colors font-medium ml-auto">
            <Bookmark className="w-5 h-5" /> Save
          </button>
        </div>
      </div>

      {/* Detailed Trade History Data */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">Execution Log & Trade History</h2>
          <span className="text-sm text-neutral-500">Total Trades: 342</span>
        </div>

        <div className="border border-neutral-800 rounded-xl overflow-hidden bg-neutral-900">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-neutral-950 text-neutral-400 border-b border-neutral-800 uppercase text-xs">
                <tr>
                  <th className="px-6 py-4 font-semibold">Asset</th>
                  <th className="px-6 py-4 font-semibold">Type</th>
                  <th className="px-6 py-4 font-semibold text-right">Quantity</th>
                  <th className="px-6 py-4 font-semibold text-right">Entry Price</th>
                  <th className="px-6 py-4 font-semibold text-right">Exit Price</th>
                  <th className="px-6 py-4 font-semibold text-right">Net P&L</th>
                  <th className="px-6 py-4 font-semibold text-right">Closed At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800">
                {dummyTrades.map((trade) => (
                  <tr key={trade.id} className="hover:bg-neutral-800/50 transition-colors">
                    <td className="px-6 py-4 font-bold text-white">{trade.asset}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${trade.type === 'LONG' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                        {trade.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-neutral-300 font-medium">{trade.quantity}</td>
                    <td className="px-6 py-4 text-right text-neutral-400">${trade.entryPrice.toFixed(2)}</td>
                    <td className="px-6 py-4 text-right text-neutral-400">${trade.exitPrice.toFixed(2)}</td>
                    <td className="px-6 py-4 text-right">
                      <div className={`flex items-center justify-end gap-1 font-bold ${trade.pnl > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {trade.pnl > 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                        ${Math.abs(trade.pnl).toFixed(2)}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right text-neutral-500">{trade.closedAt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
