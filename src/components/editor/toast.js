'use client';

let t;

export function toast(msg) {
    clearTimeout(t);
    const box = document.createElement('div');
    box.textContent = msg;
    box.style.position = 'fixed';
    box.style.bottom = '16px';
    box.style.left = '50%';
    box.style.transform = 'translateX(-50%)';
    box.style.padding = '10px 14px';
    box.style.border = '1px solid #3a6a33';
    box.style.background = '#0e150e';
    box.style.color = '#eaff89';
    box.style.fontSize = '12px';
    box.style.borderRadius = '8px';
    box.style.zIndex = 9999;
    document.body.appendChild(box);
    t = setTimeout(() => box.remove(), 1600);
}
