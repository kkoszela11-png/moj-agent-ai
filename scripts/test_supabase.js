(async () => {
  try {
    const base = 'http://localhost:3000';
    const uid = '00000000-0000-0000-0000-000000000001';

    console.log('== GET user-profile ==');
    let r = await fetch(`${base}/api/supabase/user-profile?user_id=${uid}`);
    console.log('status', r.status);
    console.log(await r.text());

    console.log('\n== GET conversations?last=true ==');
    r = await fetch(`${base}/api/supabase/conversations?last=true`);
    console.log('status', r.status);
    console.log(await r.text());

    console.log('\n== POST create conversation ==');
    r = await fetch(`${base}/api/supabase/conversations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Test rozmowa z automatu' }),
    });
    console.log('status', r.status);
    console.log(await r.text());
  } catch (e) {
    console.error('ERROR', e);
    process.exit(1);
  }
})();
