/* Controle de Cirurgias (SCC): lançamento, dashboard, relatórios e cadastro de cirurgiões. Mesmas tabelas do SCC atual. */
const SC = { tab: 'dash', loaded: false, loading: false, cirurgioes: [], list: [], filter: 'month', start: '', end: '', q: '', msg: null };
const META_MES = 100;
const fdate = d => d ? new Date(d + 'T12:00:00').toLocaleDateString('pt-BR') : '';
const ymOf = d => String(d).slice(0, 7);
const SEL = 'id,paciente,data,numero_mes,cirurgiao_id,auxiliar1_id,auxiliar2_id,observacoes,cirurgiao:cirurgioes!cirurgiao_id(nome),auxiliar1:cirurgioes!auxiliar1_id(nome),auxiliar2:cirurgioes!auxiliar2_id(nome)';

async function sccLoad(force) {
  if (SC.loaded && !force) return;
  const c = getDb();
  if (!c) { toast('Sem conexão com o banco.'); return; }
  SC.loading = true;
  const r1 = await c.from('cirurgioes').select('id,nome').order('nome');
  SC.cirurgioes = r1.data || [];
  const all = [];
  for (let from = 0; ; from += 1000) {
    const r = await c.from('cirurgias').select(SEL).order('data', { ascending: false }).order('numero_mes', { ascending: false }).range(from, from + 999);
    if (r.error) { toast('Erro ao carregar cirurgias: ' + r.error.message); break; }
    all.push(...(r.data || []));
    if (!r.data || r.data.length < 1000) break;
  }
  SC.list = all; SC.loaded = true; SC.loading = false;
}
const sccHoje = () => isoHoje();
function sccFiltered() {
  const hoje = sccHoje(), ym = hoje.slice(0, 7);
  const d = new Date(); const ant = new Date(d.getFullYear(), d.getMonth() - 1, 1);
  const ymAnt = ant.getFullYear() + '-' + String(ant.getMonth() + 1).padStart(2, '0');
  let l = SC.list;
  if (SC.filter === 'today') l = l.filter(c => c.data === hoje);
  else if (SC.filter === 'month') l = l.filter(c => ymOf(c.data) === ym);
  else if (SC.filter === 'prev') l = l.filter(c => ymOf(c.data) === ymAnt);
  else if (SC.filter === 'year') l = l.filter(c => String(c.data).slice(0, 4) === hoje.slice(0, 4));
  else if (SC.filter === 'custom') l = l.filter(c => (!SC.start || c.data >= SC.start) && (!SC.end || c.data <= SC.end));
  return l;
}
function sccStats(list) {
  const st = {};
  const add = (n, k) => { if (!n) return; (st[n] = st[n] || { principal: 0, auxiliar: 0, total: 0 })[k]++; st[n].total++; };
  list.forEach(c => { add(c.cirurgiao && c.cirurgiao.nome, 'principal'); add(c.auxiliar1 && c.auxiliar1.nome, 'auxiliar'); add(c.auxiliar2 && c.auxiliar2.nome, 'auxiliar'); });
  return Object.entries(st).sort((a, b) => b[1].total - a[1].total);
}
const sccSort = l => [...l].sort((a, b) => a.data === b.data ? (b.numero_mes || 0) - (a.numero_mes || 0) : (a.data < b.data ? 1 : -1));
const nm = o => (o && o.nome) || '-';

/* numeração mensal sequencial por data; só atualiza o que mudou */
async function sccRenumber(months) {
  const c = getDb();
  for (const ym of months) {
    const rows = SC.list.filter(x => ymOf(x.data) === ym).sort((a, b) => a.data === b.data ? (a.id - b.id) : (a.data < b.data ? -1 : 1));
    for (let i = 0; i < rows.length; i++) {
      if (rows[i].numero_mes !== i + 1) { await c.from('cirurgias').update({ numero_mes: i + 1 }).eq('id', rows[i].id); rows[i].numero_mes = i + 1; }
    }
  }
}

