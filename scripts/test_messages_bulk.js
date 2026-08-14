(async () => {
  try {
    const base = 'http://localhost:3000';
    const convRes = await fetch(`${base}/api/supabase/conversations?last=true`);
    const convList = await convRes.json();
    const conv = convList.conversations?.[0];
    if (!conv) { console.log('no conversation'); return; }
    console.log('using conversation', conv.id);
    for (let i = 0; i < 10; i++) {
      const body = { conversation_id: conv.id, role: i % 2 === 0 ? 'user' : 'assistant', content: `bulk test message ${i}`, id: undefined };
      const res = await fetch(`${base}/api/supabase/messages`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const text = await res.text();
      console.log(i, 'status', res.status, 'body', text);
      await new Promise(r => setTimeout(r, 200));
    }
  } catch (e) { console.error(e); }
})();
