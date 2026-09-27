/* eslint-disable @next/next/no-img-element */
'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

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

export default function TraderProfilePage() {
  const params = useParams();
  const [profile, setProfile] = useState<TraderProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/traders/${params.id}`);
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
      } else {
        setProfile(null);
      }
    } finally {
      setLoading(false);
    }
  };

  /* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
  useEffect(() => {
    if (params.id) {
      fetchProfile();
    }
  }, [params.id]);

  const handleSaveTrader = async () => {
    try {
      await fetch(`/api/v1/traders/saved/${params.id}`, { method: 'POST' });
      alert('Trader saved!');
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) return <div className="p-8">Loading...</div>;
  if (!profile) return <div className="p-8">Trader not found or private.</div>;

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          {Boolean(profile.avatarUrl) ? (
            <img src={profile.avatarUrl} alt="Avatar" className="w-16 h-16 rounded-full" />
          ) : (
            <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center text-xl">
              {profile.firstName[0]}
            </div>
          )}
          <div>
            <h1 className="text-3xl font-bold">
              {profile.firstName} {profile.lastName}
              {Boolean(profile.isVerified) && <span className="text-blue-500 ml-2">? Verified</span>}
            </h1>
            <p className="text-gray-500">
              {profile.experienceLevel} � Risk: {profile.riskPreference}
            </p>
          </div>
        </div>
        <button
          onClick={handleSaveTrader}
          className="px-4 py-2 bg-gray-100 border rounded hover:bg-gray-200"
        >
          Save Trader
        </button>
      </div>

      <div className="prose">
        <h3>Bio</h3>
        <p>{profile.bio || 'No bio provided.'}</p>

        <h3>Markets Traded</h3>
        <p>{(profile.marketsTraded || []).join(', ') || 'None specified.'}</p>

        <h3>Public Performance</h3>
        <p>Public Backtests: {profile.publicBacktests || 0}</p>
      </div>
    </div>
  );
}
