/* SGDM 3: telas, estado e fluxos. Dados do paciente ficam só em memória; só a AIH grava 4 campos no Supabase. */
const $ = s => document.querySelector(s);
const LS = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : v; } catch (_) { return d; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch (_) {} }
};
const SS = {
  get(k) { try { return sessionStorage.getItem(k); } catch (_) { return null; } },
  set(k, v) { try { sessionStorage.setItem(k, v); } catch (_) {} },
  del(k) { try { sessionStorage.removeItem(k); } catch (_) {} }
};

const MODS = [['docs', 'description', 'Documentos médicos'], ['aih', 'hotel', 'AIH'], ['apac', 'request_page', 'APAC'], ['cir', 'monitor_heart', 'Cirurgias'], ['cad', 'settings', 'Cadastros']];
const DOCS = [['receita', 'prescriptions', 'Receita médica'], ['controlado', 'pill', 'Receituário controlado'], ['atestado', 'assignment_turned_in', 'Atestado médico'], ['acompanhante', 'family_restroom', 'Atestado acompanhante'], ['encaminhamento', 'forward', 'Encaminhamento'], ['relatorio', 'lab_profile', 'Relatório médico'], ['exames', 'biotech', 'Solicitação de exames'], ['orientacoes', 'info', 'Orientações'], ['descricoes', 'content_cut', 'Descrições cirúrgicas'], ['evolucao', 'clinical_notes', 'Evolução / Ambulatório'], ['atb', 'science', 'Laudo de antimicrobianos', 'new']];
const PREDEF_OPTS = {
  receita: [['pos_op_gastro', 'PÓS-OPERATÓRIO GASTRO'], ['vitaminas_pos', 'VITAMINAS PÓS-OP'], ['ulcera', 'ÚLCERA GÁSTRICA'], ['deficiencias', 'DEFICIÊNCIAS PÓS-OP'], ['kit_parenteral', 'KIT PARENTERAL']],
  controlado: [['hpylori', 'TRATAMENTO H. PYLORI']],
  atestado: [['consulta', 'CONSULTA'], ['pos_op', 'PÓS-OPERATÓRIO']],
  encaminhamento: [['cirurgia_reparadora', 'CIRURGIA REPARADORA'], ['pre_op_bariatrico', 'PRÉ-OP BARIÁTRICO'], ['renovacao_risco', 'RENOVAÇÃO RISCO BARIÁTRICA'], ['risco_colecistectomia', 'RISCO COLECISTECTOMIA'], ['risco_hernioplastia', 'RISCO HERNIOPLASTIA'], ['solic_colecistectomia', 'SOLIC. COLECISTECTOMIA'], ['solic_hernioplastia', 'SOLIC. HERNIOPLASTIA'], ['cirurgia_geral', 'CIRURGIA GERAL'], ['retirada_pontos', 'Retirada de Pontos']],
  orientacoes: [['pos_op_imediato', 'PÓS-OP IMEDIATO'], ['pre_operatorio', 'PRÉ-OPERATÓRIO'], ['pos_op_tardio', 'PÓS-OP TARDIO']]
};
const DESC_OPTS = [['hernia_tapp', 'Hernioplastia Inguinal VLP Bilateral (TAPP)'], ['colecistectomia', 'Colecistectomia Videolaparoscópica'], ['bypass', 'Bypass Gástrico (Cir. Bariátrica)'], ['sleeve', 'Gastrectomia Vertical (Sleeve Gástrico)'], ['hernia_interna', 'Hérnia Interna Pós Bypass Gástrico']];
const EVO_OPTS = [['evo_mulher', 'Evolução Bariátrica - Mulher'], ['evo_homem', 'Evolução Bariátrica - Homem']];
const BIZ_OPTS = [['biz_primeira', 'Primeira Consulta'], ['biz_retorno_1sem', 'Retorno 1ª Semana'], ['biz_retorno_30d', 'Retorno 30 Dias'], ['biz_retorno_tardio', 'Retorno Tardio'], ['biz_retorno_preop', 'Retorno Pré-OP']];

const MEIA = 'USO EXTERNO\n\n1. Meia compressiva de média compressão\n\nUsar conforme orientação médica, durante a cirurgia e após a cirurgia por 15 dias.';
const PREVIA = 'ESTA RECEITA É APENAS UMA PRÉVIA DO QUE PODERÁ SER UTILIZADO NO PÓS-OPERATÓRIO. PODERÁ SOFRER ALTERAÇÕES PELA EQUIPE CIRÚRGICA COM BASE NAS AVALIAÇÕES REALIZADAS APÓS A CIRURGIA.';
const DOCTOR_DEFAULT = '';
const ACOMP_TXT = n => 'Atesto para os devidos fins que o(a) ' + (n || '[NOME_ACOMPANHANTE]') + ' esteve como acompanhante do(a) paciente supracitado(a) em consulta médica nesta data.\n\nCID: Z763';
const dShort = () => new Date().toLocaleDateString('pt-BR');
const isoHoje = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
const fmtIso = s => s ? s.split('-').reverse().join('/') : '';

/* ---------- protocolo de enoxaparina ---------- */
function protocolo(p) {
  const imc = parseFloat(String(p.imc).replace(',', '.'));
  if (p.tev === 'sim') return { poso: 'pela manhã e à noite (12/12 horas) durante 28 (vinte e oito) dias', qtd: '56 SERINGAS', curto: '40 mg manhã e noite por 28 dias, 56 seringas', motivo: 'história de TEV, independente do IMC' };
  if (imc >= 50) return { poso: 'pela manhã e à noite (12/12 horas) durante 14 (quatorze) dias', qtd: '28 SERINGAS', curto: '40 mg manhã e noite por 14 dias, 28 seringas', motivo: 'IMC maior ou igual a 50, sem TEV' };
  return { poso: '1 vez ao dia durante 10 (dez) dias', qtd: '10 SERINGAS', curto: '40 mg 1x ao dia por 10 dias, 10 seringas', motivo: 'IMC menor que 50, sem TEV' };
}
const ENOX_ORIG = '1) VERSA ou ENOXAPARINA 40 MG — 01 CAIXA\nAplicar no subcutâneo 1 vez ao dia durante 10 (dez) dias.';
function posOpTexto(p) {
  const bloco = p
    ? `1) ENOXAPARINA (VOLARE) 40 MG — ${protocolo(p).qtd}\nAplicar no subcutâneo ${protocolo(p).poso}.`
    : '1) ENOXAPARINA (VOLARE) 40 MG — (seringas conforme o protocolo)\nAplicar no subcutâneo (posologia definida pelo protocolo: IMC e história de TEV).';
  return PREDEFS.pos_op_gastro.replace(ENOX_ORIG, bloco);
}

