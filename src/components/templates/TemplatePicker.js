'use client';

import { useEffect, useState } from 'react';

function TemplateCard({ tpl, active, onSelect }) {
    return (
        <button
            type="button"
            onClick={() => onSelect(tpl.id)}
            className={`w-full text-left rounded-xl border px-3 py-2.5 mb-2 transition ${active
                    ? 'border-[var(--lime-400)] bg-[rgba(18,26,18,.95)] shadow-[0_0_20px_rgba(158,240,26,.25)]'
                    : 'border-[var(--line)] bg-[rgba(10,14,10,.95)] hover:border-[rgba(158,240,26,.4)]'
                }`}
        >
            <div className="flex items-center justify-between gap-2">
                <div>
                    <div className="text-[13px] font-medium text-[var(--fg-0)] flex items-center gap-1.5">
                        {tpl.name}
                        {tpl.isDefault && (
                            <span className="text-[10px] px-1.5 py-[1px] rounded-full border border-[rgba(158,240,26,.4)] text-[var(--acid-300)]">
                                Default
                            </span>
                        )}
                    </div>
                    {tpl.description && (
                        <div className="text-[11px] text-[var(--fg-1)] mt-0.5 line-clamp-2">
                            {tpl.description}
                        </div>
                    )}
                </div>
                <div className="text-right text-[11px] text-[var(--fg-1)]">
                    {(tpl.aspectRatio || '').toUpperCase() || 'Custom'}
                    <br />
                    <span className="text-[10px] opacity-80">
                        {tpl.width || '–'} × {tpl.height || '–'}
                    </span>
                </div>
            </div>
            <div className="mt-2 flex items-center gap-2">
                <div
                    className="w-10 h-4 rounded border"
                    style={{
                        borderColor: 'rgba(158,240,26,.35)',
                        background: `linear-gradient(90deg, ${tpl.primaryColor} 0, ${tpl.bgColor} 100%)`
                    }}
                />
                <div className="flex flex-wrap gap-1 text-[10px] text-[var(--fg-1)]">
                    <span className="px-1 py-[1px] rounded border border-[var(--line)]">
                        {tpl.position}
                    </span>
                    <span className="px-1 py-[1px] rounded border border-[var(--line)]">
                        {tpl.textAlign}
                    </span>
                    <span className="px-1 py-[1px] rounded border border-[var(--line)]">
                        {tpl.fontSize}px
                    </span>
                    <span className="px-1 py-[1px] rounded border border-[var(--line)]">
                        {tpl.burnLang}
                    </span>
                </div>
            </div>
        </button>
    );
}

