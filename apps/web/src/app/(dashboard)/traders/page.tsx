/* eslint-disable @next/next/no-img-element */
﻿'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface TraderProfile {
  userId: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  bio?: string;
  experienceLevel?: string;
  riskPreference?: string;
  marketsTraded?: string[];
  isVerified?: boolean;
  publicBacktests?: number;
}

export default function TradersDiscoveryPage() {
  const router = useRouter();
  const [traders, setTraders] = useState<TraderProfile[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchTraders = async (query = '') => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/traders?search=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        setTraders(data.data || []);
      }
    } finally {
      setLoading(false);
    }
  };

  /* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
  useEffect(() => {
    fetchTraders();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchTraders(search);
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Trader Discovery</h1>

      <form onSubmit={handleSearch} className="mb-8 flex gap-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name..."
          className="flex-1 p-2 border rounded"
        />
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">
          Search
        </button>
      </form>

      {loading ? (
        <div>Loading traders...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {traders.map((trader) => (
            <div key={trader.userId} className="border rounded p-4 bg-white shadow cursor-pointer hover:shadow-md" onClick={() => router.push(`/traders/${trader.userId}`)}>
              <div className="flex items-center gap-4 mb-4">
                {trader.avatarUrl ? (
                  <img src={trader.avatarUrl} alt="Avatar" className="w-12 h-12 rounded-full" />
                ) : (
                  <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                    {trader.firstName.charAt(0)}{trader.lastName.charAt(0)}
                  </div>
                )}
                <div>
                  <h3 className="font-bold">{trader.firstName} {trader.lastName}</h3>
                  {trader.isVerified && <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Verified</span>}
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-2">{trader.bio?.substring(0, 100) || 'No bio provided'}</p>
              <div className="flex gap-2 text-xs text-gray-500">
                <span>{trader.experienceLevel || 'Beginner'}</span>
                <span>•</span>
                <span>{trader.riskPreference || 'Moderate'}</span>
              </div>
            </div>
          ))}
          {traders.length === 0 && <div className="col-span-full text-center text-gray-500 py-8">No traders found.</div>}
        </div>
      )}
    </div>
  );
}
