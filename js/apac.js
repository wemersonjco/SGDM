/* APAC: formulário oficial com campos editáveis e modelos cadastráveis (tabela sgdm_apac_modelos, compartilhada). */
const APAC_DEFAULTS = [
  { id: 'd1', padrao: true, nome: 'Endoscopia (EDA)', dados: { f15: '02.09.01.003-7', f16: 'ESOFAGOGASTRODUODENOSCOPIA', f17: '1', f33: 'PÓS OPERATÓRIO DE CIRURGIA BARIÁTRICA', f34: 'Z988', f35: '', f37: 'PACIENTE EM PÓS OPERATÓRIO DE CIRURGIA BARIÁTRICA COM NECESSIDADE DE REALIZAR ENDOSCOPIA DIGESTIVA DE CONTROLE.', sec: [] } },
  { id: 'd2', padrao: true, nome: 'Consulta em cirurgia geral', dados: { f15: '', f16: 'CONSULTA EM CIRURGIA GERAL', f17: '1', f33: 'COLELITIASE', f34: 'K802', f35: '', f37: 'ENCAMINHO PACIENTE EM POS OPERATÓRIO DE CIRURGIA BARIATRICA (BYPASS GASTRICO), APRESENTANDO COLELITIASE COM NECESSIDADE DE COLECISTECTOMIA DEVIDO DESVIO INTESTINAL QUE IMPEDE ACESSO A VIA BILIAR VIA ENDOSCÓPICA CONVENCIONAL.', sec: [] } }
];
Object.assign(S, { apacModelos: [], apacSel: '', apacF: null, apacMsg: null });

const apacList = () => (S.apacModelos.length ? S.apacModelos : APAC_DEFAULTS);
function apacClone(d) {
  const o = Object.assign({ f15: '', f16: '', f17: '1', f33: '', f34: '', f35: '', f37: '' }, d || {});
  const sec = (d && d.sec) || [];
  o.sec = Array.from({ length: 5 }, (_, i) => Object.assign({ c: '', n: '', q: '' }, sec[i] || {}));
  return o;
}
function apacSelect(id) {
  const l = apacList(), m = l.find(x => String(x.id) === String(id)) || l[0];
  S.apacSel = String(m.id); S.apacF = apacClone(m.dados);
}
function apacPages() {
  if (!S.apacF) apacSelect(S.apacSel);
  return [rawPage({ id: 'apac', label: 'APAC', cls: 'rawof', html: apacHTML(Object.assign({ nome: pNome().trim(), medico: S.aihMedico, data: dShort() }, S.apacF)) })];
}
async function apacLoad() {
  const r = await getDb().from('sgdm_apac_modelos').select('id,nome,dados').order('id');
  if (r.error) return;
  S.apacModelos = r.data || [];
  if (!S.apacF || !apacList().some(x => String(x.id) === S.apacSel)) apacSelect(S.apacSel);
}
function apNotice(type, text) {
  S.apacMsg = { type, text };
  clearTimeout(apNotice.t);
  apNotice.t = setTimeout(() => { S.apacMsg = null; const b = $('#apBanner'); if (b) b.remove(); }, 9000);
}
const apBanner = () => S.apacMsg ? `<div id="apBanner" class="banner ${S.apacMsg.type}" role="status"><span class="ms">${S.apacMsg.type === 'ok' ? 'check_circle' : 'error'}</span><div>${S.apacMsg.text}</div></div>` : '';

