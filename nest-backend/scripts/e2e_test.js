(async () => {
  const BASE = 'http://localhost:3333';
  const log = console.log;
  try {
    // Ensure presets
    log('Upserting preset users via script...');
    await import('child_process').then(cp => {
      const ex = cp.spawnSync('node', ['create_preset_users.js'], { cwd: __dirname, stdio: 'inherit' });
      if (ex.status !== 0) throw new Error('create_preset_users.js failed');
    });
  } catch (e) {
    log('Preset step error (may already exist):', e.message || e);
  }

  try {
    // Login as sales1
    log('\n1) Login as Sales (sales1@crm.com)');
    let res = await fetch(`${BASE}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'sales1@crm.com', password: '1' }) });
    const txt = await res.text();
    log('LOGIN STATUS', res.status);
    log('LOGIN BODY', txt);
    if (!res.ok) throw new Error('Sales login failed');
    const data = JSON.parse(txt);
    const token = data.token;

    // Create lead with status WON
    log('\n2) Create lead with status WON');
    res = await fetch(`${BASE}/leads`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ companyName: 'PT E2E Test', contactName: 'Test Contact', phone: '08123456789', email: 'contact@test.com', source: 'Test', estimatedValue: 1000000, status: 'WON', notes: 'Auto-created for E2E' }) });
    const leadTxt = await res.text();
    log('CREATE LEAD STATUS', res.status);
    log('CREATE LEAD BODY', leadTxt);
    if (!res.ok) throw new Error('Create lead failed');
    const lead = JSON.parse(leadTxt);

    // Create SPK for that lead
    log('\n3) Create SPK for lead');
    res = await fetch(`${BASE}/spks`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ leadId: lead.id, title: 'Proyek E2E', description: 'Deskripsi E2E', value: 500000 }) });
    const spkTxt = await res.text();
    log('CREATE SPK STATUS', res.status);
    log('CREATE SPK BODY', spkTxt);
    if (!res.ok) throw new Error('Create SPK failed');
    const spk = JSON.parse(spkTxt);

    // Login as finance
    log('\n4) Login as Finance (finance@crm.com)');
    res = await fetch(`${BASE}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'finance@crm.com', password: '1' }) });
    const finTxt = await res.text();
    log('FIN LOGIN STATUS', res.status);
    log('FIN LOGIN BODY', finTxt);
    if (!res.ok) throw new Error('Finance login failed');
    const finData = JSON.parse(finTxt);
    const finToken = finData.token;

    // Review SPK (approve)
    log('\n5) Finance approves SPK');
    res = await fetch(`${BASE}/spks/${spk.id}/review`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${finToken}` }, body: JSON.stringify({ status: 'APPROVED', financeNotes: 'All good' }) });
    const reviewTxt = await res.text();
    log('REVIEW STATUS', res.status);
    log('REVIEW BODY', reviewTxt);
    if (!res.ok) throw new Error('Review SPK failed');

    // Fetch logs as admin
    log('\n6) Login as Admin and fetch logs');
    res = await fetch(`${BASE}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'admin@crm.com', password: '1' }) });
    const admTxt = await res.text();
    const admData = JSON.parse(admTxt);
    const admToken = admData.token;

    res = await fetch(`${BASE}/logs`, { method: 'GET', headers: { 'Authorization': `Bearer ${admToken}` } });
    const logsTxt = await res.text();
    log('LOGS STATUS', res.status);
    log('LOGS BODY', logsTxt);

    log('\nE2E flow completed');
  } catch (e) {
    console.error('E2E ERROR:', e.message || e);
    process.exitCode = 1;
  }
})();