/* ---------- telas ---------- */
function cirOpts(sel, first) { return `<option value="">${first}</option>` + SC.cirurgioes.map(c => `<option value="${c.id}" ${String(sel) === String(c.id) ? 'selected' : ''}>${esc(c.nome)}</option>`).join(''); }
function sccNotice(type, text) {
  SC.msg = { type, text };
  clearTimeout(sccNotice.t);
  sccNotice.t = setTimeout(() => { SC.msg = null; const b = $('#scBanner'); if (b) b.remove(); }, 9000);
}
const sccBanner = () => SC.msg ? `<div id="scBanner" class="banner ${SC.msg.type}" role="status"><span class="ms">${SC.msg.type === 'ok' ? 'check_circle' : 'error'}</span><div>${SC.msg.text}</div></div>` : '';
function renderCirurgias() {
  const tabs = `<div class="sub" role="tablist">${[['dash', 'Dashboard'], ['lanc', 'Lançamento'], ['cir', 'Cirurgiões']].map(([k, l]) => `<button role="tab" aria-selected="${SC.tab === k}" data-sctab="${k}">${l}</button>`).join('')}</div>` + sccBanner();
  if (!SC.loaded) {
    $('#view').innerHTML = tabs + '<div class="empty">Carregando…</div>';
    if (!SC.loading) sccLoad().then(() => { if (S.mod === 'cir') renderCirurgias(); });
    return;
  }
  if (SC.tab === 'lanc') return sccLanc(tabs);
  if (SC.tab === 'cir') return sccCir(tabs);
  sccDash(tabs);
}
function sccLanc(tabs) {
  $('#view').innerHTML = tabs + `<div class="card" style="max-width:640px"><form id="scForm" class="sec"><h4><span class="ms" style="font-size:16px">edit_note</span>Registrar nova cirurgia</h4><div class="stack">
    <div><label for="scP">Nome do paciente *</label><input id="scP" required autocomplete="off"></div>
    <div class="row"><div><label for="scD">Data da cirurgia *</label><input id="scD" type="date" required value="${sccHoje()}"></div></div>
    <div><label for="scC">Cirurgião principal *</label><select id="scC" required>${cirOpts('', 'Selecione')}</select></div>
    <div class="row"><div><label for="scA1">1º auxiliar</label><select id="scA1">${cirOpts('', 'Nenhum')}</select></div><div><label for="scA2">2º auxiliar</label><select id="scA2">${cirOpts('', 'Nenhum')}</select></div></div>
    <div><label for="scO">Observações</label><textarea id="scO" rows="3"></textarea></div>
    ${SC.cirurgioes.length ? '' : '<div class="chipbar"><span class="ms">info</span>Cadastre os cirurgiões na aba "Cirurgiões" antes de lançar.</div>'}
    <div><button class="btn" type="submit"><span class="ms">check_circle</span>Salvar cirurgia</button></div></div></form></div>`;
}
function sccDash(tabs) {
  const hoje = sccHoje(), ym = hoje.slice(0, 7);
  const nHoje = SC.list.filter(c => c.data === hoje).length, nMes = SC.list.filter(c => ymOf(c.data) === ym).length;
  const fl = sccFiltered(), stats = sccStats(fl);
  const F = [['today', 'Hoje'], ['month', 'Este mês'], ['prev', 'Mês anterior'], ['year', 'Este ano'], ['custom', 'Personalizado']];
  $('#view').innerHTML = tabs + `<div class="kpis"><div class="kpi"><b>${SC.list.length}</b><span>no total</span></div><div class="kpi"><b>${nHoje}</b><span>cirurgias hoje</span></div><div class="kpi"><b>${nMes}</b><span>no mês<div class="bar"><i style="width:${Math.min(100, nMes / META_MES * 100)}%"></i></div></span></div><div class="kpi"><b>${Math.max(0, META_MES - nMes)}</b><span>faltam para a meta de ${META_MES}</span></div></div>
  <div class="card"><div class="sec"><div class="row"><div class="fit"><div class="seg">${F.map(([k, l]) => `<button data-scf="${k}" aria-pressed="${SC.filter === k}">${l}</button>`).join('')}</div></div>
  ${SC.filter === 'custom' ? `<div class="fit"><input type="date" id="scS" value="${SC.start}" aria-label="Início"></div><div class="fit"><input type="date" id="scE" value="${SC.end}" aria-label="Fim"></div>` : ''}
  <div style="flex:1 1 180px"><input id="scQ" placeholder="Buscar paciente" value="${esc(SC.q)}" aria-label="Buscar paciente"></div></div></div>
  <div class="sec"><div class="row"><div class="fit"><button class="btn line sm" data-screp="d"><span class="ms">print</span>Relatório diário</button></div><div class="fit"><button class="btn line sm" data-screp="m"><span class="ms">print</span>Relatório mensal</button></div><div class="fit"><button class="btn line sm" data-sccsv><span class="ms">table_view</span>Exportar CSV</button></div><div class="fit"><button class="btn line sm" data-scpdf><span class="ms">picture_as_pdf</span>Exportar PDF</button></div></div></div>
  ${stats.length ? `<div class="sec"><h4>Por cirurgião (filtro aplicado)</h4><div class="grid2">${stats.map(([n, s]) => `<div class="kpi"><span><b style="font-size:15px;letter-spacing:0">${esc(n)}</b></span><b>${s.total}</b><span>principal ${s.principal} · auxiliar ${s.auxiliar}</span></div>`).join('')}</div></div>` : ''}
  <div class="scroll"><table class="tbl"><thead><tr><th>Nº</th><th>Data</th><th>Paciente</th><th>Cirurgião</th><th>1º aux.</th><th>2º aux.</th><th>Obs.</th><th></th></tr></thead><tbody id="scBody">${sccRows()}</tbody></table></div></div>`;
}
function sccRows() {
  const q = norm(SC.q);
  const l = sccSort(sccFiltered()).filter(c => !q || norm(c.paciente).includes(q));
  if (!l.length) return '<tr><td colspan="8" class="empty">Nenhuma cirurgia encontrada.</td></tr>';
  return l.map(c => `<tr><td><b>${c.numero_mes || '-'}</b></td><td>${fdate(c.data)}</td><td>${esc(c.paciente)}</td><td>${esc(nm(c.cirurgiao))}</td><td>${esc(nm(c.auxiliar1))}</td><td>${esc(nm(c.auxiliar2))}</td><td>${esc(c.observacoes || '')}</td><td style="white-space:nowrap;text-align:right"><button class="x" data-scedit="${c.id}" aria-label="Editar"><span class="ms">edit</span></button><button class="x" data-scdel="${c.id}" aria-label="Excluir"><span class="ms">delete</span></button></td></tr>`).join('');
}
function sccCir(tabs) {
  $('#view').innerHTML = tabs + `<div class="card" style="max-width:640px"><form id="scCirForm" class="sec"><h4><span class="ms" style="font-size:16px">badge</span>Cadastrar cirurgião</h4><div class="row"><div style="flex:2 1 240px"><label for="scN">Nome do cirurgião *</label><input id="scN" required autocomplete="off"></div><div class="fit"><button class="btn" type="submit"><span class="ms">add</span>Adicionar</button></div></div></form>
  <div class="sec"><h4>Cirurgiões cadastrados</h4>${SC.cirurgioes.length ? SC.cirurgioes.map(c => `<div class="med-item" style="margin-bottom:6px"><span>${esc(c.nome)}</span><button class="x" data-sccdel="${c.id}" aria-label="Excluir"><span class="ms">delete</span></button></div>`).join('') : '<div class="empty">Nenhum cirurgião cadastrado.</div>'}</div>
  <div class="sec"><h4>Manutenção da numeração</h4><p style="margin:0 0 10px;color:var(--muted);font-size:13px">Se a numeração mensal estiver inconsistente, corrija aqui. O sistema renumera por data, mês a mês.</p><button class="btn line sm" data-scfix><span class="ms">sync</span>Corrigir numeração mensal</button></div></div>`;
}

