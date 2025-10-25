require('dotenv').config();
const express = require('express');
const path = require('path');
const fetchFn = (typeof fetch !== 'undefined') ? fetch : require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;
const MOCK_RESPONSE = process.env.MOCK_RESPONSE === 'true';
const GEMINI_PROVIDER = (process.env.GEMINI_PROVIDER || 'google').toLowerCase();
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/diagnostics/gemini', async (req, res) => {
  try {
    const GEMINI_API_URL = process.env.GEMINI_API_URL;
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

    const isGoogle = GEMINI_PROVIDER === 'google' || (GEMINI_API_URL || '').includes('generativelanguage.googleapis.com');
    let finalUrl = GEMINI_API_URL;
    if (isGoogle) {
      if (!finalUrl) {
        finalUrl = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(GEMINI_MODEL)}:generateContent`;
      }
    }

    const redactedUrl = finalUrl ? finalUrl.replace(/key=[^&]+/g, 'key=REDACTED') : '';
    const key = process.env.GEMINI_API_KEY || '';
    const report = {
      provider: GEMINI_PROVIDER,
      model: GEMINI_MODEL,
      apiUrlConfigured: !!GEMINI_API_URL,
      apiUrlResolved: redactedUrl,
      mockResponse: MOCK_RESPONSE,
      haveApiKey: !!key,
      keyLength: key ? key.length : 0,
      keyPreview: key ? `***${key.slice(-4)}` : '',
    };

    if (MOCK_RESPONSE) {
      report.status = 'using-mock';
      return res.json(report);
    }

    if (!GEMINI_API_KEY) {
      report.status = 'error';
      report.error = 'Missing GEMINI_API_KEY in .env';
      return res.status(500).json(report);
    }

    let testUrl = finalUrl;
    const headers = { 'Content-Type': 'application/json' };
    if (isGoogle) {
      headers['X-goog-api-key'] = GEMINI_API_KEY;
    } else {
      headers['Authorization'] = `Bearer ${GEMINI_API_KEY}`;
    }

    const payload = isGoogle
      ? { contents: [{ parts: [{ text: 'ping' }] }] }
      : { prompt: 'ping' };

    const response = await fetchFn(testUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });

    report.httpStatus = response.status;
    if (!response.ok) {
      const bodyText = await response.text().catch(() => '');
      report.status = 'error';
      report.providerBody = bodyText;
      try {
        const parsed = JSON.parse(bodyText);
        report.message = parsed?.error?.message || response.statusText;
      } catch {
        report.message = response.statusText || 'Non-JSON error from provider';
      }
      return res.status(500).json(report);
    }

    report.status = 'ok';
    return res.json(report);
  } catch (e) {
    return res.status(500).json({ status: 'error', message: e?.message || String(e) });
  }
});

app.post('/ask', async (req, res) => {
  try {
    const { question } = req.body;
    if (!question || typeof question !== 'string') {
      return res.status(400).json({ error: 'Missing question string in body' });
    }

    const GEMINI_API_URL = process.env.GEMINI_API_URL;
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

    if (MOCK_RESPONSE) {
      console.warn('Using mock response for /ask (MOCK_RESPONSE=true)');
      await new Promise((r) => setTimeout(r, 300));
      return res.json({ answer: `Mocked Gemini reply: "${question}" → (Demo answer — set MOCK_RESPONSE=false and configure API to call the real service).` });
    }

    if (!GEMINI_API_KEY) {
      return res.status(500).json({ error: 'Server not configured: missing GEMINI_API_KEY in .env' });
    }

    let finalUrl = GEMINI_API_URL;
    let headers = { 'Content-Type': 'application/json' };
    let payload;

    const isGoogle = GEMINI_PROVIDER === 'google' || (GEMINI_API_URL || '').includes('generativelanguage.googleapis.com');

    if (isGoogle) {
      if (!finalUrl) {
        finalUrl = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(GEMINI_MODEL)}:generateContent`;
      }
      headers['X-goog-api-key'] = GEMINI_API_KEY;
      payload = {
        contents: [
          {
            parts: [{ text: question }]
          }
        ]
      };
    } else {
      if (!finalUrl) {
        return res.status(500).json({ error: 'Server not configured: provide GEMINI_API_URL in .env' });
      }
      headers['Authorization'] = `Bearer ${GEMINI_API_KEY}`;
      payload = {
        prompt: question,
        max_output_tokens: 512
      };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);

    const response = await fetchFn(finalUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      console.error('Gemini API error', response.status, text);
      return res.status(502).json({ error: 'Gemini API returned an error', status: response.status, body: text });
    }

    const data = await response.json().catch(() => null);

    let answer = '';

    if (!answer && data?.choices && Array.isArray(data.choices) && data.choices.length > 0) {
      const c0 = data.choices[0];
      if (typeof c0.text === 'string') answer = c0.text;
      if (!answer && c0.message && c0.message.content) {
        if (typeof c0.message.content === 'string') answer = c0.message.content;
        else if (Array.isArray(c0.message.content)) answer = c0.message.content.map(p => p.text || p).join('\n');
      }
    }

    if (!answer && data?.candidates && Array.isArray(data.candidates) && data.candidates.length > 0) {
      const cand = data.candidates[0];
      if (typeof cand.content === 'string') {
        answer = cand.content;
      } else if (cand.content?.parts && Array.isArray(cand.content.parts)) {
        answer = cand.content.parts.map(p => p.text || '').join('\n');
      } else if (Array.isArray(cand?.content)) {
        answer = cand.content.map(p => p.text || p).join('\n');
      }
    }

    if (!answer && data?.output && Array.isArray(data.output) && data.output.length > 0) {
      const out = data.output[0];
      if (typeof out === 'string') answer = out;
      else if (out?.content && Array.isArray(out.content)) answer = out.content.map(p => p.text || p).join('\n');
    }

    if (!answer) {
      if (typeof data === 'string') answer = data;
      else if (data && typeof data === 'object') {
        answer = JSON.stringify(data);
      } else {
        answer = 'Sorry — could not parse Gemini response.';
      }
    }

    res.json({ answer });
  } catch (err) {
    console.error('Error in /ask:', err?.message || err);
    if (err.name === 'AbortError') {
      return res.status(504).json({ error: 'Gemini request timed out.' });
    }
    res.status(500).json({ error: 'Server error', details: err?.message || String(err) });
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/app', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'app.html'));
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Ask Gemini server listening on http://localhost:${PORT}`);
});
