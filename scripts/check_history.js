(async () => {
  try {
    const base = 'http://localhost:3000';
    let r = await fetch(`${base}/api/supabase/conversations?last=true`);
    const list = await r.json();
    console.log('conversations', JSON.stringify(list));
    const conv = list.conversations?.[0];
    if (conv) {
      r = await fetch(`${base}/api/supabase/conversations/${conv.id}`);
      console.log('messages for', conv.id, await r.text());
    }
  } catch (e) {
    console.error(e);
  }
})();