/* ---------- relatórios ---------- */
const TH = 'border:1px solid #000;padding:5px 6px;text-align:left;font-size:9.5pt;background:#f2f2f2';
const TD = 'border:1px solid #000;padding:5px 6px;font-size:9.5pt';
function repHTML(title, sub, rows, withDate, totalTxt, statsRows, statsHead) {
  const hd = ['Nº', ...(withDate ? ['Data'] : []), 'Paciente', 'Cirurgião principal', '1º auxiliar', '2º auxiliar', 'Observações'];
  return `<div style="font-family:Arial,sans-serif;color:#000"><h1 style="text-align:center;font-size:15pt;margin:0 0 6px">${title}</h1><p style="text-align:center;margin:0 0 16px;font-weight:700">${sub}</p>
  <table style="width:100%;border-collapse:collapse"><thead><tr>${hd.map(h => `<th style="${TH}">${h}</th>`).join('')}</tr></thead><tbody>${rows.length ? rows.map(c => `<tr><td style="${TD}">${c.numero_mes || '-'}</td>${withDate ? `<td style="${TD}">${fdate(c.data)}</td>` : ''}<td style="${TD}">${esc(c.paciente)}</td><td style="${TD}">${esc(nm(c.cirurgiao))}</td><td style="${TD}">${esc(nm(c.auxiliar1))}</td><td style="${TD}">${esc(nm(c.auxiliar2))}</td><td style="${TD}">${esc(c.observacoes || '-')}</td></tr>`).join('') : `<tr><td colspan="${hd.length}" style="${TD};text-align:center">Nenhuma cirurgia registrada</td></tr>`}</tbody></table>
  <p style="margin-top:16px;font-weight:700">${totalTxt}</p>
  ${statsRows.length ? `<h3 style="margin:18px 0 6px;font-size:11pt">Estatísticas por profissional</h3><table style="width:100%;border-collapse:collapse"><thead><tr>${statsHead.map(h => `<th style="${TH}">${h}</th>`).join('')}</tr></thead><tbody>${statsRows.map(r => `<tr>${r.map(v => `<td style="${TD}">${esc(v)}</td>`).join('')}</tr>`).join('')}</tbody></table>` : ''}</div>`;
}
function printReport(kind) {
  let html;
  if (kind === 'd') {
    const hoje = sccHoje(), rows = sccSort(SC.list.filter(c => c.data === hoje));
    const st = sccStats(rows).map(([n, s]) => [n, String(s.total)]);
    html = repHTML('CENSO DIÁRIO DE CIRURGIAS', 'Data: ' + fdate(hoje), rows, false, `Total: ${rows.length} cirurgia(s)`, st, ['Profissional', 'Cirurgias']);
  } else {
    const ym = sccHoje().slice(0, 7), rows = sccSort(SC.list.filter(c => ymOf(c.data) === ym));
    const mes = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    const st = sccStats(rows).map(([n, s]) => [n, String(s.principal), String(s.auxiliar), String(s.total)]);
    html = repHTML('RELATÓRIO MENSAL DE CIRURGIAS', mes.charAt(0).toUpperCase() + mes.slice(1), rows, true, `Total de cirurgias no mês: ${rows.length}${rows.length < META_MES ? ` (${META_MES - rows.length} faltantes para ${META_MES})` : ''}`, st, ['Profissional', 'Como principal', 'Como auxiliar', 'Total']);
  }
  printPages([rawPage({ id: 'rep', label: 'Relatório', cls: 'rawrep', html })]);
}
function exportCsv() {
  const l = sccSort(sccFiltered());
  if (!l.length) return toast('Não há dados para exportar.');
  const q = v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
  let csv = 'Nº;Data;Paciente;Cirurgião principal;1º auxiliar;2º auxiliar;Observações\n' + l.map(c => [c.numero_mes || '-', fdate(c.data), c.paciente, nm(c.cirurgiao), nm(c.auxiliar1), nm(c.auxiliar2), c.observacoes || '-'].map(q).join(';')).join('\n');
  csv += '\n\nESTATÍSTICAS POR PROFISSIONAL (PARA FATURAMENTO)\nProfissional;Como principal;Como auxiliar;Total\n' + sccStats(l).map(([n, s]) => [n, s.principal, s.auxiliar, s.total].join(';')).join('\n');
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })); a.download = 'cirurgias_' + sccHoje() + '.csv'; a.click();
}
function loadScript(src) { return new Promise((ok, no) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = no; document.head.appendChild(s); }); }
async function exportPdf() {
  const l = sccSort(sccFiltered());
  if (!l.length) return toast('Não há dados para exportar.');
  try {
    if (!window.jspdf) await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
    if (!(window.jspdf && window.jspdf.jsPDF.API.autoTable)) await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.31/jspdf.plugin.autotable.min.js');
  } catch (_) { return toast('Não consegui carregar o gerador de PDF. Use "Imprimir" e salve como PDF.'); }
  const doc = new window.jspdf.jsPDF();
  doc.setFontSize(16); doc.text('Relatório de Cirurgias', 105, 15, { align: 'center' });
  doc.autoTable({ head: [['Nº', 'Data', 'Paciente', 'Cirurgião', '1º Aux', '2º Aux', 'Obs']], body: l.map(c => [c.numero_mes || '-', fdate(c.data), c.paciente, nm(c.cirurgiao), nm(c.auxiliar1), nm(c.auxiliar2), c.observacoes || '-']), startY: 25, styles: { fontSize: 8 } });
  const y = doc.lastAutoTable.finalY || 25;
  doc.setFontSize(12); doc.text('ESTATÍSTICAS POR PROFISSIONAL (PARA FATURAMENTO)', 105, y + 10, { align: 'center' });
  doc.autoTable({ head: [['Profissional', 'Principal', 'Auxiliar', 'Total']], body: sccStats(l).map(([n, s]) => [n, String(s.principal), String(s.auxiliar), String(s.total)]), startY: y + 15, styles: { fontSize: 9 } });
  doc.save('cirurgias_' + sccHoje() + '.pdf');
}

