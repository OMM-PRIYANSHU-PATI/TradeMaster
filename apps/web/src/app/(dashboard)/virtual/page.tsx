'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface VirtualSession {
  id: string;
  strategyId: string;
  instrumentId: string;
  status: string;
  startingCapital: string;
  paperAccountId: string;
  startedAt?: string;
  instrument?: { symbol: string };
  strategy?: { name: string };
}

export default function VirtualTradingPage() {
  const [sessions, setSessions] = useState<VirtualSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/v1/virtual-strategies/sessions')
      .then(res => res.json())
      .then(data => {
        setSessions(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Virtual Trading</h1>
          <p className="text-neutral-400 mt-1">Manage and monitor live virtual strategy sessions.</p>
        </div>
        <button className="bg-white text-black px-4 py-2 rounded-md font-medium hover:bg-neutral-200 transition-colors">
          New Session
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-xl shadow-sm">
          <p className="text-sm text-neutral-400 font-medium mb-1">Active Sessions</p>
          <p className="text-3xl font-semibold text-white">{sessions.filter(s => s.status === 'RUNNING').length}</p>
        </div>
        <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-xl shadow-sm">
          <p className="text-sm text-neutral-400 font-medium mb-1">Total Allocated Capital</p>
          <p className="text-3xl font-semibold text-white">
            ${sessions.reduce((acc, s) => acc + parseFloat(s.startingCapital || '0'), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-neutral-800 bg-neutral-900/50">
          <h2 className="text-lg font-medium text-white">Active Sessions</h2>
        </div>
        
        {loading ? (
          <div className="p-12 text-center text-neutral-500">Loading sessions...</div>
        ) : sessions.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-neutral-400 mb-4">No virtual trading sessions found.</p>
            <button className="text-sm bg-neutral-800 text-white px-4 py-2 rounded-md hover:bg-neutral-700">Create your first session</button>
          </div>
        ) : (
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-neutral-950/50 text-neutral-400">
              <tr>
                <th className="px-6 py-4 font-medium">Strategy</th>
                <th className="px-6 py-4 font-medium">Instrument</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Capital</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800">
              {sessions.map(session => (
                <tr key={session.id} className="hover:bg-neutral-800/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="font-medium text-white">{session.strategy?.name || session.strategyId}</div>
                    <div className="text-xs text-neutral-500 mt-0.5">{session.id}</div>
                  </td>
                  <td className="px-6 py-4 text-neutral-300">{session.instrument?.symbol || session.instrumentId}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      session.status === 'RUNNING' ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-800/50' : 
                      session.status === 'PAUSED' ? 'bg-amber-900/30 text-amber-400 border border-amber-800/50' : 
                      session.status === 'STOPPED' ? 'bg-neutral-800 text-neutral-400 border border-neutral-700' :
                      'bg-blue-900/30 text-blue-400 border border-blue-800/50'
                    }`}>
                      {session.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right text-neutral-300">
                    ${parseFloat(session.startingCapital).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link href={`/virtual/${session.id}`} className="text-sm text-neutral-400 hover:text-white font-medium">
                      View Details
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
