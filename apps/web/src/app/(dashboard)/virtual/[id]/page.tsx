'use client';

import { useState, useEffect, use } from 'react';
/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import Link from 'next/link';

export default function VirtualSessionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetch(`/api/v1/virtual-strategies/sessions/${resolvedParams.id}`)
      .then(res => res.json())
      .then(data => {
        setSession(data);
        setLoading(false);
      })
      .catch(console.error);
  }, [resolvedParams.id]);

  const handleAction = async (action: 'start' | 'pause' | 'stop') => {
    if (!confirm(`Are you sure you want to ${action} this session?`)) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/v1/virtual-strategies/sessions/${session.id}/${action}`, { method: 'POST' });
      if (res.ok) {
        const updated = await fetch(`/api/v1/virtual-strategies/sessions/${resolvedParams.id}`).then(r => r.json());
        setSession(updated);
      } else {
        alert(`Failed to ${action} session`);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <div className="p-12 text-center text-neutral-500">Loading session details...</div>;
  if (!session) return <div className="p-12 text-center text-neutral-500">Session not found</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center space-x-2 text-sm text-neutral-500 mb-6">
        <Link href="/virtual" className="hover:text-white transition-colors">Virtual Trading</Link>
        <span>/</span>
        <span className="text-neutral-300 truncate max-w-[200px]">{session.id}</span>
      </div>

      <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden shadow-sm">
        <div className="px-6 py-5 border-b border-neutral-800 flex flex-wrap items-center justify-between gap-4 bg-neutral-950/50">
          <div>
            <div className="flex items-center space-x-3 mb-1">
              <h1 className="text-2xl font-bold text-white tracking-tight">{session.strategy?.name || session.strategyId}</h1>
              <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-emerald-900/30 text-emerald-400 border border-emerald-800/50 uppercase tracking-wider">
                VIRTUAL / PAPER TRADING
              </span>
            </div>
            <p className="text-sm text-neutral-400">
              {session.instrument?.symbol || session.instrumentId} &middot; {session.timeframe} &middot; 
              Started {session.startedAt ? new Date(session.startedAt).toLocaleDateString() : 'N/A'}
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <span className={`px-3 py-1 rounded-full text-sm font-medium border ${
              session.status === 'RUNNING' ? 'bg-emerald-950/50 text-emerald-400 border-emerald-900/50' : 
              session.status === 'PAUSED' ? 'bg-amber-950/50 text-amber-400 border-amber-900/50' : 
              'bg-neutral-800 text-neutral-400 border-neutral-700'
            }`}>
              ● {session.status}
            </span>
            <div className="flex space-x-2">
              {(session.status === 'CREATED' || session.status === 'PAUSED') && (
                <button onClick={() => handleAction('start')} disabled={actionLoading} className="bg-white text-black px-4 py-1.5 rounded text-sm font-medium hover:bg-neutral-200 transition-colors disabled:opacity-50">
                  {session.status === 'PAUSED' ? 'RESUME' : 'START'}
                </button>
              )}
              {session.status === 'RUNNING' && (
                <button onClick={() => handleAction('pause')} disabled={actionLoading} className="bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 px-4 py-1.5 rounded text-sm font-medium transition-colors disabled:opacity-50">
                  PAUSE
                </button>
              )}
              {(session.status !== 'STOPPED' && session.status !== 'ERROR') && (
                <button onClick={() => handleAction('stop')} disabled={actionLoading} className="bg-red-500/10 text-red-500 hover:bg-red-500/20 px-4 py-1.5 rounded text-sm font-medium transition-colors disabled:opacity-50">
                  STOP
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <p className="text-sm text-neutral-500 mb-1">Virtual Capital</p>
            <p className="text-xl font-medium text-white">${parseFloat(session.startingCapital).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
          </div>
          <div>
            <p className="text-sm text-neutral-500 mb-1">Current Equity</p>
            <p className="text-xl font-medium text-white">${session.paperAccount?.cashBalance ? parseFloat(session.paperAccount.cashBalance).toLocaleString(undefined, { minimumFractionDigits: 2 }) : 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm text-neutral-500 mb-1">Net P&L</p>
            <p className={`text-xl font-medium ${
              (parseFloat(session.paperAccount?.cashBalance || '0') - parseFloat(session.startingCapital)) > 0 ? 'text-emerald-400' : 
              (parseFloat(session.paperAccount?.cashBalance || '0') - parseFloat(session.startingCapital)) < 0 ? 'text-red-400' : 'text-white'
            }`}>
              ${(parseFloat(session.paperAccount?.cashBalance || '0') - parseFloat(session.startingCapital)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div>
            <p className="text-sm text-neutral-500 mb-1">Last Processed</p>
            <p className="text-sm font-medium text-white mt-1.5">
              {session.lastProcessedTimestamp ? new Date(session.lastProcessedTimestamp).toLocaleString() : 'Never'}
            </p>
          </div>
        </div>
      </div>

      {/* Risk Panel */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 shadow-sm">
        <h2 className="text-lg font-medium text-white mb-4 border-b border-neutral-800 pb-2">RISK STATUS</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <p className="text-sm text-neutral-500 mb-1">Risk / Trade</p>
            <p className="text-white font-medium">1.0%</p>
          </div>
          <div>
            <p className="text-sm text-neutral-500 mb-1">Exposure</p>
            <p className="text-white font-medium">48%</p>
          </div>
          <div>
            <p className="text-sm text-neutral-500 mb-1">Stop Loss</p>
            <p className="text-white font-medium">₹238.00</p>
          </div>
          <div>
            <p className="text-sm text-neutral-500 mb-1">Take Profit</p>
            <p className="text-white font-medium">₹260.00</p>
          </div>
          <div>
            <p className="text-sm text-neutral-500 mb-1">Drawdown</p>
            <p className="text-amber-400 font-medium">-2.1%</p>
          </div>
          <div className="col-span-2 md:col-span-3 flex justify-end items-end">
            <button className="bg-red-900/30 text-red-400 border border-red-800/50 hover:bg-red-900/50 px-4 py-1.5 rounded text-sm font-medium transition-colors">
              EMERGENCY STOP
            </button>
          </div>
        </div>
      </div>

      {/* Chart Placeholder */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 shadow-sm min-h-[300px] flex items-center justify-center">
        <p className="text-neutral-500">Equity Chart Visualization</p>
      </div>
      
    </div>
  );
}
