'use client';
import { useState } from 'react';
import Modal from '@/components/ui/Modal';

async function postJSON(url, body) {
    const res = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    });
    if (!res.ok)
        throw new Error(await res.text());
    return res.json();
}

export default function ProjectCreateDialog({
    open, onClose, onCreated
}) {
    const [name, setName] = useState('');

    async function submit() {
        try {
            const data = await postJSON('/api/projects', { name });
            onCreated?.(data.project);
            onClose?.();
        } catch (e) {
            alert('Create failed: ' + e.message);
        }
    }

    return (
        <Modal
            open={open}
            onClose={onClose}
            title="Create Project"
            footer={
                <>
                    <button className="btn" onClick={onClose}>Cancel</button>
                    <button className="btn btn-primary" onClick={submit}>Create</button>
                </>
            }
        >
            <div className="space-y-3">
                <div>
                    <label className="text-xs text-[var(--fg-1)]">Project Name</label>
                    <input className="input w-full mt-1"
                        placeholder="My YouTube Shorts"
                        value={name}
                        onChange={e => setName(e.target.value)}
                    />
                </div>
                <p className="text-xs text-[var(--fg-2)]">
                    Projects group multiple videos, states and renders with team access.
                </p>
            </div>
        </Modal>
    );
}
