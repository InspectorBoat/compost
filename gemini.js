// Client-side wrapper that calls server `/api/classify` to avoid exposing API keys.
export async function classifyWaste(item, location) {
  const base = window.__API_BASE__ || 'http://localhost:3000';
  const resp = await fetch(`${base}/api/classify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ item, location }),
  });
  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`Classification error: ${resp.status} ${txt}`);
  }
  const data = await resp.json();
  // server returns { category, source, raw }
  return (data.category || data.raw || '').toString();
}