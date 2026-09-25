'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface EditProfile {
  avatarUrl?: string;
  bio?: string;
  experienceLevel?: string;
  riskPreference?: string;
  marketsTraded?: string[];
  isPublic?: boolean;
}

export default function EditProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<EditProfile>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/v1/profile')
      .then((res) => res.json())
      .then((data) => setProfile(data))
      .catch(console.error);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    if (name === 'marketsTraded') {
      const markets = value.split(',').map((s: string) => s.trim());
      setProfile({ ...profile, marketsTraded: markets });
    } else {
      setProfile({ ...profile, [name]: type === 'checkbox' ? checked : value });
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { bio, avatarUrl, experienceLevel, riskPreference, marketsTraded, isPublic } = profile;
      const res = await fetch('/api/v1/profile/trading-prefs', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bio, avatarUrl, experienceLevel, riskPreference, marketsTraded, isPublic }),
      });
      if (res.ok) {
        alert('Profile saved!');
        router.push('/profile');
      } else {
        const error = await res.json();
        alert(`Failed to save: ${JSON.stringify(error)}`);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-8 max-w-xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Edit Trading Profile</h1>
      <form onSubmit={handleSave} className="flex flex-col gap-4">
        <div>
          <label className="block font-semibold mb-1">Avatar URL</label>
          <input
            type="text"
            name="avatarUrl"
            className="w-full border p-2 rounded"
            value={profile.avatarUrl || ''}
            onChange={handleChange}
          />
        </div>
        <div>
          <label className="block font-semibold mb-1">Bio</label>
          <textarea
            name="bio"
            className="w-full border p-2 rounded h-24"
            value={profile.bio || ''}
            onChange={handleChange}
          />
        </div>
        <div>
          <label className="block font-semibold mb-1">Experience Level</label>
          <select
            name="experienceLevel"
            className="w-full border p-2 rounded"
            value={profile.experienceLevel || ''}
            onChange={handleChange}
          >
            <option value="">Select...</option>
            <option value="BEGINNER">Beginner</option>
            <option value="INTERMEDIATE">Intermediate</option>
            <option value="EXPERT">Expert</option>
          </select>
        </div>
        <div>
          <label className="block font-semibold mb-1">Risk Preference</label>
          <select
            name="riskPreference"
            className="w-full border p-2 rounded"
            value={profile.riskPreference || ''}
            onChange={handleChange}
          >
            <option value="">Select...</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
          </select>
        </div>
        <div>
          <label className="block font-semibold mb-1">Markets Traded (comma separated)</label>
          <input
            type="text"
            name="marketsTraded"
            className="w-full border p-2 rounded"
            value={(profile.marketsTraded || []).join(', ')}
            onChange={handleChange}
          />
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            name="isPublic"
            checked={profile.isPublic || false}
            onChange={handleChange}
          />
          <label className="font-semibold">Make Profile Public</label>
        </div>
        <button
          type="submit"
          className="bg-blue-600 text-white p-2 rounded mt-4"
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save Profile'}
        </button>
      </form>
    </div>
  );
}