/* ---------- estado ---------- */
const S = {
  mod: 'docs', unit: 'metro', doc: 'receita',
  predef: { receita: 'pos_op_gastro', controlado: '', atestado: '', encaminhamento: '', orientacoes: '' },
  text: {}, bundle: { receita: true, atestado: true, orient: true, atb: true, orient_tardio: true, orient_pre: true },
  prot: null, page: 'main', end: '', cpf: '', acomp: '',
  meds: [], medsCtrl: [], medVia: 'USO ORAL',
  atb: { antimicrobiano: 'CEFAZOLINA 1g', via: 'EV', posologia: '8/8H', duracao: '24h', justificativa: 'PROFILAXIA CIRURGICA - GASTROPLASTIA' },
  aihTab: 'emitir', aihPage: 'aih', aihBusy: false,
  aih: { f20: 'PACIENTE PORTADOR DE OBESIDADE GRAU III, REFRATÁRIO A TRATAMENTO CLÍNICO ASSOCIADO A COMORBIDADE (ESTEATOSE HEPÁTICA, ).', f21: 'NECESSIDADE DE TRATAMENTO CIRÚRGICO PARA OBESIDADE', f22: 'ANAMNESE + EXAME FÍSICO + EXAMES DE IMAGEM', f23: 'OBESIDADE', f24: 'E66-0', f27: 'CIRURGIA BARIÁTRICA POR VIDEOLAPAROSCOPIA', f28: '0407010386' },
  aihMedico: LS.get('sgdm3_aih_medico', ''),
  doctor: LS.get('sgdm3_doctor', DOCTOR_DEFAULT),
  apacTab: 'eda', admin: { desc: '', evo: '', biz: '' },
  aihList: null, cirList: null, aihQ: '', aihStatus: 'todos'
};
let db = null;
function getDb() {
  if (!db && window.supabase) db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return db;
}

/* ---------- utilitários ---------- */
function toast(m) { const t = $('#toast'); t.textContent = m; t.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => t.hidden = true, 3200); }
function copyText(v, okMsg) {
  const fb = () => toast('Selecione o texto e copie com Ctrl+C.');
  try { navigator.clipboard.writeText(v).then(() => toast(okMsg || 'Copiado.'), fb); } catch (_) { fb(); }
}
const pNome = () => ($('#pNome') ? $('#pNome').value : '');
const norm = s => String(s || '').toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();
const maskCpf = v => { v = v.replace(/\D/g, '').slice(0, 11); if (v.length > 9) return v.replace(/(\d{3})(\d{3})(\d{3})(\d{1,2})/, '$1.$2.$3-$4'); if (v.length > 6) return v.replace(/(\d{3})(\d{3})(\d{1,3})/, '$1.$2.$3'); if (v.length > 3) return v.replace(/(\d{3})(\d{1,3})/, '$1.$2'); return v; };

/* ---------- login ---------- */
function showApp() { $('#login').hidden = true; $('#app').hidden = false; render(); }
function initLogin() {
  if (SS.get('sgdm3_ok') === '1') return showApp();
  $('#login').hidden = false;
  $('#loginForm').addEventListener('submit', e => {
    e.preventDefault();
    if ($('#lu').value.trim().toUpperCase() === LOGIN_USER.toUpperCase() && $('#lp').value === LOGIN_PASS) { SS.set('sgdm3_ok', '1'); showApp(); }
    else { $('#lerr').hidden = false; }
  });
}

/* ---------- texto dos documentos ---------- */
function defaultText(doc) {
  const p = S.predef[doc];
  if (doc === 'receita') return p === 'pos_op_gastro' ? posOpTexto(S.prot) : (PREDEFS[p] || '');
  if (doc === 'acompanhante') return ACOMP_TXT(S.acomp);
  if (doc === 'exames') return EXAMES_PADRAO;
  if (doc === 'relatorio') return '';
  return p && PREDEFS[p] ? PREDEFS[p] : '';
}
const getText = doc => (S.text[doc] != null ? S.text[doc] : defaultText(doc));

