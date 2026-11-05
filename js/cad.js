/* Cadastros: listas, modelos de texto e dados das unidades (compartilhados via Supabase, tabela sgdm_config) e perfil do médico (neste navegador). */
const clone = o => JSON.parse(JSON.stringify(o));
const DEF = {
  meds: clone(OPT_MEDS), ctrl: clone(OPT_MEDS_CTRL), exames: clone(OPT_EXAMES),
  grupos: { PREDEFS: clone(PREDEFS), DESCRICOES: clone(DESCRICOES), EVOLUCOES: clone(EVOLUCOES), BIZUARIO: clone(BIZUARIO) },
  units: clone(UNITS_DEFAULT), estab: { nome: HOSP, nomeApac: HOSP_APAC, cnes: CNES_HOSP }
};
const GRUPOS = { PREDEFS: PREDEFS, DESCRICOES: DESCRICOES, EVOLUCOES: EVOLUCOES, BIZUARIO: BIZUARIO };
const GRUPO_NOME = { PREDEFS: 'Receitas, atestados, encaminhamentos e orientações', DESCRICOES: 'Descrições cirúrgicas', EVOLUCOES: 'Evoluções', BIZUARIO: 'Bizuário do ambulatório' };
const GRUPO_LABELS = () => ({
  PREDEFS: Object.fromEntries(Object.values(PREDEF_OPTS).flat().concat([['pos_op', 'Atestado pós-operatório']])),
  DESCRICOES: Object.fromEntries(DESC_OPTS), EVOLUCOES: Object.fromEntries(EVO_OPTS), BIZUARIO: Object.fromEntries(BIZ_OPTS)
});
const CFG = { tab: 'medicos', editId: null, grupo: 'PREDEFS', modelo: 'pos_op_gastro', modelos: {}, msg: null, loaded: false };

