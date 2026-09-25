"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function Profile() {
  const [user, setUser] = useState<{email: string, status: string} | null>(null);
  const [profile, setProfile] = useState<{firstName: string, lastName: string}>({ firstName: "", lastName: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const userRes = await fetch(`/api/v1/auth/me`, { credentials: "include" });
        if (!userRes.ok) throw new Error("Unauthorized");
        const userData = await userRes.json();
        setUser(userData);

        const profileRes = await fetch(process.env.NEXT_PUBLIC_API_URL + '/api/v1/profile', { credentials: "include" });
        if (profileRes.ok) {
          const profileData = await profileRes.json();
          setProfile({ firstName: profileData.firstName || "", lastName: profileData.lastName || "" });
        }
      } catch {
        router.push("/login");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [router]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess(false);

    try {
      const res = await fetch(process.env.NEXT_PUBLIC_API_URL + '/api/v1/profile', {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
        credentials: "include",
      });

      if (!res.ok) throw new Error("Failed to save profile");
      setSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await fetch(process.env.NEXT_PUBLIC_API_URL + '/api/v1/auth/logout', { method: "POST", credentials: "include" });
    router.push("/login");
  };

  if (loading) return <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-white">Loading...</div>;

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl p-8 bg-zinc-900 rounded-lg border border-zinc-800">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Your Profile</h1>
          <button onClick={handleLogout} className="text-sm bg-zinc-800 hover:bg-zinc-700 px-3 py-1 rounded">Logout</button>
        </div>
        {error && <div className="mb-4 p-3 bg-red-900/50 text-red-200 rounded text-sm">{error}</div>}
        {success && <div className="mb-4 p-3 bg-green-900/50 text-green-200 rounded text-sm">Profile saved successfully!</div>}
        
        <form className="space-y-4" onSubmit={handleSave}>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">First Name</label>
              <input type="text" value={profile.firstName} onChange={e => setProfile({...profile, firstName: e.target.value})} className="w-full bg-zinc-950 border border-zinc-700 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">Last Name</label>
              <input type="text" value={profile.lastName} onChange={e => setProfile({...profile, lastName: e.target.value})} className="w-full bg-zinc-950 border border-zinc-700 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Email</label>
            <input type="email" readOnly value={user?.email || ""} className="w-full bg-zinc-950 border border-zinc-700 rounded px-3 py-2 text-zinc-500 cursor-not-allowed" />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Account Status</label>
            <input type="text" readOnly value={user?.status || "ACTIVE"} className="w-full bg-zinc-950 border border-zinc-700 rounded px-3 py-2 text-green-500 font-medium cursor-not-allowed" />
          </div>
          <button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-2 px-4 rounded transition-colors">
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </form>
      </div>
    </div>
  );
}
