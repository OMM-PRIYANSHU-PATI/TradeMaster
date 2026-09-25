'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { use } from 'react';

type JournalEntryData = {
  title?: string;
  createdAt: string;
  reviewType: string;
  notes?: string;
  mistakes?: string;
  ruleAdherence?: string;
  emotion?: string;
  setup?: string;
  marketCondition?: string;
  tags?: { id: string, name: string }[];
  attachments?: { id: string, fileUrl: string }[];
};

export default function JournalDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  const [entry, setEntry] = useState<JournalEntryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/v1/journal/${id}`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to load entry');
        return res.json();
      })
      .then(data => {
        setEntry(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [id]);

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this entry?')) return;
    
    try {
      const res = await fetch(`/api/v1/journal/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      router.push('/journal');
    } catch (err: unknown) {
      if (err instanceof Error) alert(err.message);
    }
  };

  if (loading) return <div className="p-6">Loading...</div>;
  if (error) return <div className="p-6 text-red-500">{error}</div>;
  if (!entry) return null;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold">{entry.title || 'Journal Entry'}</h1>
          <p className="text-gray-500 text-sm">{new Date(entry.createdAt).toLocaleString()} | {entry.reviewType}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => router.push('/journal')} className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300">Back</button>
          <button onClick={handleDelete} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">Delete</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          <div className="bg-white p-4 rounded shadow-sm border">
            <h2 className="font-semibold mb-2">Notes</h2>
            <p className="whitespace-pre-wrap">{entry.notes || 'No notes'}</p>
          </div>
          <div className="bg-white p-4 rounded shadow-sm border">
            <h2 className="font-semibold mb-2">Mistakes & Rules</h2>
            <p className="mb-2"><span className="font-medium">Mistakes:</span> {entry.mistakes || 'None'}</p>
            <p><span className="font-medium">Rule Adherence:</span> {entry.ruleAdherence || 'None'}</p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white p-4 rounded shadow-sm border">
            <h2 className="font-semibold mb-2">Context</h2>
            <ul className="space-y-2 text-sm">
              <li><span className="text-gray-500">Emotion:</span> {entry.emotion || 'N/A'}</li>
              <li><span className="text-gray-500">Setup:</span> {entry.setup || 'N/A'}</li>
              <li><span className="text-gray-500">Market Condition:</span> {entry.marketCondition || 'N/A'}</li>
            </ul>
          </div>
          
          <div className="bg-white p-4 rounded shadow-sm border">
            <h2 className="font-semibold mb-2">Tags</h2>
            <div className="flex flex-wrap gap-2">
              {entry.tags?.length ? entry.tags.map((t: { id: string, name: string }) => (
                <span key={t.id} className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">{t.name}</span>
              )) : <span className="text-sm text-gray-500">No tags</span>}
            </div>
          </div>
          
          {(entry.attachments?.length ?? 0) > 0 && (
            <div className="bg-white p-4 rounded shadow-sm border">
              <h2 className="font-semibold mb-2">Attachments</h2>
              <div className="space-y-2">
                {entry.attachments?.map((att: { id: string, fileUrl: string }) => (
                  <a key={att.id} href={att.fileUrl} target="_blank" rel="noreferrer" className="block text-sm text-blue-600 hover:underline truncate">
                    {att.fileUrl}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