function setList(target, pairs) { target.splice(0, target.length, ...pairs); }
function applyConfig(m) {
  if (m.meds) setList(OPT_MEDS, m.meds);
  if (m.meds_ctrl) setList(OPT_MEDS_CTRL, m.meds_ctrl);
  if (m.exames) setList(OPT_EXAMES, m.exames);
  if (m.modelos) { CFG.modelos = m.modelos; Object.entries(m.modelos).forEach(([g, o]) => GRUPOS[g] && Object.assign(GRUPOS[g], o)); }
  if (m.unidades) Object.keys(m.unidades).forEach(u => UNITS[u] && Object.assign(UNITS[u], m.unidades[u]));
  if (m.estab) { if (m.estab.nome) { HOSP = m.estab.nome; HOSP_APAC = m.estab.nome; } if (m.estab.cnes) CNES_HOSP = m.estab.cnes; }
}
async function cfgLoad() {
  try { await cfgLoadInner(); } catch (_) { /* sem configuração compartilhada: segue com os padrões */ }
}
async function cfgLoadInner() {
  const c = getDb(); if (!c) return;
  const [r, rm] = await Promise.all([c.from('sgdm_config').select('chave,valor'), c.from('sgdm_medicos').select('id,nome,assinatura').order('nome')]);
  if (!r.error) { const m = {}; (r.data || []).forEach(x => { m[x.chave] = x.valor; }); applyConfig(m); CFG.loaded = true; }
  if (!rm.error) { S.medicos = rm.data || []; if (!S.medicos.some(x => String(x.id) === String(S.medicoId))) S.medicoId = ''; applyMedico(); }
  if (['docs', 'cad', 'aih', 'apac'].includes(S.mod)) { const a = document.activeElement; if (!a || a === document.body || a.tagName === 'BUTTON') render(); }
}
async function reloadMedicos() {
  const r = await getDb().from('sgdm_medicos').select('id,nome,assinatura').order('nome');
  if (!r.error) { S.medicos = r.data || []; if (!S.medicos.some(x => String(x.id) === String(S.medicoId))) { S.medicoId = ''; LS.set('sgdm3_medico_id', ''); } applyMedico(); }
}
async function cfgSave(chave, valor) {
  const r = await getDb().from('sgdm_config').upsert({ chave, valor, atualizado_em: new Date().toISOString() });
  return r.error;
}
function cadNotice(type, text) {
  CFG.msg = { type, text };
  clearTimeout(cadNotice.t);
  cadNotice.t = setTimeout(() => { CFG.msg = null; const b = $('#cadBanner'); if (b) b.remove(); }, 9000);
}
const cadBanner = () => CFG.msg ? `<div id="cadBanner" class="banner ${CFG.msg.type}" role="status"><span class="ms">${CFG.msg.type === 'ok' ? 'check_circle' : 'error'}</span><div>${CFG.msg.text}</div></div>` : '';
async function cadDone(erro, okText) {
  if (erro) cadNotice('err', 'Não foi possível salvar: ' + esc(erro.message) + '. Nada foi alterado para os outros usuários.');
  else { cadNotice('ok', okText); toast('Salvo com sucesso.'); }
  renderCad(); window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ---------- telas ---------- */
const lines = txt => txt.split('\n').map(x => x.trim()).filter(Boolean);
function renderCad() {
  const tabs = `<div class="sub" role="tablist">${[['medicos', 'Médicos'], ['listas', 'Medicamentos e exames'], ['modelos', 'Modelos de texto'], ['unid', 'Unidades']].map(([k, l]) => `<button role="tab" aria-selected="${CFG.tab === k}" data-cadtab="${k}">${l}</button>`).join('')}</div>` + cadBanner();
  const shared = '<p style="margin:0;color:var(--muted);font-size:13px">Compartilhado: a alteração vale para todos os médicos que usam o sistema.</p>';
  if (CFG.tab === 'medicos') {
    const ed = S.medicos.find(m => String(m.id) === String(CFG.editId));
    $('#view').innerHTML = tabs + `<div class="work"><div class="card"><div class="sec"><h4><span class="ms" style="font-size:16px">badge</span>Médicos cadastrados</h4><div class="stack">${shared}
      ${S.medicos.length ? S.medicos.map(m => `<div class="med-item"><span><b>${esc(m.nome)}</b><br>${esc((m.assinatura || '').replace(/\n/g, ' · '))}</span><button class="x" data-cadedit="${m.id}" aria-label="Editar"><span class="ms">edit</span></button><button class="x" data-caddel="${m.id}" aria-label="Excluir"><span class="ms">delete</span></button></div>`).join('') : '<div class="empty">Nenhum médico cadastrado ainda.</div>'}</div></div></div>
      <div class="card"><div class="sec"><h4><span class="ms" style="font-size:16px">${ed ? 'edit' : 'person_add'}</span>${ed ? 'Editar médico' : 'Novo médico'}</h4><div class="stack">
      <div><label for="pfMed">Nome (aparece como profissional solicitante na AIH e APAC)</label><input id="pfMed" value="${esc(ed ? ed.nome : '')}" placeholder="Nome como no cadastro do hospital"></div>
      <div><label for="pfDoc">Assinatura nos documentos</label><textarea id="pfDoc" rows="3" placeholder="Nome, especialidade, CRM e RQE (uma linha por item)">${esc(ed ? ed.assinatura : '')}</textarea></div>
      <div class="row"><div class="fit"><button class="btn" data-cadsave="medico"><span class="ms">save</span>${ed ? 'Salvar alterações' : 'Cadastrar médico'}</button></div>${ed ? '<div class="fit"><button class="btn quiet" data-cadtab="medicos" data-canceledit>Cancelar</button></div>' : ''}</div></div></div></div></div>`;
  } else if (CFG.tab === 'listas') {
    const L = (id, t, list) => `<div><label for="${id}">${t} <span style="font-weight:400">(${list.length} itens, um por linha)</span></label><textarea id="${id}" rows="12" style="font-size:12.5px">${esc(list.map(x => x[1]).join('\n'))}</textarea></div>`;
    $('#view').innerHTML = tabs + `<div class="card"><div class="sec"><h4><span class="ms" style="font-size:16px">medication</span>Medicamentos e exames</h4><div class="stack">${shared}
      <p style="margin:0;color:var(--muted);font-size:13px">Use o formato "NOME - posologia". O texto antes do primeiro " - " vira o título do medicamento na receita. Exames: "CÓDIGO - NOME".</p>
      ${L('lsMeds', 'Medicamentos (receita médica)', OPT_MEDS)}${L('lsCtrl', 'Medicamentos (receituário controlado)', OPT_MEDS_CTRL)}${L('lsEx', 'Exames', OPT_EXAMES)}</div></div>
      <div class="actions"><button class="btn quiet" data-cadreset="listas">Restaurar padrão</button><button class="btn" data-cadsave="listas"><span class="ms">save</span>Salvar listas</button></div></div>`;
  } else if (CFG.tab === 'modelos') {
    const labs = GRUPO_LABELS()[CFG.grupo], keys = Object.keys(GRUPOS[CFG.grupo]);
    if (!keys.includes(CFG.modelo)) CFG.modelo = keys[0];
    const alterado = CFG.modelos[CFG.grupo] && CFG.modelos[CFG.grupo][CFG.modelo] != null;
    $('#view').innerHTML = tabs + `<div class="card"><div class="sec"><h4><span class="ms" style="font-size:16px">article</span>Modelos de texto</h4><div class="stack">${shared}
      <div class="row"><div><label for="mdG">Grupo</label><select id="mdG">${Object.entries(GRUPO_NOME).map(([k, l]) => `<option value="${k}" ${CFG.grupo === k ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
      <div style="flex:2 1 260px"><label for="mdM">Modelo</label><select id="mdM">${keys.map(k => `<option value="${k}" ${CFG.modelo === k ? 'selected' : ''}>${esc(labs[k] || k)}</option>`).join('')}</select></div></div>
      ${alterado ? '<div class="chipbar"><span class="ms">edit</span>Este modelo foi alterado em relação ao padrão.</div>' : ''}
      ${CFG.modelo === 'pos_op_gastro' ? '<div class="chipbar"><span class="ms">vaccines</span>O bloco da enoxaparina (item 1 de "USO INJETÁVEL") é trocado automaticamente pelo protocolo de IMC e TEV. Mantenha esse item.</div>' : ''}
      <textarea id="mdT" rows="20" aria-label="Texto do modelo">${esc(GRUPOS[CFG.grupo][CFG.modelo])}</textarea></div></div>
      <div class="actions"><button class="btn quiet" data-cadreset="modelo">Restaurar padrão</button><button class="btn" data-cadsave="modelo"><span class="ms">save</span>Salvar modelo</button></div></div>`;
  } else {
    const U = (u, nome) => `<div class="sec"><h4><span class="ms" style="font-size:16px">apartment</span>${nome}</h4><div class="stack">
      <div><label for="un-${u}-cab">Cabeçalho do documento (uma linha por item; vazio = sem cabeçalho)</label><textarea id="un-${u}-cab" rows="3">${esc(UNITS[u].cab)}</textarea></div>
      <div><label for="un-${u}-em">Identificação do emitente (receituário controlado)</label><textarea id="un-${u}-em" rows="4">${esc(UNITS[u].emitente)}</textarea></div>
      <div><label for="un-${u}-rod">Rodapé (vazio = sem rodapé)</label><input id="un-${u}-rod" value="${esc(UNITS[u].rodape)}"></div>
      <div><label for="un-${u}-cid">Cidade e UF na data</label><input id="un-${u}-cid" value="${esc(UNITS[u].cidade)}"></div></div></div>`;
    $('#view').innerHTML = tabs + `<div class="card">${shared.replace('<p', '<p class="sec"')}${U('metro', 'Hospital Metropolitano')}${U('ioci', 'Clínica IOCI')}
      <div class="sec"><h4><span class="ms" style="font-size:16px">local_hospital</span>Estabelecimento nos formulários AIH e APAC</h4><div class="row"><div style="flex:3 1 280px"><label for="esN">Nome</label><input id="esN" value="${esc(HOSP)}"></div><div><label for="esC">CNES</label><input id="esC" value="${esc(CNES_HOSP)}"></div></div></div>
      <div class="actions"><button class="btn quiet" data-cadreset="unid">Restaurar padrão</button><button class="btn" data-cadsave="unid"><span class="ms">save</span>Salvar unidades</button></div></div>`;
  }
}

/* ---------- ações ---------- */
const toPairs = (txt, special) => lines(txt).map(l => { const k = special && Object.keys(MEDS_SPECIAL).find(x => MEDS_SPECIAL[x].nome === l); return [k || l, l]; });
document.addEventListener('click', async e => {
  const t = e.target.closest('button'); if (!t) return;
  const d = t.dataset;
  if (d.cadtab) { CFG.tab = d.cadtab; if ('canceledit' in d) CFG.editId = null; renderCad(); }
  else if (d.cadedit) { CFG.editId = d.cadedit; renderCad(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  else if (d.caddel) {
    const m = S.medicos.find(x => String(x.id) === d.caddel);
    if (!m || !confirm('Excluir ' + m.nome + '? Isso vale para todos os usuários.')) return;
    const r = await getDb().from('sgdm_medicos').delete().eq('id', d.caddel);
    if (!r.error) await reloadMedicos();
    cadDone(r.error, '<b>Médico excluído.</b>');
  }
  else if (d.cadsave) {
    t.disabled = true;
    if (d.cadsave === 'medico') {
      const nome = $('#pfMed').value.trim(), ass = $('#pfDoc').value.trim();
      if (!nome) { t.disabled = false; return toast('Informe o nome do médico.'); }
      const c = getDb(), ed = CFG.editId;
      const r = ed ? await c.from('sgdm_medicos').update({ nome, assinatura: ass }).eq('id', ed) : await c.from('sgdm_medicos').insert([{ nome, assinatura: ass }]);
      if (!r.error) { CFG.editId = null; await reloadMedicos(); }
      cadDone(r.error, `<b>${ed ? 'Médico atualizado' : 'Médico cadastrado'} com sucesso.</b><br>${esc(nome)}`);
    } else if (d.cadsave === 'listas') {
      const meds = toPairs($('#lsMeds').value, true), ctrl = toPairs($('#lsCtrl').value), ex = toPairs($('#lsEx').value);
      const errs = [await cfgSave('meds', meds), await cfgSave('meds_ctrl', ctrl), await cfgSave('exames', ex)].find(Boolean);
      if (!errs) { setList(OPT_MEDS, meds); setList(OPT_MEDS_CTRL, ctrl); setList(OPT_EXAMES, ex); }
      cadDone(errs, `<b>Listas salvas com sucesso.</b><br>${meds.length} medicamentos, ${ctrl.length} controlados, ${ex.length} exames.`);
    } else if (d.cadsave === 'modelo') {
      const g = CFG.grupo, k = CFG.modelo, txt = $('#mdT').value;
      const novo = clone(CFG.modelos); novo[g] = Object.assign({}, novo[g], { [k]: txt });
      const er = await cfgSave('modelos', novo);
      if (!er) { CFG.modelos = novo; GRUPOS[g][k] = txt; }
      cadDone(er, '<b>Modelo salvo com sucesso.</b><br>Já vale para todos os médicos.');
    } else if (d.cadsave === 'unid') {
      const un = {};
      ['metro', 'ioci'].forEach(u => { un[u] = { cab: $(`#un-${u}-cab`).value.trim(), emitente: $(`#un-${u}-em`).value.trim(), rodape: $(`#un-${u}-rod`).value.trim(), cidade: $(`#un-${u}-cid`).value.trim() }; });
      const es = { nome: $('#esN').value.trim() || DEF.estab.nome, cnes: $('#esC').value.trim() || DEF.estab.cnes };
      const er = (await cfgSave('unidades', un)) || (await cfgSave('estab', es));
      if (!er) { Object.keys(un).forEach(u => Object.assign(UNITS[u], un[u])); HOSP = HOSP_APAC = es.nome; CNES_HOSP = es.cnes; }
      cadDone(er, '<b>Dados das unidades salvos com sucesso.</b>');
    }
  }
  else if (d.cadreset) {
    if (!confirm('Restaurar o padrão original? A alteração vale para todos os médicos.')) return;
    let er;
    if (d.cadreset === 'listas') {
      er = (await cfgSave('meds', DEF.meds)) || (await cfgSave('meds_ctrl', DEF.ctrl)) || (await cfgSave('exames', DEF.exames));
      if (!er) { setList(OPT_MEDS, clone(DEF.meds)); setList(OPT_MEDS_CTRL, clone(DEF.ctrl)); setList(OPT_EXAMES, clone(DEF.exames)); }
    } else if (d.cadreset === 'modelo') {
      const g = CFG.grupo, k = CFG.modelo, novo = clone(CFG.modelos);
      if (novo[g]) delete novo[g][k];
      er = await cfgSave('modelos', novo);
      if (!er) { CFG.modelos = novo; GRUPOS[g][k] = DEF.grupos[g][k]; }
    } else {
      er = (await cfgSave('unidades', DEF.units)) || (await cfgSave('estab', { nome: DEF.estab.nome, cnes: DEF.estab.cnes }));
      if (!er) { Object.keys(DEF.units).forEach(u => Object.assign(UNITS[u], DEF.units[u])); HOSP = DEF.estab.nome; HOSP_APAC = DEF.estab.nomeApac; CNES_HOSP = DEF.estab.cnes; }
    }
    cadDone(er, '<b>Padrão original restaurado.</b>');
  }
});
document.addEventListener('change', e => {
  const t = e.target;
  if (t.id === 'mdG') { CFG.grupo = t.value; CFG.modelo = Object.keys(GRUPOS[t.value])[0]; renderCad(); }
  else if (t.id === 'mdM') { CFG.modelo = t.value; renderCad(); }
});
if (!$('#app').hidden) cfgLoad();
