document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('ask-form');
  const questionEl = document.getElementById('question');
  const answerEl = document.getElementById('answer');

  // Use Vercel backend or local fallback
  const API_BASE = window.location.hostname === 'localhost' 
    ? '' 
    : 'https://geminii-8e7n.vercel.app';

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const question = questionEl.value.trim();
    if (!question) return;

    answerEl.textContent = 'Thinking...';

    try {
      const resp = await fetch(`${API_BASE}/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question })
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => null);
        let message = err?.error || resp.statusText;
        // If backend included provider body, try to extract detailed message
        if (err?.body) {
          try {
            const bodyObj = JSON.parse(err.body);
            message = bodyObj?.error?.message || message;
          } catch (_) {
            // leave message as-is
          }
        }
        answerEl.textContent = `Error: ${message}`;
        return;
      }

      const data = await resp.json();
      answerEl.textContent = data?.answer || 'No answer returned.';
    } catch (err) {
      answerEl.textContent = 'Network error or server offline.';
      console.error(err);
    }
  });
});
