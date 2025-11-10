'use client';
import { useEffect, useState } from 'react';
import OpenProjectDialog from '@/components/projects/OpenProjectDialog';

async function j(url, opt) {
  const res = await fetch(url, { cache: 'no-store', ...opt });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export default function ProjectsPage() {
  const [list, setList] = useState([]);
  const [name, setName] = useState('');
  const [openId, setOpenId] = useState(null);

  const reload = async () => {
    const data = await j('/api/projects');
    setList(data.projects || []);
  };
  useEffect(()=>{ reload(); }, []);

  const create = async () => {
    if (!name.trim()) return;
    await j('/api/projects', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ name })
    });
    setName('');
    reload();
  };

  const del = async (id) => {
    if (!confirm('Delete this project? Videos will remain but be detached.')) return;
    await j(`/api/projects/${id}`, { method: 'DELETE' });
    reload();
  };

  return (
    <main className="p-4 md:p-6 space-y-6">
      <header className="rounded-xl border border-[#2a4729] bg-[#0c120c] px-4 py-3 flex items-center justify-between">
        <h1 className="text-[#eaff89] text-lg font-semibold">Projects</h1>
        <a href="/" className="text-[#caff6b] underline text-sm">← Back to Home</a>
      </header>

      <section className="rounded-xl border border-[#2a4729] bg-[#0c120c] p-4 space-y-3">
        <div className="text-sm text-[#bfe78a]">Create a new project</div>
        <div className="flex gap-2">
          <input
            className="flex-1 rounded-md border border-[#2a4729] bg-[#0f160f] px-3 py-2 text-[#d8ff70]"
            value={name}
            onChange={e=>setName(e.target.value)}
            placeholder="Project name"
          />
          <button onClick={create} className="px-3 py-2 rounded-md border border-[#3f6f35] bg-[#111a11] text-[#e8ff82]">Create</button>
        </div>
      </section>

      <section className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {list.map(p => (
          <div key={p.id} className="rounded-xl border border-[#2a4729] bg-[#0c120c] p-4">
            <div className="flex items-center justify-between">
              <div className="text-[#d8ff70] font-medium">{p.name}</div>
              <div className="text-xs text-[#8fe86c]">{new Date(p.createdAt).toLocaleString()}</div>
            </div>
            <div className="mt-2 text-xs text-[#9bdc75]">Videos: {p._count?.videos ?? 0} · Editor states: {p._count?.editorStates ?? 0}</div>
            <div className="mt-3 flex gap-2">
              <button onClick={()=>setOpenId(p.id)} className="px-3 py-2 rounded-md border border-[#3f6f35] bg-[#111a11] text-[#e8ff82]">Open Project…</button>
              <button onClick={()=>del(p.id)} className="px-3 py-2 rounded-md border border-[#3f2f2f] bg-[#191111] text-[#ffdada]">Delete</button>
            </div>
          </div>
        ))}
        {(!list || !list.length) && <div className="text-sm text-[#9bdc75]">No projects yet.</div>}
      </section>

      <OpenProjectDialog open={!!openId} projectId={openId} onClose={()=>setOpenId(null)} />
    </main>
  );
}