function renderAPAC() {
  if (!S.apacF) apacSelect(S.apacSel);
  const f = S.apacF, cur = apacList().find(x => String(x.id) === S.apacSel), padrao = !!(cur && cur.padrao);
  const I = (k, l, w = '') => `<div style="${w}"><label for="ap-${k}">${l}</label><input id="ap-${k}" data-apf="${k}" value="${esc(f[k])}"></div>`;
  $('#view').innerHTML = apBanner() + `<div class="work"><div class="card">
  <div class="sec"><h4><span class="ms" style="font-size:16px">request_page</span>Modelo de APAC</h4><div class="stack">
    <p style="margin:0;color:var(--muted);font-size:13px">Escolha um modelo e ajuste o que precisar para este paciente. As alterações só valem para esta impressão, a menos que você salve no modelo. O nome do paciente vem da faixa acima. O resto do formulário oficial sai em branco.</p>
    <div class="row"><div style="flex:2 1 240px"><label for="apSel">Modelo</label><select id="apSel">${apacList().map(m => `<option value="${m.id}" ${S.apacSel === String(m.id) ? 'selected' : ''}>${esc(m.nome)}</option>`).join('')}</select></div>
    <div class="fit"><button class="btn quiet sm" data-apact="reset" title="Descartar as alterações e voltar ao modelo"><span class="ms">undo</span>Descartar alterações</button></div></div>
    <div class="row"><div class="fit"><button class="btn line sm" data-apact="novo"><span class="ms">add</span>Salvar como novo modelo</button></div>
    ${padrao ? '' : '<div class="fit"><button class="btn line sm" data-apact="upd"><span class="ms">save</span>Atualizar este modelo</button></div><div class="fit"><button class="btn quiet sm" data-apact="del"><span class="ms">delete</span>Excluir modelo</button></div>'}</div>
    ${padrao ? '<div class="hint">Os modelos padrão não são alterados. Para guardar mudanças, salve como novo modelo.</div>' : ''}</div></div>
  <div class="sec"><h4>Procedimento solicitado</h4><div class="stack">
    <div class="row">${I('f15', '15 · Código do procedimento principal', 'flex:1 1 150px')}${I('f16', '16 · Nome do procedimento principal', 'flex:3 1 260px')}${I('f17', '17 · Qtde.', 'flex:0 1 80px')}</div>
    <details><summary style="cursor:pointer;font-weight:600;font-size:13px;margin-bottom:8px">Procedimentos secundários (18 a 32)</summary><div class="stack">${f.sec.map((r, i) => `<div class="row"><div style="flex:1 1 130px"><label>Código</label><input data-aps="${i}:c" value="${esc(r.c)}"></div><div style="flex:3 1 220px"><label>Nome</label><input data-aps="${i}:n" value="${esc(r.n)}"></div><div style="flex:0 1 70px"><label>Qtde.</label><input data-aps="${i}:q" value="${esc(r.q)}"></div></div>`).join('')}</div></details></div></div>
  <div class="sec"><h4>Justificativa</h4><div class="stack">
    <div class="row">${I('f33', '33 · Descrição do diagnóstico', 'flex:3 1 260px')}${I('f34', '34 · CID-10 principal', 'flex:1 1 100px')}${I('f35', '35 · CID-10 secundário', 'flex:1 1 100px')}</div>
    <div><label for="ap-f37">37 · Observações</label><textarea id="ap-f37" data-apf="f37" rows="5">${esc(f.f37)}</textarea></div></div></div>
  <div class="sec">${medSelect('medSelAih', 'Profissional solicitante')}</div>
  <div class="actions"><button class="btn" id="printApac"><span class="ms">print</span>Imprimir</button></div></div>
  <div class="sheet-wrap"><div id="sheet"></div><div class="hint"><span class="ms" style="font-size:16px">info</span>Nada do paciente é gravado. Só os modelos são salvos.</div></div></div>`;
  refreshPreview();
}
const apDados = () => {
  const d = clone(S.apacF);
  d.sec = d.sec.filter(r => r.c || r.n || r.q);
  return d;
};
document.addEventListener('click', async e => {
  const t = e.target.closest('button[data-apact]'); if (!t) return;
  const a = t.dataset.apact, c = getDb();
  if (a === 'reset') { apacSelect(S.apacSel); renderAPAC(); return; }
  if (a === 'novo') {
    const base = (apacList().find(x => String(x.id) === S.apacSel) || {}).nome || '';
    const nome = (prompt('Nome do novo modelo (ex.: Colonoscopia, Consulta em cardiologia):', base ? base + ' (cópia)' : '') || '').trim();
    if (!nome) return;
    const r = await c.from('sgdm_apac_modelos').insert([{ nome, dados: apDados() }]);
    if (r.error) { apNotice('err', 'Não foi possível salvar o modelo: ' + esc(r.error.message)); return renderAPAC(); }
    const keep = clone(S.apacF); await apacLoad();
    const novo = S.apacModelos.filter(x => x.nome === nome).pop();
    if (novo) { S.apacSel = String(novo.id); S.apacF = keep; }
    apNotice('ok', `<b>Modelo "${esc(nome)}" salvo com sucesso.</b><br>Já aparece para todos os médicos.`); toast('Modelo salvo com sucesso.');
    renderAPAC(); window.scrollTo({ top: 0, behavior: 'smooth' });
  } else if (a === 'upd') {
    const m = S.apacModelos.find(x => String(x.id) === S.apacSel); if (!m) return;
    if (!confirm('Atualizar o modelo "' + m.nome + '" com os dados desta tela? Vale para todos os médicos.')) return;
    const r = await c.from('sgdm_apac_modelos').update({ dados: apDados() }).eq('id', m.id);
    if (r.error) { apNotice('err', 'Não foi possível atualizar o modelo: ' + esc(r.error.message)); return renderAPAC(); }
    const keep = clone(S.apacF); await apacLoad(); S.apacF = keep;
    apNotice('ok', `<b>Modelo "${esc(m.nome)}" atualizado com sucesso.</b>`); toast('Modelo atualizado.');
    renderAPAC(); window.scrollTo({ top: 0, behavior: 'smooth' });
  } else if (a === 'del') {
    const m = S.apacModelos.find(x => String(x.id) === S.apacSel); if (!m) return;
    if (!confirm('Excluir o modelo "' + m.nome + '"? Isso vale para todos os médicos.')) return;
    const r = await c.from('sgdm_apac_modelos').delete().eq('id', m.id);
    if (r.error) { apNotice('err', 'Não foi possível excluir: ' + esc(r.error.message)); return renderAPAC(); }
    S.apacF = null; S.apacSel = ''; await apacLoad(); apacSelect('');
    apNotice('ok', `<b>Modelo "${esc(m.nome)}" excluído.</b>`); toast('Modelo excluído.'); renderAPAC();
  }
});
document.addEventListener('change', e => { if (e.target.id === 'apSel') { apacSelect(e.target.value); renderAPAC(); } });
document.addEventListener('input', e => {
  const t = e.target;
  if (t.dataset && t.dataset.apf) { S.apacF[t.dataset.apf] = t.value; refreshPreview(); }
  else if (t.dataset && t.dataset.aps) { const [i, k] = t.dataset.aps.split(':'); S.apacF.sec[+i][k] = t.value; refreshPreview(); }
});
