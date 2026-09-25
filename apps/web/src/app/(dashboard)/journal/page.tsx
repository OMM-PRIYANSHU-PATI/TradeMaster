'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function JournalListPage() {
  const [entries, setEntries] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    fetch('/api/v1/journal')
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch journal entries');
        return res.json();
      })
      .then(data => {
        setEntries(data);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (err instanceof Error) setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="text-red-500">{error}</div>;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Trading Journal</h1>
        <Link 
          href="/journal/new"
          className="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700"
        >
          New Entry
        </Link>
      </div>

      {entries.length === 0 ? (
        <p className="text-gray-500">No journal entries yet.</p>
      ) : (
        <div className="space-y-4">
          {entries.map(entry => (
            <div key={String(entry.id)} className="border p-4 rounded bg-white shadow-sm flex flex-col md:flex-row justify-between md:items-center">
              <div>
                <h3 className="text-lg font-semibold cursor-pointer text-blue-600 hover:underline" onClick={() => router.push(`/journal/${String(entry.id)}`)}>
                  {String(entry.title || `Entry - ${new Date(String(entry.createdAt)).toLocaleDateString()}`)}
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  Type: {String(entry.reviewType)} | Tags: {Array.isArray(entry.tags) ? entry.tags.map((t: { name: string }) => t.name).join(', ') : 'None'}
                </p>
                {Boolean(entry.notes) && (
                  <p className="text-sm mt-2 line-clamp-2">{String(entry.notes)}</p>
                )}
              </div>
              <div className="mt-4 md:mt-0 flex gap-2">
                <button 
                  onClick={() => router.push(`/journal/${String(entry.id)}`)}
                  className="px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                >
                  View
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