/* pacote de impressão do documento atual */
function bundleList() {
  const p = S.predef[S.doc];
  if (S.doc === 'receita' && p === 'pos_op_gastro') return [['receita', 'Receita médica', 'Pós-op gastro, com enoxaparina conforme protocolo'], ['atestado', 'Atestado médico', 'Pós-operatório, data de ontem'], ['orient', 'Orientações ao paciente', 'Pós-op imediato'], ['atb', 'Laudo de antimicrobianos', 'Cefazolina 1g EV 8/8h por 24h', 'pré-preenchido']];
  if (S.doc === 'receita' && p === 'vitaminas_pos') return [['receita', 'Receita médica', 'Vitaminas pós-op'], ['orient_tardio', 'Orientações ao paciente', 'Pós-op tardio']];
  if (S.doc === 'encaminhamento' && p === 'pre_op_bariatrico') return [['receita', 'Encaminhamento', 'Pré-op bariátrico'], ['orient_pre', 'Orientações ao paciente', 'Pré-operatório']];
  return [];
}
function atbPage() {
  return rawPage({ id: 'atb', label: 'Laudo de antimicrobianos', cls: 'rawatb', html: atbHTML({ nome: pNome().trim(), data: dShort(), medico: S.doctor.split('\n')[0] || '', ...S.atb }) });
}
function docsPages() {
  const inst = S.unit, doc = S.doc, t = getText(doc);
  if (doc === 'atb') return [atbPage()];
  if (['descricoes', 'evolucao'].includes(doc)) return [];
  const title = DOC_TITLES[doc];
  const main = docPage(inst, { id: 'main', label: (DOCS.find(x => x[0] === doc) || [0, 0, title])[2], title, content: t, fs: doc === 'orientacoes' ? '10pt' : '11pt', date: doc === 'atestado' && S.predef.atestado === 'pos_op' ? dayShift(-1) : null });
  const list = bundleList();
  if (!list.length) return [main];
  const on = id => S.bundle[id];
  const out = [];
  const p = S.predef[doc];
  if (on('receita')) { main.id = 'receita'; out.push(main); }
  if (p === 'pos_op_gastro') {
    if (on('atestado')) out.push(docPage(inst, { id: 'atestado', label: 'Atestado médico', title: 'ATESTADO MÉDICO', content: PREDEFS.pos_op, date: dayShift(-1) }));
    if (on('orient')) out.push(docPage(inst, { id: 'orient', label: 'Orientações', title: 'ORIENTAÇÕES AO PACIENTE', content: PREDEFS.pos_op_imediato, fs: '10pt' }));
    if (on('atb')) out.push(atbPage());
  } else if (p === 'vitaminas_pos') {
    if (on('orient_tardio')) out.push(docPage(inst, { id: 'orient_tardio', label: 'Orientações', title: 'ORIENTAÇÕES AO PACIENTE', content: PREDEFS.pos_op_tardio, fs: '10pt' }));
  } else if (p === 'pre_op_bariatrico') {
    if (on('orient_pre')) out.push(docPage(inst, { id: 'orient_pre', label: 'Orientações', title: 'ORIENTAÇÕES AO PACIENTE', content: PREDEFS.pre_operatorio, fs: '10pt' }));
  }
  return out;
}
function aihData() {
  return { nome: pNome().trim(), ...S.aih, clinica: 'CIRÚRGICA', carater: '1 - ELETIVA', docTipo: '', docNum: '', medico: S.aihMedico, data: dShort() };
}
function aihPages() {
  const nm = pNome();
  void nm;
  const aih = rawPage({ id: 'aih', label: 'AIH', cls: 'rawof', html: aihHTML(aihData()) });
  const meia = docPage('metro', { id: 'meia', label: 'Receita da meia', title: 'RECEITA MÉDICA', content: MEIA });
  const rx = docPage('metro', { id: 'aihrx', label: 'Receita pós-op', title: 'RECEITA MÉDICA', content: posOpTexto(S.prot), bottom: PREVIA, fs: '10pt', lh: 1.35 });
  return [aih, meia, rx];
}
const APAC_MODELS = {
  eda: { f15: '02.09.01.003-7', f16: 'ESOFAGOGASTRODUODENOSCOPIA', f33: 'PÓS OPERATÓRIO DE CIRURGIA BARIÁTRICA', f34: 'Z988', f37: 'PACIENTE EM PÓS OPERATÓRIO DE CIRURGIA BARIÁTRICA COM NECESSIDADE DE REALIZAR ENDOSCOPIA DIGESTIVA DE CONTROLE.' },
  cir: { f15: '', f16: 'CONSULTA EM CIRURGIA GERAL', f33: 'COLELITIASE', f34: 'K802', f37: 'ENCAMINHO PACIENTE EM POS OPERATÓRIO DE CIRURGIA BARIATRICA (BYPASS GASTRICO), APRESENTANDO COLELITIASE COM NECESSIDADE DE COLECISTECTOMIA DEVIDO DESVIO INTESTINAL QUE IMPEDE ACESSO A VIA BILIAR VIA ENDOSCÓPICA CONVENCIONAL.' }
};
function apacPages() {
  return [rawPage({ id: 'apac', label: 'APAC', cls: 'rawof', html: apacHTML({ nome: pNome().trim(), ...APAC_MODELS[S.apacTab], medico: S.aihMedico, data: dShort() }) })];
}

/* ---------- chrome ---------- */
function chrome() {
  $('#mods').innerHTML = MODS.map(([k, i, l]) => `<button class="mod" role="tab" aria-selected="${S.mod === k}" data-mod="${k}"><span class="ms">${i}</span>${l}</button>`).join('');
  $('#unit').innerHTML = [['metro', 'Metropolitano'], ['ioci', 'IOCI']].map(([k, l]) => `<button aria-pressed="${S.unit === k}" data-unit="${k}">${l}</button>`).join('');
}
const optsHTML = (list, cur, first = 'Nenhum') => `<option value="">${first}</option>` + list.map(([v, l]) => `<option value="${v}" ${cur === v ? 'selected' : ''}>${l}</option>`).join('');

function pagesNow() {
  if (S.mod === 'docs') return docsPages();
  if (S.mod === 'aih') return S.aihTab === 'emitir' ? aihPages() : [];
  if (S.mod === 'apac') return apacPages();
  return [];
}
function currentPage(pages) {
  let i = pages.findIndex(p => p.id === S.page);
  if (S.mod === 'aih') i = pages.findIndex(p => p.id === S.aihPage);
  return Math.max(0, i);
}
function refreshPreview() {
  const host = $('#sheet'); if (!host) return;
  const pages = pagesNow();
  renderPreview(host, pages, currentPage(pages));
}

