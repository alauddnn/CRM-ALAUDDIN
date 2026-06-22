(async () => {
  try {
    const res = await fetch('http://localhost:3333/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'sales1@crm.com', password: '1' })
    });
    const text = await res.text();
    console.log('STATUS', res.status);
    console.log('BODY', text);
  } catch (e) {
    console.error('ERR', e.message);
    process.exitCode = 1;
  }
})();
