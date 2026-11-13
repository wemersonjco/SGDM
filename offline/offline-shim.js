/* SGDM CONTINGÊNCIA: substitui o Supabase por um banco local (localStorage). Funciona sem internet.
   Os dados ficam só neste navegador/computador. Faça backup pelo botão "Backup" da faixa amarela. */
(function () {
  const KEY = 'sgdm_contingencia_db_v1';
  const SEED = window.__SEED || {};
  let mem = null, ok = true;
  function load() {
    try { const r = localStorage.getItem(KEY); if (r) return JSON.parse(r); } catch (e) { ok = false; }
    return JSON.parse(JSON.stringify(SEED));
  }
  const DB = load();
  DB._seq = DB._seq || {};
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(DB)); }
    catch (e) { ok = false; alert('ATENÇÃO: o navegador não permitiu gravar os dados neste computador. Faça backup agora (botão Backup) e não feche esta aba.'); }
  }
  const T = n => (DB[n] = DB[n] || []);
  const nextId = n => { const m = T(n).reduce((a, r) => Math.max(a, +r.id || 0), 0); DB._seq[n] = Math.max(DB._seq[n] || 0, m) + 1; return DB._seq[n]; };
  const REL = /(\w+):(\w+)!(\w+)\(([^)]*)\)/g;
  function from(table) {
    const st = { f: [], ord: [], op: 'sel', rel: [] };
    const q = {
      select(cols) { if (st.op === 'sel' && cols) { let m; REL.lastIndex = 0; while ((m = REL.exec(cols))) st.rel.push({ alias: m[1], tab: m[2], fk: m[3], cols: m[4].split(',').map(s => s.trim()) }); } return q; },
      order(col, o) { st.ord.push([col, !(o && o.ascending === false)]); return q; },
      range(a, b) { st.range = [a, b]; return q; },
      limit(n) { st.range = [0, n - 1]; return q; },
      eq(k, v) { st.f.push(r => String(r[k]) === String(v)); return q; },
      in(k, vs) { st.f.push(r => vs.map(String).includes(String(r[k]))); return q; },
      insert(rows) { st.op = 'ins'; st.p = [].concat(rows); return q; },
      update(p) { st.op = 'upd'; st.p = p; return q; },
      delete() { st.op = 'del'; return q; },
      upsert(r) { st.op = 'ups'; st.p = r; return q; },
      then(a, b) { return Promise.resolve().then(run).then(a, b); }
    };
    function run() {
      const rows = T(table), hit = r => st.f.every(f => f(r));
      if (st.op === 'ins') { st.p.forEach(r => rows.push(Object.assign({ id: nextId(table), created_at: new Date().toISOString() }, r))); save(); return { data: null, error: null }; }
      if (st.op === 'upd') { rows.filter(hit).forEach(r => Object.assign(r, st.p)); save(); return { data: null, error: null }; }
      if (st.op === 'del') { DB[table] = rows.filter(r => !hit(r)); save(); return { data: null, error: null }; }
      if (st.op === 'ups') { const i = rows.findIndex(r => r.chave === st.p.chave); if (i >= 0) rows[i] = st.p; else rows.push(st.p); save(); return { data: null, error: null }; }
      let out = rows.filter(hit).map(r => Object.assign({}, r));
      st.ord.slice().reverse().forEach(([c, asc]) => out.sort((a, b) => { const x = a[c], y = b[c]; if (x === y) return 0; if (x == null) return 1; if (y == null) return -1; return (x > y ? 1 : -1) * (asc ? 1 : -1); }));
      if (st.range) out = out.slice(st.range[0], st.range[1] + 1);
      if (st.rel.length) out.forEach(r => st.rel.forEach(rl => { const o = T(rl.tab).find(x => String(x.id) === String(r[rl.fk])); r[rl.alias] = o ? rl.cols.reduce((a, c) => (a[c] = o[c], a), {}) : null; }));
      return { data: out, error: null };
    }
    return q;
  }
  window.supabase = { createClient: () => ({ from }) };

  /* ---------- faixa de contingência + backup + atualização pela internet ---------- */
  const SUPA = 'https://knylwzxpatuhaegxddak.supabase.co', ANON = window.__ANON || '';
  function bar() {
    const d = document.createElement('div');
    d.id = 'offBar';
    d.style.cssText = 'background:#fde68a;color:#78350f;font:600 13px Inter,Arial,sans-serif;padding:8px 14px;display:flex;flex-wrap:wrap;gap:8px 14px;align-items:center;justify-content:center;text-align:center;border-bottom:2px solid #f59e0b';
    d.innerHTML = '<span>MODO CONTINGÊNCIA (sem internet). Os dados ficam só neste computador e navegador. Abra sempre este mesmo arquivo, do mesmo lugar.</span>' +
      '<button id="offExp" style="font:inherit;padding:4px 10px;border:1px solid #b45309;border-radius:6px;background:#fff;cursor:pointer">Backup (baixar)</button>' +
      '<button id="offImp" style="font:inherit;padding:4px 10px;border:1px solid #b45309;border-radius:6px;background:#fff;cursor:pointer">Restaurar backup</button>' +
      '<button id="offUpd" style="font:inherit;padding:4px 10px;border:1px solid #b45309;border-radius:6px;background:#fff;cursor:pointer" title="Só funciona com internet">Atualizar cadastros (com internet)</button>' +
      '<input type="file" id="offFile" accept=".json" hidden>';
    document.body.insertBefore(d, document.body.firstChild);
    d.querySelector('#offExp').onclick = () => {
      const blob = new Blob([JSON.stringify(DB)], { type: 'application/json' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
      a.download = 'SGDM_backup_' + new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-') + '.json'; a.click();
    };
    d.querySelector('#offImp').onclick = () => d.querySelector('#offFile').click();
    d.querySelector('#offFile').onchange = e => {
      const f = e.target.files[0]; if (!f) return;
      const r = new FileReader();
      r.onload = () => { try { const j = JSON.parse(r.result); if (typeof j !== 'object' || !j._seq) throw 0; if (!confirm('Restaurar este backup? Os dados atuais deste computador serão substituídos.')) return; localStorage.setItem(KEY, JSON.stringify(j)); location.reload(); } catch (x) { alert('Arquivo de backup inválido.'); } };
      r.readAsText(f);
    };
    d.querySelector('#offUpd').onclick = async () => {
      if (!ANON) return alert('Atualização indisponível nesta versão.');
      const get = async t => { const r = await fetch(`${SUPA}/rest/v1/${t}?select=*`, { headers: { apikey: ANON, Authorization: 'Bearer ' + ANON } }); if (!r.ok) throw new Error(t + ' ' + r.status); return r.json(); };
      try {
        const [c, m, a, ci] = await Promise.all([get('sgdm_config'), get('sgdm_medicos'), get('sgdm_apac_modelos'), get('cirurgioes')]);
        DB.sgdm_config = c; DB.sgdm_medicos = m; DB.sgdm_apac_modelos = a; DB.cirurgioes = ci; save();
        alert('Cadastros atualizados: ' + m.length + ' médicos, ' + a.length + ' modelos de APAC, ' + ci.length + ' cirurgiões.'); location.reload();
      } catch (e) { alert('Sem internet ou servidor indisponível. Os cadastros locais foram mantidos.'); }
    };
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bar); else bar();
})();
