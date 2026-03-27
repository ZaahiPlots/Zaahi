import fs from 'fs';
import path from 'path';

export default function Home() {
  const corePath = path.join(process.cwd(), 'core');
  const files = fs.existsSync(corePath) ? fs.readdirSync(corePath).filter(f => f.endsWith('.py')) : [];

  return (
    <div style={{ padding: '40px', background: '#0f172a', color: '#fff', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      <h1 style={{ color: '#38bdf8' }}>ZAAHI AI: Dubai Hub</h1>
      <p>Modules found: {files.length}</p>
      <div style={{ marginTop: '20px' }}>
        {files.map(f => <div key={f} style={{ padding: '10px', background: '#1e293b', marginBottom: '5px', borderRadius: '5px' }}>{f}</div>)}
      </div>
    </div>
  );
}