export default function TemplatePicker({
    value,
    onChange
}) {
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showCreate, setShowCreate] = useState(false);

    const [name, setName] = useState('');
    const [desc, setDesc] = useState('');
    const [width, setWidth] = useState('');
    const [height, setHeight] = useState('');
    const [aspectRatio, setAspectRatio] = useState('9:16');
    const [fontSize, setFontSize] = useState(20);
    const [position, setPosition] = useState('bottom');
    const [textAlign, setTextAlign] = useState('center');
    const [primaryColor, setPrimaryColor] = useState('#FFFFFF');
    const [outlineColor, setOutlineColor] = useState('#000000');
    const [bgColor, setBgColor] = useState('#000000');
    const [bgOpacity, setBgOpacity] = useState(0.4);
    const [burnLang, setBurnLang] = useState('textSrc');
    const [isDefault, setIsDefault] = useState(false);

    useEffect(() => {
        let alive = true;
        (async () => {
            setLoading(true);
            try {
                const res = await fetch('/api/templates', { cache: 'no-store' });
                const data = await res.json();
                if (!alive) return;
                setTemplates(data.templates || []);
            } catch (e) {
                console.error('Load templates failed', e);
            } finally {
                if (alive) setLoading(false);
            }
        })();
        return () => { alive = false; };
    }, []);

    const submitCreate = async (e) => {
        e.preventDefault();
        if (!name.trim()) return;

        const payload = {
            name: name.trim(),
            description: desc.trim() || null,
            width: width ? Number(width) : null,
            height: height ? Number(height) : null,
            aspectRatio: aspectRatio || null,
            fontSize: Number(fontSize) || 20,
            position,
            textAlign,
            primaryColor,
            outlineColor,
            bgColor,
            bgOpacity: Number(bgOpacity) || 0.4,
            burnLang,
            isDefault
        };

        try {
            const res = await fetch('/api/templates', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (!res.ok) {
                alert(data.error || 'Create failed');
                return;
            }
            setTemplates(prev => [data.template, ...prev]);
            onChange?.(data.template.id);
            setShowCreate(false);
            setName('');
            setDesc('');
        } catch (err) {
            console.error('Create template failed', err);
            alert('Create failed');
        }
    };

    return (
        <div className="mt-3 border border-[var(--line)] rounded-xl p-3 bg-[rgba(6,10,6,.9)]">
            <div className="flex items-center justify-between gap-2 mb-2">
                <div>
                    <div className="text-xs font-medium text-[var(--fg-0)]">
                        Render Template
                    </div>
                    <div className="text-[11px] text-[var(--fg-1)]">
                        Save and reuse subtitle / render styles.
                    </div>
                </div>
                <button
                    type="button"
                    onClick={() => setShowCreate(v => !v)}
                    className="text-[11px] px-2 py-1 rounded border border-[var(--line)] text-[var(--acid-300)] hover:border-[rgba(158,240,26,.5)]"
                >
                    {showCreate ? 'Cancel' : 'New Template'}
                </button>
            </div>

            {loading && (
                <div className="text-[11px] text-[var(--fg-1)] mb-2">
                    Loading templates…
                </div>
            )}

            {!loading && templates.length === 0 && !showCreate && (
                <div className="text-[11px] text-[var(--fg-1)] mb-2">
                    No templates yet. Create one for TikTok / Bilibili / Shorts.
                </div>
            )}

            {!showCreate && templates.length > 0 && (
                <div className="max-h-56 overflow-auto pr-1">
                    {templates.map(tpl => (
                        <TemplateCard
                            key={tpl.id}
                            tpl={tpl}
                            active={value === tpl.id}
                            onSelect={onChange}
                        />
                    ))}
                </div>
            )}

            {showCreate && (
                <form onSubmit={submitCreate} className="mt-2 space-y-2 text-[11px]">
                    <div className="grid grid-cols-[1.2fr,1fr] gap-2">
                        <div>
                            <label className="block text-[11px] text-[var(--fg-1)] mb-1">
                                Name
                            </label>
                            <input
                                value={name}
                                onChange={e => setName(e.target.value)}
                                className="w-full rounded border border-[var(--line)] bg-[#0c120c] px-2 py-1 text-[11px]"
                                placeholder="e.g. TikTok Vertical CN/EN"
                            />
                        </div>
                        <div>
                            <label className="block text-[11px] text-[var(--fg-1)] mb-1">
                                Aspect / Size
                            </label>
                            <div className="flex gap-1">
                                <select
                                    value={aspectRatio}
                                    onChange={e => setAspectRatio(e.target.value)}
                                    className="flex-1 rounded border border-[var(--line)] bg-[#0c120c] px-1 py-1"
                                >
                                    <option value="9:16">9:16 (Vertical)</option>
                                    <option value="16:9">16:9 (Landscape)</option>
                                    <option value="1:1">1:1 (Square)</option>
                                    <option value="">Custom</option>
                                </select>
                                <input
                                    value={width}
                                    onChange={e => setWidth(e.target.value)}
                                    placeholder="W"
                                    className="w-14 rounded border border-[var(--line)] bg-[#0c120c] px-1 py-1"
                                />
                                <input
                                    value={height}
                                    onChange={e => setHeight(e.target.value)}
                                    placeholder="H"
                                    className="w-14 rounded border border-[var(--line)] bg-[#0c120c] px-1 py-1"
                                />
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-[11px] text-[var(--fg-1)] mb-1">
                            Description (optional)
                        </label>
                        <input
                            value={desc}
                            onChange={e => setDesc(e.target.value)}
                            className="w-full rounded border border-[var(--line)] bg-[#0c120c] px-2 py-1 text-[11px]"
                            placeholder="e.g. For 1080x1920 TikTok, bold CN+EN bottom center"
                        />
                    </div>

                    <div className="grid grid-cols-[1.2fr,1fr] gap-2">
                        <div className="flex gap-2">
                            <div className="flex-1">
                                <label className="block text-[11px] text-[var(--fg-1)] mb-1">
                                    Position
                                </label>
                                <select
                                    value={position}
                                    onChange={e => setPosition(e.target.value)}
                                    className="w-full rounded border border-[var(--line)] bg-[#0c120c] px-2 py-1"
                                >
                                    <option value="bottom">bottom</option>
                                    <option value="middle">middle</option>
                                    <option value="top">top</option>
                                </select>
                            </div>
                            <div className="flex-1">
                                <label className="block text-[11px] text-[var(--fg-1)] mb-1">
                                    Align
                                </label>
                                <select
                                    value={textAlign}
                                    onChange={e => setTextAlign(e.target.value)}
                                    className="w-full rounded border border-[var(--line)] bg-[#0c120c] px-2 py-1"
                                >
                                    <option value="center">center</option>
                                    <option value="left">left</option>
                                    <option value="right">right</option>
                                </select>
                            </div>
                            <div className="w-16">
                                <label className="block text-[11px] text-[var(--fg-1)] mb-1">
                                    Font
                                </label>
                                <input
                                    type="number"
                                    value={fontSize}
                                    onChange={e => setFontSize(e.target.value)}
                                    className="w-full rounded border border-[var(--line)] bg-[#0c120c] px-1 py-1"
                                />
                            </div>
                        </div>
                        <div className="flex gap-2 items-end">
                            <div className="flex-1">
                                <label className="block text-[11px] text-[var(--fg-1)] mb-1">
                                    Burn
                                </label>
                                <select
                                    value={burnLang}
                                    onChange={e => setBurnLang(e.target.value)}
                                    className="w-full rounded border border-[var(--line)] bg-[#0c120c] px-2 py-1"
                                >
                                    <option value="textSrc">Original</option>
                                    <option value="textZh">Chinese</option>
                                    <option value="textEn">English</option>
                                </select>
                            </div>
                            <label className="flex items-center gap-1 text-[11px] text-[var(--fg-1)]">
                                <input
                                    type="checkbox"
                                    checked={isDefault}
                                    onChange={e => setIsDefault(e.target.checked)}
                                    className="w-3 h-3"
                                />
                                Default
                            </label>
                        </div>
                    </div>

                    <div className="grid grid-cols-[2fr,2fr,1fr] gap-2 items-end">
                        <div>
                            <label className="block text-[11px] text-[var(--fg-1)] mb-1">
                                Colors
                            </label>
                            <div className="flex gap-2">
                                <div className="flex items-center gap-1 flex-1">
                                    <span className="text-[10px] text-[var(--fg-1)]">Text</span>
                                    <input
                                        type="color"
                                        value={primaryColor}
                                        onChange={e => setPrimaryColor(e.target.value)}
                                        className="w-7 h-4 rounded border border-[var(--line)] bg-[#0c120c]"
                                    />
                                </div>
                                <div className="flex items-center gap-1 flex-1">
                                    <span className="text-[10px] text-[var(--fg-1)]">Outline</span>
                                    <input
                                        type="color"
                                        value={outlineColor}
                                        onChange={e => setOutlineColor(e.target.value)}
                                        className="w-7 h-4 rounded border border-[var(--line)] bg-[#0c120c]"
                                    />
                                </div>
                            </div>
                        </div>
                        <div>
                            <label className="block text-[11px] text-[var(--fg-1)] mb-1">
                                Background
                            </label>
                            <div className="flex gap-2 items-center">
                                <input
                                    type="color"
                                    value={bgColor}
                                    onChange={e => setBgColor(e.target.value)}
                                    className="w-7 h-4 rounded border border-[var(--line)] bg-[#0c120c]"
                                />
                                <input
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    max="1"
                                    value={bgOpacity}
                                    onChange={e => setBgOpacity(e.target.value)}
                                    className="w-16 rounded border border-[var(--line)] bg-[#0c120c] px-1 py-1"
                                />
                                <span className="text-[10px] text-[var(--fg-1)]">opacity</span>
                            </div>
                        </div>
                        <div className="flex justify-end">
                            <button
                                type="submit"
                                className="px-3 py-1.5 rounded border border-[rgba(158,240,26,.5)] text-[11px] text-[var(--fg-0)] bg-[rgba(20,32,16,.95)] hover:shadow-[0_0_16px_rgba(158,240,26,.35)]"
                            >
                                Save
                            </button>
                        </div>
                    </div>
                </form>
            )}
        </div>
    );
}