/* ---------- ações ---------- */
async function sccSave(e) {
  e.preventDefault();
  const c = getDb(), paciente = $('#scP').value.trim(), data = $('#scD').value, cir = $('#scC').value;
  if (!paciente || !data || !cir) return;
  const btn = $('#scForm button[type=submit]');
  if (SC.list.some(x => x.data === data && norm(x.paciente) === norm(paciente))) { sccNotice('err', 'Este paciente já tem cirurgia registrada nesta data. Nada foi salvo.'); return renderCirurgias(); }
  btn.disabled = true; btn.textContent = 'Salvando…';
  const doMes = SC.list.filter(x => ymOf(x.data) === ymOf(data));
  const numero = doMes.reduce((m, x) => Math.max(m, x.numero_mes || 0), 0) + 1;
  if (numero > META_MES) { sccNotice('err', 'Limite de ' + META_MES + ' cirurgias por mês atingido. Nada foi salvo.'); return renderCirurgias(); }
  const a1 = $('#scA1').value, a2 = $('#scA2').value;
  const { error } = await c.from('cirurgias').insert([{ paciente, data, numero_mes: numero, cirurgiao_id: +cir, auxiliar1_id: a1 ? +a1 : null, auxiliar2_id: a2 ? +a2 : null, observacoes: $('#scO').value.trim() }]);
  if (error) { sccNotice('err', 'Não foi possível salvar: ' + esc(error.message)); return renderCirurgias(); }
  await sccLoad(true); await sccRenumber([ymOf(data)]);
  const novo = SC.list.find(x => x.data === data && norm(x.paciente) === norm(paciente)) || {};
  sccNotice('ok', `<b>Cirurgia lançada com sucesso.</b><br>Nº ${novo.numero_mes || numero} · ${esc(paciente)} · ${fdate(data)}`);
  toast('Cirurgia lançada com sucesso.');
  SC.tab = 'lanc'; renderCirurgias(); window.scrollTo({ top: 0, behavior: 'smooth' });
}
function sccEditModal(id) {
  const c = SC.list.find(x => String(x.id) === String(id)); if (!c) return;
  M.scEdit = c;
  $('#modal').innerHTML = `<div class="modal" role="dialog" aria-modal="true" aria-labelledby="mt"><header><h2 id="mt">Editar cirurgia</h2></header><form id="scEditForm"><div class="mb">
    <div><label for="eP">Paciente *</label><input id="eP" required value="${esc(c.paciente)}"></div><div><label for="eDt">Data *</label><input id="eDt" type="date" required value="${esc(c.data)}"></div>
    <div><label for="eC1">Cirurgião principal *</label><select id="eC1" required>${cirOpts(c.cirurgiao_id, 'Selecione')}</select></div>
    <div class="row"><div><label for="eA1">1º auxiliar</label><select id="eA1">${cirOpts(c.auxiliar1_id, 'Nenhum')}</select></div><div><label for="eA2">2º auxiliar</label><select id="eA2">${cirOpts(c.auxiliar2_id, 'Nenhum')}</select></div></div>
    <div><label for="eO">Observações</label><textarea id="eO" rows="3">${esc(c.observacoes || '')}</textarea></div></div>
    <footer><button type="button" class="btn quiet" data-close>Cancelar</button><button class="btn" type="submit">Salvar</button></footer></form></div>`;
  $('#modal').hidden = false;
}
async function sccEditSave(e) {
  e.preventDefault();
  const c = M.scEdit, data = $('#eDt').value, a1 = $('#eA1').value, a2 = $('#eA2').value;
  const eb = $('#scEditForm button[type=submit]'); eb.disabled = true; eb.textContent = 'Salvando…';
  const novoNome = $('#eP').value.trim();
  const { error } = await getDb().from('cirurgias').update({ paciente: $('#eP').value.trim(), data, cirurgiao_id: +$('#eC1').value, auxiliar1_id: a1 ? +a1 : null, auxiliar2_id: a2 ? +a2 : null, observacoes: $('#eO').value.trim() }).eq('id', c.id);
  if (error) { eb.disabled = false; eb.textContent = 'Salvar'; toast('Não foi possível salvar: ' + error.message); return; }
  const meses = new Set([ymOf(c.data), ymOf(data)]);
  await sccLoad(true); await sccRenumber([...meses]);
  closeModal(); sccNotice('ok', `<b>Cirurgia alterada e salva com sucesso.</b><br>${esc(novoNome)} · ${fdate(data)}`);
  toast('Cirurgia alterada e salva com sucesso.'); renderCirurgias(); window.scrollTo({ top: 0, behavior: 'smooth' });
}

