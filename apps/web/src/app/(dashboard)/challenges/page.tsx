'use client';
import { useState, useEffect } from 'react';

interface Challenge {
  id: string;
  title: string;
  description: string;
  targetReturnPercent: number;
  maxDrawdownPercent: number;
  durationDays: number;
  startingCapital: number;
}

export default function ChallengesPage() {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [joinStatus, setJoinStatus] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch('/api/v1/challenges')
      .then(res => res.json())
      .then(data => {
        setChallenges(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleJoin = async (id: string) => {
    setJoinStatus(prev => ({ ...prev, [id]: 'Joining...' }));
    try {
      const res = await fetch(`/api/v1/challenges/${id}/join`, { method: 'POST' });
      if (res.ok) {
        setJoinStatus(prev => ({ ...prev, [id]: 'Joined!' }));
      } else {
        const err = await res.json();
        setJoinStatus(prev => ({ ...prev, [id]: err.message || 'Failed to join' }));
      }
    } catch (_e) {
      setJoinStatus(prev => ({ ...prev, [id]: 'Error joining' }));
    }
  };

  if (loading) return <div className="p-8">Loading challenges...</div>;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Trading Challenges</h1>
      
      {challenges.length === 0 ? (
        <div className="text-gray-500 text-center py-8">No active challenges available.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {challenges.map(c => (
            <div key={c.id} className="border p-4 rounded shadow bg-white">
              <h3 className="font-bold text-xl">{c.title}</h3>
              <p className="text-gray-600 my-2">{c.description}</p>
              <div className="text-sm mt-4 text-gray-500">
                Target Return: {c.targetReturnPercent}%<br/>
                Max Drawdown: {c.maxDrawdownPercent}%<br/>
                Duration: {c.durationDays} days<br/>
                Starting Capital: ${c.startingCapital}
              </div>
              <button 
                onClick={() => handleJoin(c.id)}
                disabled={joinStatus[c.id] === 'Joined!' || joinStatus[c.id] === 'Joining...'}
                className="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {joinStatus[c.id] || 'Join Challenge'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
