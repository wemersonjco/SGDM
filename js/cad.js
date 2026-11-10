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
const CFG = { custom: [], extra: [], tab: 'medicos', editId: null, grupo: 'PREDEFS', modelo: 'pos_op_gastro', modelos: {}, msg: null, loaded: false };

/* modelos de texto cadastrados pelos médicos */
const TIPOS_NOVO = [['receita', 'Receita médica', 'PREDEFS'], ['controlado', 'Receituário controlado', 'PREDEFS'], ['atestado', 'Atestado médico', 'PREDEFS'], ['encaminhamento', 'Encaminhamento', 'PREDEFS'], ['orientacoes', 'Orientações ao paciente', 'PREDEFS'], ['descricoes', 'Descrição cirúrgica', 'DESCRICOES'], ['evolucao', 'Evolução bariátrica', 'EVOLUCOES'], ['bizuario', 'Bizuário do ambulatório', 'BIZUARIO']];
const optsDe = m => m.g === 'PREDEFS' ? PREDEF_OPTS[m.tipo] : m.g === 'DESCRICOES' ? DESC_OPTS : m.g === 'EVOLUCOES' ? EVO_OPTS : BIZ_OPTS;
function addCustomModel(m) {
  GRUPOS[m.g][m.id] = m.texto;
  const o = optsDe(m); if (!o) return;
  const it = o.find(x => x[0] === m.id); if (it) it[1] = m.nome; else o.push([m.id, m.nome]);
}
function removeCustomModel(m) {
  delete GRUPOS[m.g][m.id];
  const o = optsDe(m); if (!o) return;
  const i = o.findIndex(x => x[0] === m.id); if (i >= 0) o.splice(i, 1);
}
const isCustom = id => CFG.custom.some(m => m.id === id);
/* unidades cadastradas pelos médicos */
function applyExtraUnit(u) {
  const top = Math.max(0, Math.min(120, +u.topo || 20));
  UNITS[u.id] = { cab: u.cab || '', emitente: u.emitente || '', rodape: u.rodape || '', cidade: u.cidade || '' };
  MARGINS[u.id] = { top, bottom: u.rodape ? 25 : 20, timbre: top > 20 };
  UNIT_LABELS[u.id] = u.nome || 'Unidade'; UNIT_LONG[u.id] = u.nome || 'Unidade';
}
function removeExtraUnit(id) { delete UNITS[id]; delete MARGINS[id]; delete UNIT_LABELS[id]; delete UNIT_LONG[id]; if (S.unit === id) S.unit = 'metro'; }
const slug = () => 'x' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);