/* ---------- Documentos ---------- */
function protChip() {
  if (S.doc !== 'receita' || S.predef.receita !== 'pos_op_gastro') return '';
  if (!S.prot) return `<div class="chipbar"><span class="ms">vaccines</span>Informe o IMC e a história de TEV para definir a enoxaparina.<button data-open="prot-doc">Informar</button></div>`;
  const p = protocolo(S.prot);
  return `<div class="chipbar"><span class="ms">vaccines</span><div>IMC <b>${esc(S.prot.imc)}</b> · ${S.prot.tev === 'sim' ? '<b>com</b>' : 'sem'} história de TEV<br>Enoxaparina (Volare) <b>${p.curto}</b></div><button data-open="prot-doc">Alterar</button></div>`;
}
function medBlock(ctrl) {
  const list = ctrl ? S.medsCtrl : S.meds, opts = ctrl ? OPT_MEDS_CTRL : OPT_MEDS;
  return `<div class="sec"><h4><span class="ms" style="font-size:16px">medication</span>Prescrição</h4><div class="stack"><div class="row">
    <div><label for="via">Via</label><select id="via"><option value="">Selecione...</option>${OPT_VIAS.map(v => `<option ${S.medVia === v ? 'selected' : ''}>${v}</option>`).join('')}</select></div>
    <div style="flex:2 1 260px"><label for="med">Medicação</label><select id="med"><option value="">Selecione...</option>${opts.map(([v, l]) => `<option value="${esc(v)}">${esc(l)}</option>`).join('')}</select></div>
    <div class="fit"><button class="btn line sm" data-addmed="${ctrl ? 'c' : 'r'}"><span class="ms">add_circle</span>Adicionar</button></div></div>
    ${list.map((m, i) => `<div class="med-item"><span><b>${esc(m.med.split(' - ')[0])}</b><br>${esc(m.via)}${m.med.includes(' - ') ? ' · ' + esc(m.med.split(' - ').slice(1).join(' - ')) : ''}</span><button class="x" data-delmed="${ctrl ? 'c' : 'r'}:${i}" aria-label="Remover"><span class="ms">delete</span></button></div>`).join('')}</div></div>`;
}
function renderDocs() {
  const doc = S.doc, isAdmin = ['descricoes', 'evolucao'].includes(doc), isAtb = doc === 'atb';
  const list = bundleList(), pages = isAdmin ? [] : docsPages();
  if (!pages.find(p => p.id === S.page)) S.page = pages[0] ? pages[0].id : 'main';
  const tabs = pages.length > 1 ? `<div class="ptabs">${pages.map((p, i) => `<button data-page="${p.id}" aria-pressed="${S.page === p.id}">${i + 1}. ${esc(p.label.split(' ')[0])}</button>`).join('')}</div>` : '';
  const predefOpts = PREDEF_OPTS[doc];
  let editor = '';
  if (isAtb) {
    const a = S.atb;
    editor = `<div class="sec"><h4><span class="ms" style="font-size:16px">science</span>Laudo de antimicrobianos</h4><div class="stack"><p style="margin:0;color:var(--muted);font-size:13px">O formulário segue o modelo original do hospital. O nome do paciente vem da faixa acima. Atendimento, bloco, leito, data de internação, sexo, idade e peso ficam em branco.</p><div class="row"><div style="flex:2 1 220px"><label for="am">Antimicrobiano</label><input id="am" data-atb="antimicrobiano" value="${esc(a.antimicrobiano)}"></div><div><label for="av">Via</label><input id="av" data-atb="via" value="${esc(a.via)}"></div><div><label for="ap">Posologia</label><input id="ap" data-atb="posologia" value="${esc(a.posologia)}"></div><div><label for="ad">Duração</label><input id="ad" data-atb="duracao" value="${esc(a.duracao)}"></div></div><div><label for="aj">Justificativa</label><input id="aj" data-atb="justificativa" value="${esc(a.justificativa)}"></div></div></div>`;
  } else if (doc === 'descricoes') {
    editor = `<div class="sec"><h4><span class="ms" style="font-size:16px">content_cut</span>Descrições cirúrgicas</h4><div class="stack"><div><label for="selDesc">Selecione a descrição</label><select id="selDesc" data-adm="desc">${optsHTML(DESC_OPTS, '', 'Selecione...')}</select></div><textarea id="admTxt" rows="18" readonly aria-label="Descrição">${esc(S.admin.desc)}</textarea></div></div>`;
  } else if (doc === 'evolucao') {
    editor = `<div class="sec"><h4><span class="ms" style="font-size:16px">clinical_notes</span>Evolução / Ambulatório</h4><div class="stack"><div class="row"><div><label for="selEvo">Evoluções</label><select id="selEvo" data-adm="evo">${optsHTML(EVO_OPTS, '', 'Selecione...')}</select></div><div><label for="selBiz">Bizuário ambulatório</label><select id="selBiz" data-adm="biz">${optsHTML(BIZ_OPTS, '', 'Selecione...')}</select></div></div><textarea id="admTxt" rows="18" aria-label="Texto">${esc(S.admin.evo)}</textarea></div></div>`;
  } else {
    const isRec = doc === 'receita' || doc === 'controlado';
    const endBox = doc === 'controlado' ? `<div class="sec"><h4><span class="ms" style="font-size:16px">home</span>Dados do paciente para o receituário controlado</h4><div class="row"><div style="flex:2 1 260px"><label for="cEnd">Endereço (exigido neste receituário)</label><input id="cEnd" value="${esc(S.end)}" placeholder="Rua, número, bairro"></div><div><label for="cCpf">CPF</label><input id="cCpf" value="${esc(S.cpf)}" placeholder="000.000.000-00" inputmode="numeric"></div></div></div>` : '';
    const acomp = doc === 'acompanhante' ? `<div class="sec"><h4><span class="ms" style="font-size:16px">family_restroom</span>Dados do acompanhante</h4><div><label for="aNome">Nome do acompanhante *</label><input id="aNome" value="${esc(S.acomp)}" placeholder="Nome do acompanhante"></div></div>` : '';
    const exames = doc === 'exames' ? `<div class="sec"><h4><span class="ms" style="font-size:16px">biotech</span>Exames</h4><div class="row"><div style="flex:2 1 260px"><label for="exSel">Adicionar exame</label><select id="exSel"><option value="">Selecione...</option>${OPT_EXAMES.map(([v, l]) => `<option value="${esc(v)}">${esc(l)}</option>`).join('')}</select></div><div class="fit"><button class="btn line sm" data-addex><span class="ms">add_circle</span>Adicionar</button></div></div></div>` : '';
    editor = `${endBox}${acomp}${exames}${isRec ? medBlock(doc === 'controlado') : ''}<div class="sec"><h4><span class="ms" style="font-size:16px">edit_note</span>Conteúdo do documento</h4><div class="stack">${protChip()}${predefOpts ? `<div><label for="pre">Texto pré-definido</label><select id="pre">${optsHTML(predefOpts, S.predef[doc])}</select></div>` : ''}<textarea id="txt" rows="${isRec ? 13 : 10}" aria-label="Conteúdo">${esc(getText(doc))}</textarea></div></div>`;
  }
  const pack = list.length ? `<div class="sec"><div class="pack"><h5><span class="ms">layers</span>Este modelo imprime ${pages.length} ${pages.length === 1 ? 'página' : 'páginas'} juntas</h5><p>Marque o que vai no pacote. Paciente e médico entram em todas as páginas.</p>${list.map((p, i) => `<div class="pg"><input type="checkbox" data-pk="${p[0]}" ${S.bundle[p[0]] ? 'checked' : ''} aria-label="Incluir ${esc(p[1])}"><span class="n">${i + 1}</span><div class="t">${esc(p[1])}<small>${esc(p[2])}</small></div>${p[3] ? `<span class="tag">${p[3]}</span>` : ''}<button class="view" data-page="${p[0]}"><span class="ms" style="font-size:16px">visibility</span>Ver</button></div>`).join('')}</div></div>` : '';
  const doctorBox = isAdmin ? '' : `<div class="sec"><h4><span class="ms" style="font-size:16px">draw</span>Assinatura do médico</h4><textarea id="doctor" rows="2" placeholder="Seu nome, especialidade, CRM e RQE (aparece como assinatura nos documentos)">${esc(S.doctor)}</textarea></div>`;
  const actions = isAdmin ? `<div class="actions"><button class="btn line" id="copy"><span class="ms">content_copy</span>Copiar texto</button></div>` : `<div class="actions"><button class="btn quiet" id="clr"><span class="ms">delete_sweep</span>Limpar</button>${isAtb || isAdmin ? '' : '<button class="btn line" id="copy"><span class="ms">content_copy</span>Copiar texto</button>'}<button class="btn" id="print"><span class="ms">print</span>Imprimir${pages.length > 1 ? ` pacote (${pages.length} páginas)` : ''}</button></div>`;
  const side = isAdmin ? '' : `<div class="sheet-wrap">${tabs}<div id="sheet"></div><div class="hint"><span class="ms" style="font-size:16px">description</span>Folha A4 · ${S.unit === 'metro' ? 'Hospital Metropolitano' : 'Clínica IOCI'}</div></div>`;
  $('#view').innerHTML = `<div class="work" ${isAdmin ? 'style="grid-template-columns:minmax(0,1fr)"' : ''}><div class="card"><div class="sec"><h4><span class="ms" style="font-size:16px">category</span>Tipo de documento</h4><div class="tiles">${DOCS.map(([k, i, l, n]) => `<button class="tile ${n || ''}" data-doc="${k}" aria-pressed="${S.doc === k}"><span class="ms">${i}</span>${l}</button>`).join('')}</div></div>${editor}${pack}${doctorBox}${actions}</div>${side}</div>`;
  refreshPreview();
}
function printDocs() {
  const pages = docsPages();
  if (!pages.length) return;
  if (!pNome().trim()) { toast('Informe o nome do paciente na faixa acima.'); return; }
  printPages(pages);
}

