'use client';
import { useState, useEffect } from 'react';

export default function Home() {
  const [input, setInput] = useState("");
  const [chat, setChat] = useState([]);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);

  const sync = async () => {
    try {
      const res = await fetch('/api/modules');
      const data = await res.json();
      setFiles(data.files || []);
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    sync();
    const inv = setInterval(sync, 5000);
    return () => clearInterval(inv);
  }, []);

  const send = async () => {
    if (!input) return;
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input })
      });
      const data = await res.json();
      setChat(p => [...p, { q: input, a: data.response || data.error }]);
    } catch (e) { setChat(p => [...p, { q: input, a: "System error" }]); }
    setInput("");
    setLoading(false);
  };
  return (
    <div style={{ padding: '30px', background: '#020617', color: '#f8fafc', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      <h1 style={{ color: '#38bdf8' }}>ZAAHI 2.0 • DUBAI</h1>
      <p style={{ color: '#64748b' }}>Active Modules: {files.length}</p>
      <div style={{ display: 'flex', gap: '20px' }}>
        <div style={{ flex: 2, background: '#0f172a', padding: '20px', borderRadius: '10px', border: '1px solid #1e293b' }}>
          <div style={{ height: '300px', overflowY: 'auto', marginBottom: '15px' }}>
            {chat.map((m, i) => (
              <div key={i} style={{ marginBottom: '10px', fontSize: '0.9rem' }}>
                <div style={{ color: '#94a3b8' }}><b>You:</b> {m.q}</div>
                <div style={{ color: '#38bdf8' }}><b>Cat:</b> {m.a}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input style={{ flex: 1, background: '#000', border: '1px solid #334155', color: '#fff', padding: '10px' }} 
                   value={input} onChange={e => setInput(e.target.value)} placeholder="System query..." />
            <button style={{ background: '#38bdf8', color: '#000', padding: '10px', fontWeight: 'bold' }} onClick={send}>
              {loading ? "..." : "SEND"}
            </button>
          </div>
        </div>
        <div style={{ flex: 1, background: '#0f172a', padding: '20px', borderRadius: '10px', border: '1px solid #1e293b', height: '400px', overflowY: 'auto' }}>
          <h4 style={{ color: '#38bdf8', margin: '0 0 10px 0' }}>AUTONOMOUS CORE</h4>
          {files.map(f => (
            <div key={f} style={{ fontSize: '0.7rem', fontFamily: 'monospace', color: '#64748b', borderLeft: '2px solid #38bdf8', paddingLeft: '5px', marginBottom: '3px' }}>
              {f}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
