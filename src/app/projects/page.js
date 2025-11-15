'use client';
import { useEffect, useState } from 'react';
import AppChrome from '@/components/layout/AppChrome';
import ProjectCreateDialog from '@/components/projects/ProjectCreateDialog';
import { SkeletonCard } from '@/components/ui/Skeleton';

async function getJSON(url) {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
async function del(url) {
  const res = await fetch(url, { method: 'DELETE' });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export default function ProjectsPage() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [createOpen, setCreateOpen] = useState(false);

  async function refresh() {
    setLoading(true);
    try {
      const data = await getJSON('/api/projects');
      setItems(data.projects || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  }
  useEffect(() => { refresh(); }, []);

  async function removeProject(id) {
    if (!confirm('Delete this project?')) return;
    try {
      await del(`/api/projects/${id}`);
      refresh();
    } catch (e) { alert('Delete failed: ' + e.message); }
  }

  return (
    <AppChrome>
      <section className="card card-strong p-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg" style={{ color: 'var(--acid-200)' }}>Projects</h2>
          <p className="text-xs text-[var(--fg-1)]">Workspace of your multi-video editing pipeline.</p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-accent" onClick={() => setCreateOpen(true)}>New Project</button>
          <a className="btn" href="/">Back to Dashboard</a>
        </div>
      </section>

      {loading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : items.length === 0 ? (
        <div className="card p-6 text-sm text-[var(--fg-1)]">
          No projects yet. Click <span style={{ color: 'var(--acid-200)' }}>New Project</span> to create one.
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          {items.map(p => (
            <div key={p.id} className="card glow p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-base">{p.name}</div>
                <span className="badge"><span className="badge-dot" />{new Date(p.updatedAt || p.createdAt).toLocaleString()}</span>
              </div>
              <div className="text-xs text-[var(--fg-1)]">
                {p.videoCount ?? 0} videos · {p.memberCount ?? 1} members
              </div>
              <div className="flex gap-2">
                <a className="btn btn-primary" href={`/projects/${p.id}`}>Open</a>
                <button className="btn" onClick={() => window.location.href = `/editor?projectId=${p.id}`}>Editor</button>
                <button className="btn btn-danger ml-auto" onClick={() => removeProject(p.id)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ProjectCreateDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => refresh()}
      />
    </AppChrome>
  );
}