/* ---------- AIH ---------- */
async function loadAih() {
  const c = getDb(); if (!c) return toast('Sem conexão com o banco.');
  const { data, error } = await c.from('aih_registros').select('*').order('data_emissao', { ascending: false }).order('id', { ascending: false });
  if (error) { toast('Erro ao carregar AIH: ' + error.message); S.aihList = []; return; }
  S.aihList = data || [];
  if (S.aihTab === 'comp') {
    const r = await c.from('cirurgias').select('id,paciente,data');
    S.cirList = r.error ? [] : (r.data || []);
  }
}
function matchAih(a) {
  const n = norm(a.nome_paciente); if (!n) return null;
  return (S.cirList || []).find(c => { const m = norm(c.paciente); return m && (m.includes(n) || n.includes(m)); }) || null;
}
const chip = (txt, warn) => `<span class="tag ${warn ? 'warn' : ''}">${txt}</span>`;
function renderAIH() {
  const tabs = `<div class="sub" role="tablist">${[['emitir', 'Emitir AIH'], ['emitidas', 'AIH emitidas'], ['comp', 'AIH × Cirurgias']].map(([k, l]) => `<button role="tab" aria-selected="${S.aihTab === k}" data-aih="${k}">${l}</button>`).join('')}</div>`;
  if (S.aihTab === 'emitir') {
    const a = S.aih, T = (id, l, k, rows = 2) => `<div><label for="${id}">${l}</label><textarea id="${id}" data-af="${k}" rows="${rows}">${esc(a[k])}</textarea></div>`;
    const I = (id, l, k, w = '') => `<div style="${w}"><label for="${id}">${l}</label><input id="${id}" data-af="${k}" value="${esc(a[k])}"></div>`;
    const pg = [['aih', 'AIH', 'Formulário oficial do SUS'], ['meia', 'Receita da meia', 'Meia de média compressão, 15 dias'], ['aihrx', 'Receita pós-op', 'Enoxaparina conforme IMC e TEV, com aviso de prévia']];
    $('#view').innerHTML = tabs + `<div class="work"><div class="card"><div class="sec"><h4><span class="ms" style="font-size:16px">edit_note</span>Campos da AIH</h4><div class="stack"><p style="margin:0;color:var(--muted);font-size:13px">Estabelecimento, CNES, clínica e caráter vêm preenchidos. O nome do paciente vem da faixa acima. O restante do formulário oficial sai em branco para preenchimento à mão.</p>
      <div><label for="aMed">Profissional solicitante *</label><input id="aMed" value="${esc(S.aihMedico)}" placeholder="Nome do médico solicitante"></div>
      ${T('f20', '20 · Principais sinais e sintomas clínicos', 'f20', 4)}${T('f21', '21 · Condições que justificam a internação', 'f21')}${T('f22', '22 · Principais resultados de provas diagnósticas', 'f22')}
      <div class="row">${I('f23', '23 · Diagnóstico inicial', 'f23', 'flex:2 1 200px')}${I('f24', '24 · CID-10 principal', 'f24')}</div><div class="row">${I('f27', '27 · Procedimento solicitado', 'f27', 'flex:2 1 260px')}${I('f28', '28 · Código', 'f28')}</div></div></div>
      <div class="sec"><div class="pack"><h5><span class="ms">layers</span>Ao emitir, imprime 3 documentos</h5><p>AIH, receita da meia compressiva e receita de pós-operatório, com o nome do paciente em todas.</p>${pg.map((p, i) => `<div class="pg"><span class="n">${i + 1}</span><div class="t">${p[1]}<small>${p[2]}</small></div><button class="view" data-aihpage="${p[0]}"><span class="ms" style="font-size:16px">visibility</span>Ver</button></div>`).join('')}</div></div>
      <div class="actions"><button class="btn" data-open="prot-aih" ${S.aihBusy ? 'disabled' : ''}><span class="ms">print</span>Emitir AIH</button></div></div>
      <div class="sheet-wrap"><div class="ptabs">${pg.map(p => `<button data-aihpage="${p[0]}" aria-pressed="${S.aihPage === p[0]}">${p[1]}</button>`).join('')}</div><div id="sheet"></div><div class="hint"><span class="ms" style="font-size:16px">info</span>Ao emitir, só 4 dados ficam salvos: paciente, dados clínicos, médico e data.</div></div></div>`;
    refreshPreview(); return;
  }
  if (S.aihList == null) { $('#view').innerHTML = tabs + '<div class="empty">Carregando…</div>'; loadAih().then(() => { if (S.mod === 'aih') renderAIH(); }); return; }
  const comp = S.aihTab === 'comp';
  const mes = isoHoje().slice(0, 7);
  const rows = S.aihList.map(a => ({ a, c: comp ? matchAih(a) : null }));
  const q = norm(S.aihQ);
  let vis = rows.filter(r => !q || norm(r.a.nome_paciente).includes(q));
  if (comp && S.aihStatus !== 'todos') vis = vis.filter(r => (r.c ? 'operado' : 'pendente') === S.aihStatus);
  const nOper = comp ? rows.filter(r => r.c).length : 0;
  const kp = comp
    ? `<div class="kpi"><b>${rows.length}</b><span>AIH emitidas</span></div><div class="kpi"><b>${nOper}</b><span>com cirurgia registrada</span></div><div class="kpi"><b>${rows.length - nOper}</b><span>pendentes, sem cirurgia</span></div>`
    : `<div class="kpi"><b>${rows.length}</b><span>AIH emitidas no total</span></div><div class="kpi"><b>${rows.filter(r => String(r.a.data_emissao).startsWith(mes)).length}</b><span>emitidas este mês</span></div>`;
  $('#view').innerHTML = tabs + `<div class="kpis">${kp}</div><div class="card"><div class="sec"><div class="row"><div style="flex:2 1 240px"><label for="bq">Buscar paciente</label><input id="bq" value="${esc(S.aihQ)}" placeholder="Nome do paciente"></div>${comp ? `<div><label for="bp">Status</label><select id="bp">${[['todos', 'Todos'], ['operado', 'Operado'], ['pendente', 'Pendente']].map(([v, l]) => `<option value="${v}" ${S.aihStatus === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div>` : ''}<div class="fit"><button class="btn line sm" data-csv><span class="ms">table_view</span>Exportar CSV</button></div></div></div>
  <div class="scroll"><table class="tbl"><thead><tr><th>Paciente</th><th>Emissão</th><th>Médico</th><th>${comp ? 'Cirurgia' : 'Dados clínicos'}</th><th></th></tr></thead><tbody>${vis.length ? vis.map(({ a, c }) => `<tr><td><b>${esc(a.nome_paciente)}</b></td><td>${fmtIso(a.data_emissao)}</td><td>${esc(a.nome_medico)}</td><td>${comp ? (c ? chip('Operado') + ' em ' + fmtIso(c.data) : chip('Pendente', 1)) : esc(String(a.dados_clinicos || '').slice(0, 60))}</td><td style="text-align:right;white-space:nowrap"><button class="x" data-aedit="${a.id}" aria-label="Editar"><span class="ms">edit</span></button><button class="x" data-adel="${a.id}" aria-label="Excluir"><span class="ms">delete</span></button></td></tr>`).join('') : '<tr><td colspan="5" class="empty">Nenhuma AIH encontrada.</td></tr>'}</tbody></table></div></div>`;
}

async function emitirAih() {
  const nome = pNome().trim();
  if (!S.aihMedico.trim()) return toast('Informe o profissional solicitante.');
  const c = getDb();
  if (!c) return toast('Sem conexão com o banco. A AIH não foi emitida.');
  S.aihBusy = true;
  const { error } = await c.from('aih_registros').insert([{ nome_paciente: nome, dados_clinicos: S.aih.f20.trim(), nome_medico: S.aihMedico.trim(), data_emissao: isoHoje() }]);
  S.aihBusy = false;
  if (error) { toast('Erro ao salvar a AIH: ' + error.message); return; }
  S.aihList = null;
  printPages(aihPages());
  toast('AIH salva e 3 documentos enviados para impressão.');
  setTimeout(() => openModal('prontuario'), 400);
}

/* ---------- Cirurgias e Cadastros (fase 2) ---------- */
function renderCad() {
  $('#view').innerHTML = `<div class="grid2">${[['badge', 'Médicos', 'Nome, CRM, RQE, CNS e CPF'], ['apartment', 'Unidades', 'CNES, endereço, timbre e rodapé'], ['article', 'Modelos e textos', 'Receitas, atestados, orientações'], ['medication', 'Medicamentos e exames', 'Listas usadas nos documentos']].map(x => `<div class="card" style="padding:18px 20px"><span class="ms" style="color:var(--accent-text)">${x[0]}</span><h3 style="margin:8px 0 2px;font-size:15px">${x[1]}</h3><div style="color:var(--muted);font-size:13px">${x[2]} · próxima etapa</div></div>`).join('')}</div>`;
}

/* ---------- APAC ---------- */
function renderAPAC() {
  const eda = S.apacTab === 'eda';
  $('#view').innerHTML = `<div class="work"><div class="card"><div class="sec"><h4><span class="ms" style="font-size:16px">request_page</span>APAC</h4><div class="stack"><p style="margin:0;color:var(--muted);font-size:13px">Formulário oficial do SUS. Vêm preenchidos o estabelecimento, o CNES, o procedimento, o diagnóstico, o CID e as observações do modelo escolhido. O nome do paciente vem da faixa acima. O resto fica em branco.</p>
  <div><label>Modelo</label><div class="opt"><label><input type="radio" name="apm" value="eda" ${eda ? 'checked' : ''}>Endoscopia (EDA)</label><label><input type="radio" name="apm" value="cir" ${!eda ? 'checked' : ''}>Consulta cirurgia geral</label></div></div>
  <div><label for="aMed">Profissional solicitante *</label><input id="aMed" value="${esc(S.aihMedico)}" placeholder="Nome do médico solicitante"></div></div></div>
  <div class="actions"><button class="btn" id="printApac"><span class="ms">print</span>Imprimir</button></div></div>
  <div class="sheet-wrap"><div id="sheet"></div><div class="hint"><span class="ms" style="font-size:16px">info</span>Não grava nada.</div></div></div>`;
  refreshPreview();
}

/* ---------- modais ---------- */
let M = { imc: '', tev: 'nao', then: null, msg: '' };
function openModal(kind) {
  const m = $('#modal');
  if (kind === 'prot-doc' || kind === 'prot-aih') {
    if (kind === 'prot-aih' && !pNome().trim()) { toast('Informe o nome do paciente na faixa acima.'); return; }
    M = { imc: S.prot ? S.prot.imc : '', tev: S.prot ? S.prot.tev : 'nao', then: kind, msg: '' };
    m.innerHTML = `<div class="modal" role="dialog" aria-modal="true" aria-labelledby="mt"><header><h2 id="mt">Protocolo de tromboprofilaxia</h2><p>Responda para definir a dose de enoxaparina da receita de pós-operatório.</p></header>
    <div class="mb"><div><label for="mImc">IMC do paciente (kg/m²)</label><input id="mImc" inputmode="decimal" value="${esc(M.imc)}" placeholder="ex.: 44,5"></div>
    <div><label>História de TEV (tromboembolismo venoso)?</label><div class="opt"><label><input type="radio" name="mtev" value="nao" ${M.tev === 'nao' ? 'checked' : ''}>Não</label><label><input type="radio" name="mtev" value="sim" ${M.tev === 'sim' ? 'checked' : ''}>Sim</label></div></div>
    <div class="res" id="mRes"></div></div>
    <footer><button class="btn quiet" data-close>Cancelar</button><button class="btn" id="mOk">${kind === 'prot-aih' ? 'Emitir e imprimir (3 documentos)' : 'Aplicar à receita'}</button></footer></div>`;
    m.hidden = false; updRes(); setTimeout(() => { const i = $('#mImc'); if (i) i.focus(); }, 30);
  } else if (kind === 'prontuario') {
    const p = protocolo(S.prot);
    M.msg = `Prescrito enoxaparina na seguinte posologia: ENOXAPARINA (VOLARE) 40 MG, ${p.qtd.toLowerCase()}, aplicar no subcutâneo ${p.poso}. IMC ${S.prot.imc} kg/m², ${S.prot.tev === 'sim' ? 'com' : 'sem'} história de TEV. AIH emitida em ${dShort()}.`;
    m.innerHTML = `<div class="modal" role="dialog" aria-modal="true" aria-labelledby="mt"><header><h2 id="mt">Cole no prontuário do paciente</h2><p>Os 3 documentos foram enviados para impressão. Cole esta mensagem no prontuário para conferir a dose prescrita na hora da cirurgia.</p></header>
    <div class="mb"><div class="msgbox">${esc(M.msg)}</div></div>
    <footer><button class="btn line" id="mCopy"><span class="ms">content_copy</span>Copiar mensagem</button><button class="btn" data-close>Fechar</button></footer></div>`;
    m.hidden = false;
  } else if (kind.startsWith('aedit:')) {
    const a = S.aihList.find(x => String(x.id) === kind.slice(6)); if (!a) return;
    M.edit = a;
    m.innerHTML = `<div class="modal" role="dialog" aria-modal="true" aria-labelledby="mt"><header><h2 id="mt">Editar AIH</h2></header><div class="mb"><div><label for="eN">Paciente</label><input id="eN" value="${esc(a.nome_paciente)}"></div><div><label for="eM">Médico</label><input id="eM" value="${esc(a.nome_medico)}"></div><div><label for="eD">Data de emissão</label><input id="eD" type="date" value="${esc(a.data_emissao)}"></div><div><label for="eC">Dados clínicos</label><textarea id="eC" rows="4">${esc(a.dados_clinicos)}</textarea></div></div><footer><button class="btn quiet" data-close>Cancelar</button><button class="btn" id="eOk">Salvar</button></footer></div>`;
    m.hidden = false;
  }
}
function updRes() {
  const imc = parseFloat(String(M.imc).replace(',', '.')), r = $('#mRes'); if (!r) return;
  const ok = !isNaN(imc) && imc > 0;
  $('#mOk').disabled = !ok; $('#mOk').style.opacity = ok ? 1 : .5;
  if (!ok) { r.innerHTML = '<b>Resultado</b>Informe o IMC para ver a dose.'; return; }
  const p = protocolo({ imc: M.imc, tev: M.tev });
  r.innerHTML = `<b>Será prescrito</b>Enoxaparina (Volare) ${p.curto}<br><span style="color:var(--muted)">${p.motivo}${imc === 50 ? '. IMC igual a 50 entra como maior ou igual a 50.' : ''}</span>`;
}
const closeModal = () => { $('#modal').hidden = true; };

function render() {
  chrome();
  document.querySelector('.pt').hidden = S.mod === 'cir' || S.mod === 'cad';
  ({ docs: renderDocs, aih: renderAIH, apac: renderAPAC, cir: () => renderCirurgias(), cad: renderCad })[S.mod]();
}

/* ---------- eventos ---------- */
document.addEventListener('click', async e => {
  const t = e.target.closest('button,[data-close]'); if (!t) return;
  const d = t.dataset;
  if (d.mod) { S.mod = d.mod; if (S.mod === 'aih') S.aihList = null; if (S.mod === 'cir') SC.loaded = false; render(); }
  else if (d.unit) { S.unit = d.unit; render(); }
  else if (d.doc) { S.doc = d.doc; S.page = 'main'; render(); }
  else if (d.page) { S.page = d.page; render(); }
  else if (d.aihpage) { S.aihPage = d.aihpage; renderAIH(); }
  else if (d.aih) { S.aihTab = d.aih; S.aihList = null; renderAIH(); }
  else if (d.open) openModal(d.open);
  else if (d.aedit) openModal('aedit:' + d.aedit);
  else if (d.adel) {
    if (!confirm('Excluir esta AIH?')) return;
    const { error } = await getDb().from('aih_registros').delete().eq('id', d.adel);
    if (error) toast('Erro ao excluir: ' + error.message); else { toast('AIH excluída.'); S.aihList = null; renderAIH(); }
  }
  else if (d.csv) {
    const esc2 = v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
    const rows = [['Paciente', 'Emissão', 'Médico', 'Dados clínicos', 'Cirurgia']].concat(S.aihList.map(a => { const c = S.aihTab === 'comp' ? matchAih(a) : null; return [a.nome_paciente, fmtIso(a.data_emissao), a.nome_medico, a.dados_clinicos, c ? fmtIso(c.data) : '']; }));
    const blob = new Blob(['﻿' + rows.map(r => r.map(esc2).join(';')).join('\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'aih.csv'; a.click();
  }
  else if (d.addmed) {
    const ctrl = d.addmed === 'c', via = $('#via').value, med = $('#med').value;
    if (!via || !med) return toast('Selecione via e medicamento.');
    S.medVia = via;
    const special = MEDS_SPECIAL[med], nome = special ? special.nome : med;
    (ctrl ? S.medsCtrl : S.meds).push({ via, med: nome });
    const key = ctrl ? 'controlado' : 'receita';
    let cur = getText(key); if (cur && !cur.endsWith('\n')) cur += '\n\n';
    const parts = med.split(' - ');
    S.text[key] = cur + (special ? special.texto : parts.length > 1 ? parts[0] + '\n' + parts.slice(1).join(' - ') : med);
    renderDocs();
  }
  else if (d.delmed) { const [k, i] = d.delmed.split(':'); (k === 'c' ? S.medsCtrl : S.meds).splice(+i, 1); renderDocs(); }
  else if (d.addex) {
    const v = $('#exSel').value; if (!v) return;
    let cur = getText('exames');
    if (cur && !cur.endsWith('\n') && !cur.endsWith(';')) cur += ';\n'; else if (cur.endsWith(';')) cur += '\n';
    S.text.exames = cur + v + ';'; renderDocs();
  }
  else if (t.id === 'mOk') {
    S.prot = { imc: M.imc, tev: M.tev }; delete S.text.receita; closeModal();
    if (M.then === 'prot-aih') await emitirAih();
    else { S.predef.receita = 'pos_op_gastro'; render(); toast('Receita ajustada ao protocolo.'); }
  }
  else if (t.id === 'mCopy') copyText(M.msg, 'Mensagem copiada.');
  else if (t.id === 'eOk') {
    const a = M.edit, { error } = await getDb().from('aih_registros').update({ nome_paciente: $('#eN').value.trim(), nome_medico: $('#eM').value.trim(), data_emissao: $('#eD').value, dados_clinicos: $('#eC').value.trim() }).eq('id', a.id);
    if (error) toast('Erro ao salvar: ' + error.message); else { closeModal(); toast('AIH atualizada.'); S.aihList = null; renderAIH(); }
  }
  else if (t.hasAttribute('data-close')) { closeModal(); if (S.mod === 'aih' && S.aihTab === 'emitir') renderAIH(); }
  else if (t.id === 'clearPt') { $('#pNome').value = ''; S.end = ''; S.cpf = ''; S.acomp = ''; S.prot = null; S.text = {}; S.meds = []; S.medsCtrl = []; render(); toast('Paciente apagado desta aba.'); }
  else if (t.id === 'themeBtn') { const r = document.documentElement; const dark = r.dataset.theme ? r.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme:dark)').matches; r.dataset.theme = dark ? 'light' : 'dark'; }
  else if (t.id === 'logoutBtn') { SS.del('sgdm3_ok'); location.reload(); }
  else if (t.id === 'print') printDocs();
  else if (t.id === 'printApac') { if (!pNome().trim()) return toast('Informe o nome do paciente na faixa acima.'); printPages(apacPages()); }
  else if (t.id === 'copy') { const v = $('#txt') ? $('#txt').value : ($('#admTxt') ? $('#admTxt').value : ''); if (v) copyText(v, 'Texto copiado.'); }
  else if (t.id === 'clr') { if (!confirm('Limpar o conteúdo deste documento?')) return; S.text[S.doc] = ''; S.predef[S.doc] = ''; if (S.doc === 'receita') S.meds = []; if (S.doc === 'controlado') S.medsCtrl = []; renderDocs(); }
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); if (e.key === 'Enter' && e.target.id === 'mImc' && !$('#mOk').disabled) $('#mOk').click(); });
document.addEventListener('change', e => {
  const t = e.target;
  if (t.dataset.pk) { S.bundle[t.dataset.pk] = t.checked; renderDocs(); }
  else if (t.id === 'pre') {
    S.predef[S.doc] = t.value; delete S.text[S.doc];
    if (S.doc === 'receita' && t.value === 'pos_op_gastro' && !S.prot) { renderDocs(); openModal('prot-doc'); } else renderDocs();
  }
  else if (t.name === 'mtev') { M.tev = t.value; updRes(); }
  else if (t.name === 'apm') { S.apacTab = t.value; refreshPreview(); }
  else if (t.id === 'bp') { S.aihStatus = t.value; renderAIH(); }
  else if (t.dataset.adm) {
    const k = t.dataset.adm, v = t.value;
    if (k === 'desc') { S.admin.desc = v && DESCRICOES[v] ? DESCRICOES[v] : ''; }
    else if (k === 'evo') { S.admin.evo = v && EVOLUCOES[v] ? EVOLUCOES[v] : ''; const b = $('#selBiz'); if (b) b.value = ''; }
    else { S.admin.evo = v && BIZUARIO[v] ? BIZUARIO[v] : ''; const b = $('#selEvo'); if (b) b.value = ''; }
    $('#admTxt').value = k === 'desc' ? S.admin.desc : S.admin.evo;
  }
});
document.addEventListener('input', e => {
  const t = e.target;
  if (t.id === 'mImc') { M.imc = t.value; updRes(); }
  else if (t.id === 'txt') { S.text[S.doc] = t.value; refreshPreview(); }
  else if (t.id === 'doctor') { S.doctor = t.value; LS.set('sgdm3_doctor', t.value); refreshPreview(); }
  else if (t.id === 'cEnd') { S.end = t.value; refreshPreview(); }
  else if (t.id === 'cCpf') { t.value = maskCpf(t.value); S.cpf = t.value; refreshPreview(); }
  else if (t.id === 'aNome') { S.acomp = t.value; if (S.text.acompanhante == null || /esteve como acompanhante/.test(S.text.acompanhante)) delete S.text.acompanhante; const tx = $('#txt'); if (tx) tx.value = getText('acompanhante'); refreshPreview(); }
  else if (t.dataset.atb) { S.atb[t.dataset.atb] = t.value; refreshPreview(); }
  else if (t.dataset.af) { S.aih[t.dataset.af] = t.value; refreshPreview(); }
  else if (t.id === 'aMed') { S.aihMedico = t.value; LS.set('sgdm3_aih_medico', t.value); refreshPreview(); }
  else if (t.id === 'bq') { S.aihQ = t.value; const pos = t.selectionStart; renderAIH(); const n = $('#bq'); if (n) { n.focus(); n.setSelectionRange(pos, pos); } }
  else if (t.id === 'pNome') refreshPreview();
});

(function(){ const st = document.createElement('style'); st.textContent = FORMS_CSS; document.head.appendChild(st); })();
initLogin();