document.addEventListener('submit', e => {
  if (e.target.id === 'scForm') sccSave(e);
  else if (e.target.id === 'scEditForm') sccEditSave(e);
  else if (e.target.id === 'scCirForm') {
    e.preventDefault();
    const n = $('#scN').value.trim(); if (!n) return;
    getDb().from('cirurgioes').insert([{ nome: n }]).then(async ({ error }) => {
      if (error) return toast('Erro: ' + error.message);
      await sccLoad(true); sccNotice('ok', `<b>Cirurgião cadastrado com sucesso.</b><br>${esc(n)}`); toast('Cirurgião cadastrado.'); renderCirurgias();
    });
  }
});
document.addEventListener('click', async e => {
  const t = e.target.closest('button'); if (!t) return;
  const d = t.dataset;
  if (d.sctab) { SC.tab = d.sctab; renderCirurgias(); }
  else if (d.scf) { SC.filter = d.scf; renderCirurgias(); }
  else if (d.screp) printReport(d.screp);
  else if ('sccsv' in d) exportCsv();
  else if ('scpdf' in d) exportPdf();
  else if (d.scedit) sccEditModal(d.scedit);
  else if (d.scdel) {
    if (!confirm('Excluir esta cirurgia?')) return;
    const c = SC.list.find(x => String(x.id) === d.scdel);
    const { error } = await getDb().from('cirurgias').delete().eq('id', d.scdel);
    if (error) return toast('Erro: ' + error.message);
    await sccLoad(true); if (c) await sccRenumber([ymOf(c.data)]);
    sccNotice('ok', '<b>Cirurgia excluída.</b>'); toast('Cirurgia excluída.'); renderCirurgias();
  }
  else if (d.sccdel) {
    if (!confirm('Excluir este cirurgião? As cirurgias dele ficam sem nome.')) return;
    const { error } = await getDb().from('cirurgioes').delete().eq('id', d.sccdel);
    if (error) return toast('Erro: ' + error.message);
    await sccLoad(true); renderCirurgias();
  }
  else if ('scfix' in d) {
    toast('Corrigindo numeração…');
    await sccRenumber([...new Set(SC.list.map(x => ymOf(x.data)))]);
    await sccLoad(true); toast('Numeração corrigida.'); renderCirurgias();
  }
});
document.addEventListener('input', e => {
  const t = e.target;
  if (t.id === 'scQ') { SC.q = t.value; $('#scBody').innerHTML = sccRows(); }
});
document.addEventListener('change', e => {
  const t = e.target;
  if (t.id === 'scS') { SC.start = t.value; renderCirurgias(); }
  else if (t.id === 'scE') { SC.end = t.value; renderCirurgias(); }
});
