"use client";

import { useEffect, useState } from "react";
import { apiUrl, jsonHeaders } from "@/lib/api";

const STATUSES = [
  { id: "wishlist", label: "Wishlist" },
  { id: "applied", label: "Applied" },
  { id: "interview", label: "Interview" },
  { id: "offer", label: "Offer" },
  { id: "rejected", label: "Rejected" },
] as const;

type Status = (typeof STATUSES)[number]["id"];

interface ApplicationItem {
  id: number;
  status: Status;
  company: string;
  role: string;
  url?: string;
  notes: string;
  applied_at?: string | null;
  ats_report_id?: number | null;
}

export default function TrackerPage() {
  const [columns, setColumns] = useState<Record<string, ApplicationItem[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState({ company: "", role: "", url: "" });

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(apiUrl("/api/v1/tracker/applications"), { headers: jsonHeaders() });
      if (!res.ok) throw new Error("Unable to load tracker");
      const data = await res.json();
      setColumns(data.columns ?? {});
    } catch (err) {
      setError(err instanceof Error ? err.message : "Tracker error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!draft.company.trim() || !draft.role.trim()) return;
    await fetch(apiUrl("/api/v1/tracker/applications"), {
      method: "POST",
      headers: jsonHeaders(),
      body: JSON.stringify({ ...draft, status: "wishlist" }),
    });
    setDraft({ company: "", role: "", url: "" });
    await load();
  };

  const move = async (item: ApplicationItem, status: Status, position: number) => {
    await fetch(apiUrl(`/api/v1/tracker/applications/${item.id}/move`), {
      method: "PATCH",
      headers: jsonHeaders(),
      body: JSON.stringify({ status, position }),
    });
    await load();
  };

  return (
    <main className="min-h-screen p-6" style={{ background: "#0a0f1a", color: "#e2e8f0" }}>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-widest" style={{ color: "#64748b" }}>Applications</p>
          <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-space)" }}>Tracker</h1>
        </div>
        <div className="flex gap-2">
          <input value={draft.company} onChange={(e) => setDraft({ ...draft, company: e.target.value })} placeholder="Company" className="h-9 rounded-lg px-3 text-sm" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }} />
          <input value={draft.role} onChange={(e) => setDraft({ ...draft, role: e.target.value })} placeholder="Role" className="h-9 rounded-lg px-3 text-sm" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }} />
          <input value={draft.url} onChange={(e) => setDraft({ ...draft, url: e.target.value })} placeholder="URL" className="h-9 rounded-lg px-3 text-sm" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }} />
          <button onClick={create} className="h-9 rounded-lg px-4 text-sm font-semibold" style={{ background: "#2563eb", color: "white" }}>Add</button>
        </div>
      </div>

      {error && <p className="mb-4 text-sm text-red-300">{error}</p>}
      {loading ? <p className="text-sm" style={{ color: "#64748b" }}>Loading tracker…</p> : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-5">
          {STATUSES.map((status) => {
            const items = columns[status.id] ?? [];
            return (
              <section key={status.id} className="min-h-[70vh] rounded-xl border p-3" style={{ background: "rgba(15,23,42,0.65)", borderColor: "rgba(255,255,255,0.08)" }}>
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-sm font-semibold">{status.label}</h2>
                  <span className="rounded-full px-2 py-0.5 text-xs" style={{ background: "rgba(255,255,255,0.06)", color: "#94a3b8" }}>{items.length}</span>
                </div>
                <div className="space-y-2">
                  {items.map((item, index) => (
                    <article key={item.id} className="rounded-lg border p-3" style={{ background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.08)" }}>
                      <p className="text-sm font-semibold">{item.role}</p>
                      <p className="text-xs" style={{ color: "#94a3b8" }}>{item.company}</p>
                      {item.applied_at && <p className="mt-1 text-[10px]" style={{ color: "#64748b" }}>Applied {new Date(item.applied_at).toLocaleDateString()}</p>}
                      <div className="mt-3 flex flex-wrap gap-1">
                        {STATUSES.filter((s) => s.id !== item.status).map((target) => (
                          <button key={target.id} onClick={() => move(item, target.id, index)} className="rounded px-2 py-1 text-[10px]" style={{ background: "rgba(255,255,255,0.06)", color: "#cbd5e1" }}>{target.label}</button>
                        ))}
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </main>
  );
}