function setList(target, pairs) { target.splice(0, target.length, ...pairs); }
function applyConfig(m) {
  if (m.meds) setList(OPT_MEDS, m.meds);
  if (m.meds_ctrl) setList(OPT_MEDS_CTRL, m.meds_ctrl);
  if (m.exames) setList(OPT_EXAMES, m.exames);
  if (m.modelos) { CFG.modelos = m.modelos; Object.entries(m.modelos).forEach(([g, o]) => GRUPOS[g] && Object.assign(GRUPOS[g], o)); }
  if (Array.isArray(m.modelos_novos)) { CFG.custom = m.modelos_novos; CFG.custom.forEach(addCustomModel); }
  if (Array.isArray(m.unidades_extra)) { CFG.extra = m.unidades_extra; CFG.extra.forEach(applyExtraUnit); }
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
  if (window.apacLoad) await apacLoad();
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
    const custom = isCustom(CFG.modelo), alterado = CFG.modelos[CFG.grupo] && CFG.modelos[CFG.grupo][CFG.modelo] != null;
    $('#view').innerHTML = tabs + `<div class="card"><div class="sec"><h4><span class="ms" style="font-size:16px">article</span>Modelos de texto</h4><div class="stack">${shared}
      <div class="row"><div><label for="mdG">Grupo</label><select id="mdG">${Object.entries(GRUPO_NOME).map(([k, l]) => `<option value="${k}" ${CFG.grupo === k ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
      <div style="flex:2 1 260px"><label for="mdM">Modelo</label><select id="mdM">${keys.map(k => `<option value="${k}" ${CFG.modelo === k ? 'selected' : ''}>${esc(labs[k] || k)}</option>`).join('')}</select></div></div>
      ${custom ? `<div class="chipbar"><span class="ms">add_circle</span>Modelo cadastrado por vocês.</div><div><label for="mdN">Nome do modelo</label><input id="mdN" value="${esc(labs[CFG.modelo] || '')}"></div>` : ''}
      ${alterado && !custom ? '<div class="chipbar"><span class="ms">edit</span>Este modelo foi alterado em relação ao padrão.</div>' : ''}
      ${CFG.modelo === 'pos_op_gastro' ? '<div class="chipbar"><span class="ms">vaccines</span>O bloco da enoxaparina (item 1 de "USO INJETÁVEL") é trocado automaticamente pelo protocolo de IMC e TEV. Mantenha esse item.</div>' : ''}
      <textarea id="mdT" rows="20" aria-label="Texto do modelo">${esc(GRUPOS[CFG.grupo][CFG.modelo])}</textarea></div></div>
      <div class="actions">${custom ? '<button class="btn quiet" data-caddelmodelo><span class="ms">delete</span>Excluir modelo</button>' : '<button class="btn quiet" data-cadreset="modelo">Restaurar padrão</button>'}<button class="btn" data-cadsave="modelo"><span class="ms">save</span>Salvar modelo</button></div></div>
      <div class="card"><div class="sec"><h4><span class="ms" style="font-size:16px">add_circle</span>Novo modelo de texto</h4><div class="stack">
      <p style="margin:0;color:var(--muted);font-size:13px">Cadastre um texto pronto novo. Ele aparece para todos os médicos na lista de modelos do tipo escolhido.</p>
      <div class="row"><div><label for="nmTipo">Tipo</label><select id="nmTipo">${TIPOS_NOVO.map(([k, l]) => `<option value="${k}">${l}</option>`).join('')}</select></div>
      <div style="flex:2 1 260px"><label for="nmNome">Nome do modelo</label><input id="nmNome" placeholder="Ex.: Atestado de comparecimento"></div></div>
      <div><label for="nmTxt">Texto</label><textarea id="nmTxt" rows="10" placeholder="Digite o texto do modelo"></textarea></div>
      <div class="row"><div class="fit"><button class="btn" data-cadnew="modelo"><span class="ms">add</span>Cadastrar modelo</button></div></div></div></div></div>`;
  } else {
    const U = (u, nome) => `<div class="sec"><h4><span class="ms" style="font-size:16px">apartment</span>${nome}</h4><div class="stack">
      <div><label for="un-${u}-cab">Cabeçalho do documento (uma linha por item; vazio = sem cabeçalho)</label><textarea id="un-${u}-cab" rows="3">${esc(UNITS[u].cab)}</textarea></div>
      <div><label for="un-${u}-em">Identificação do emitente (receituário controlado)</label><textarea id="un-${u}-em" rows="4">${esc(UNITS[u].emitente)}</textarea></div>
      <div><label for="un-${u}-rod">Rodapé (vazio = sem rodapé)</label><input id="un-${u}-rod" value="${esc(UNITS[u].rodape)}"></div>
      <div><label for="un-${u}-cid">Cidade e UF na data</label><input id="un-${u}-cid" value="${esc(UNITS[u].cidade)}"></div></div></div>`;
    const Ux = u => `<div class="sec"><h4><span class="ms" style="font-size:16px">add_business</span>${esc(u.nome)}</h4><div class="stack">
      <div><label for="un-${u.id}-nome">Nome da unidade</label><input id="un-${u.id}-nome" value="${esc(u.nome)}"></div>
      <div><label for="un-${u.id}-cab">Cabeçalho do documento (uma linha por item; vazio = sem cabeçalho)</label><textarea id="un-${u.id}-cab" rows="3">${esc(u.cab)}</textarea></div>
      <div><label for="un-${u.id}-em">Identificação do emitente (receituário controlado)</label><textarea id="un-${u.id}-em" rows="4">${esc(u.emitente)}</textarea></div>
      <div><label for="un-${u.id}-rod">Rodapé (vazio = sem rodapé)</label><input id="un-${u.id}-rod" value="${esc(u.rodape)}"></div>
      <div class="row"><div><label for="un-${u.id}-cid">Cidade e UF na data</label><input id="un-${u.id}-cid" value="${esc(u.cidade)}"></div>
      <div><label for="un-${u.id}-topo">Espaço no alto (mm)</label><input id="un-${u.id}-topo" inputmode="numeric" value="${esc(u.topo)}"></div></div>
      <div class="hint">Espaço no alto: 20 para papel comum; 70 deixa 7 cm livres para papel timbrado.</div>
      <div class="row"><div class="fit"><button class="btn quiet sm" data-caddelunit="${u.id}"><span class="ms">delete</span>Excluir esta unidade</button></div></div></div></div>`;
    $('#view').innerHTML = tabs + `<div class="card">${shared.replace('<p', '<p class="sec"')}${U('metro', 'Hospital Metropolitano')}${U('ioci', 'Clínica IOCI')}${CFG.extra.map(Ux).join('')}
      <div class="sec"><div class="row"><div class="fit"><button class="btn line" data-cadnew="unid"><span class="ms">add_business</span>Adicionar nova unidade</button></div></div><div class="hint" style="margin-top:6px">A nova unidade aparece no seletor acima do menu e vale para todos os médicos.</div></div>
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
  else if ('cadnew' in d) {
    t.disabled = true;
    if (d.cadnew === 'modelo') {
      const tp = TIPOS_NOVO.find(x => x[0] === $('#nmTipo').value), nome = $('#nmNome').value.trim(), texto = $('#nmTxt').value;
      if (!nome || !texto.trim()) { t.disabled = false; return toast('Informe o nome e o texto do modelo.'); }
      const m = { id: 'c_' + slug(), g: tp[2], tipo: tp[0], nome, texto };
      const lista = CFG.custom.concat([m]);
      const er = await cfgSave('modelos_novos', lista);
      if (!er) { CFG.custom = lista; addCustomModel(m); CFG.grupo = m.g; CFG.modelo = m.id; }
      cadDone(er, `<b>Modelo "${esc(nome)}" cadastrado com sucesso.</b><br>Já aparece para todos os médicos em ${esc(tp[1])}.`);
    } else if (d.cadnew === 'unid') {
      const nome = (prompt('Nome da nova unidade (ex.: Hospital Santa Rosa):') || '').trim();
      if (!nome) { t.disabled = false; return; }
      const u = { id: slug(), nome, cab: '', emitente: nome, rodape: '', cidade: '', topo: '20' };
      const lista = CFG.extra.concat([u]);
      const er = await cfgSave('unidades_extra', lista);
      if (!er) { CFG.extra = lista; applyExtraUnit(u); render(); }
      cadDone(er, `<b>Unidade "${esc(nome)}" cadastrada com sucesso.</b><br>Preencha os dados abaixo e clique em "Salvar unidades".`);
    }
  }
  else if ('caddelmodelo' in d) {
    const m = CFG.custom.find(x => x.id === CFG.modelo);
    if (!m || !confirm('Excluir o modelo "' + m.nome + '"? Isso vale para todos os médicos.')) return;
    const lista = CFG.custom.filter(x => x.id !== m.id);
    const er = await cfgSave('modelos_novos', lista);
    if (!er) { CFG.custom = lista; removeCustomModel(m); CFG.modelo = Object.keys(GRUPOS[CFG.grupo])[0]; if (S.predef && S.predef[m.tipo] === m.id) S.predef[m.tipo] = ''; }
    cadDone(er, `<b>Modelo "${esc(m.nome)}" excluído.</b>`);
  }
  else if (d.caddelunit) {
    const u = CFG.extra.find(x => x.id === d.caddelunit);
    if (!u || !confirm('Excluir a unidade "' + u.nome + '"? Isso vale para todos os médicos.')) return;
    const lista = CFG.extra.filter(x => x.id !== u.id);
    const er = await cfgSave('unidades_extra', lista);
    if (!er) { CFG.extra = lista; removeExtraUnit(u.id); render(); }
    cadDone(er, `<b>Unidade "${esc(u.nome)}" excluída.</b>`);
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
      if (isCustom(k)) {
        const nome = ($('#mdN').value || '').trim();
        if (!nome) { t.disabled = false; return toast('Informe o nome do modelo.'); }
        const lista = CFG.custom.map(m => m.id === k ? Object.assign({}, m, { nome, texto: txt }) : m);
        const er = await cfgSave('modelos_novos', lista);
        if (!er) { CFG.custom = lista; lista.filter(m => m.id === k).forEach(addCustomModel); }
        return cadDone(er, `<b>Modelo "${esc(nome)}" salvo com sucesso.</b><br>Já vale para todos os médicos.`);
      }
      const novo = clone(CFG.modelos); novo[g] = Object.assign({}, novo[g], { [k]: txt });
      const er = await cfgSave('modelos', novo);
      if (!er) { CFG.modelos = novo; GRUPOS[g][k] = txt; }
      cadDone(er, '<b>Modelo salvo com sucesso.</b><br>Já vale para todos os médicos.');
    } else if (d.cadsave === 'unid') {
      const un = {};
      ['metro', 'ioci'].forEach(u => { un[u] = { cab: $(`#un-${u}-cab`).value.trim(), emitente: $(`#un-${u}-em`).value.trim(), rodape: $(`#un-${u}-rod`).value.trim(), cidade: $(`#un-${u}-cid`).value.trim() }; });
      const es = { nome: $('#esN').value.trim() || DEF.estab.nome, cnes: $('#esC').value.trim() || DEF.estab.cnes };
      const ex = CFG.extra.map(u => ({ id: u.id, nome: ($(`#un-${u.id}-nome`).value || '').trim() || u.nome, cab: $(`#un-${u.id}-cab`).value.trim(), emitente: $(`#un-${u.id}-em`).value.trim(), rodape: $(`#un-${u.id}-rod`).value.trim(), cidade: $(`#un-${u.id}-cid`).value.trim(), topo: $(`#un-${u.id}-topo`).value.trim() || '20' }));
      const er = (await cfgSave('unidades', un)) || (await cfgSave('unidades_extra', ex)) || (await cfgSave('estab', es));
      if (!er) { Object.keys(un).forEach(u => Object.assign(UNITS[u], un[u])); CFG.extra = ex; ex.forEach(applyExtraUnit); HOSP = HOSP_APAC = es.nome; CNES_HOSP = es.cnes; render(); }
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
