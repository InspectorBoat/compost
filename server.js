import express from 'express';
import cors from 'cors';

// Use global fetch if available (Node 18+), otherwise require node-fetch
let fetchFn = global.fetch;
try {
  if (!fetchFn) fetchFn = (await import('node-fetch')).default;
} catch (e) {
  // node-fetch may not be installed; a runtime error will be thrown later if fetch is missing
}

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

if (!GEMINI_API_KEY) {
  console.warn('Warning: GEMINI_API_KEY not set. /api/classify will fail until set.');
}

// Simple validation helper
function validateBody(body) {
  if (!body) return 'Missing JSON body.';
  if (!body.item || typeof body.item !== 'string' || body.item.trim() === '') return 'Missing or invalid "item".';
  return null;
}

// POST /api/classify
// Request JSON: { item: string, location?: string }
// Response JSON: { category: string, source?: string }
app.post('/api/classify', async (req, res) => {
  const err = validateBody(req.body);
  if (err) return res.status(400).json({ error: err });

  const { item, location } = req.body;

  if (!GEMINI_API_KEY) {
    return res.status(500).json({ error: 'Server API key not configured.' });
  }

  console.log('[/api/classify] incoming request:', { item, location });

  try {
    // Build a concise prompt for classification.
    const prompt = `Classify the following waste item as one of: Compost, Recyclable, Trash, or Unknown. Return only the category word.\n\nItem: ${item}${location ? `\nLocation: ${location}` : ''}`;

    // Call Google GenAI (Gemini) REST endpoint. If you're using an API key (not OAuth2),
    // include it as a query param (`?key=...`). For OAuth2, the Bearer token should be used.
    const url = `https://generativeai.googleapis.com/v1/models/text-bison-001:generate${GEMINI_API_KEY && !GEMINI_API_KEY.startsWith('ya29') ? `?key=${encodeURIComponent(GEMINI_API_KEY)}` : ''}`;
    const headers = { 'Content-Type': 'application/json' };
    if (GEMINI_API_KEY && GEMINI_API_KEY.startsWith('ya29')) headers['Authorization'] = `Bearer ${GEMINI_API_KEY}`;

    const response = await fetchFn(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        prompt: { text: prompt },
        temperature: 0,
        maxOutputTokens: 64,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error('Model API error', response.status, text);
      return res.status(502).json({ error: 'Model API error', details: text });
    }

    const data = await response.json();
    // Parse model response conservatively across possible Google GenAI/Gemini response shapes.
    let content = '';
    // Common shapes: data.candidates[0].content[0].text, data.candidates[0].output, data.output[0].content...
    try {
      if (data.candidates && data.candidates[0]) {
        const cand = data.candidates[0];
        if (cand.output) content = String(cand.output);
        else if (cand.text) content = String(cand.text);
        else if (cand.content && cand.content[0] && cand.content[0].text) content = String(cand.content[0].text);
      }
      // Google GenAI typical shape: data.output[0].content -> array with {type: 'output_text', text}
      if (!content && data.output && data.output[0] && data.output[0].content) {
        const piece = data.output[0].content.find((p) => p.type === 'output_text' || p.type === 'text');
        if (piece && piece.text) content = String(piece.text);
      }
      if (!content && data.result && data.result.output_text) content = String(data.result.output_text);
      if (!content && data.text) content = String(data.text);
    } catch (e) {
      content = '';
    }

    const normalized = (content || '').trim().split(/[\n\r]/)[0];
    const category = /compost/i.test(normalized)
      ? 'Compost'
      : /recycl/i.test(normalized)
      ? 'Recyclable'
      : /trash|landfill|residual/i.test(normalized)
      ? 'Trash'
      : 'Unknown';

    res.json({ category, source: 'model', raw: normalized });
  } catch (e) {
    console.error('Error in /api/classify', e);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
