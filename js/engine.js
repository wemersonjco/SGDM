/* Motor de documentos: monta as páginas, mostra a prévia e imprime. Segue o layout de impressão do SGDM atual. */
const DOC_TITLES = {
  receita: 'RECEITA MÉDICA',
  controlado: 'RECEITUÁRIO DE CONTROLE ESPECIAL',
  atestado: 'ATESTADO MÉDICO',
  acompanhante: 'ATESTADO DE ACOMPANHANTE',
  encaminhamento: 'ENCAMINHAMENTO MÉDICO',
  relatorio: 'RELATÓRIO MÉDICO',
  exames: 'SOLICITAÇÃO DE EXAMES',
  orientacoes: 'ORIENTAÇÕES AO PACIENTE'
};
const MARGINS = { metro: { top: 20, bottom: 25 }, ioci: { top: 70, bottom: 20 } };
const UNITS_DEFAULT = {
  metro: { cab: 'SECRETARIA ESTADUAL DE SAÚDE\nHOSPITAL METROPOLITANO\nSERVIÇO DE CIRURGIA BARIÁTRICA', emitente: 'Hospital Metropolitano\nAv. Dom Orlando Chaves, S/N\nVárzea Grande - MT, 78118-187', rodape: 'Av. Dom Orlando Chaves, S/N - Cristo Rei, Várzea Grande - MT, 78118-187.', cidade: 'Várzea Grande - MT' },
  ioci: { cab: '', emitente: 'IOCI - Instituto de Obesidade e Cirurgia\nAv. Érico Gonçalves Preza Filho, 76\nJardim Itália, Cuiabá - MT, 78060-758\n(65) 3028-7000', rodape: '', cidade: 'Cuiabá - MT' }
};
const UNITS = JSON.parse(JSON.stringify(UNITS_DEFAULT));
const footHTML = u => UNITS[u].rodape ? `<div style="text-align:center;font-size:9pt;color:#555;border-top:1px solid #999;padding-top:6px;margin-top:auto">${esc(UNITS[u].rodape)}</div>` : '';
const _OLD_FOOT = '<div style="text-align:center;font-size:9pt;color:#555;border-top:1px solid #999;padding-top:6px;margin-top:auto">Av. Dom Orlando Chaves, S/N - Cristo Rei, Várzea Grande - MT, 78118-187.</div>';

const fmtLong = d => d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
const dayShift = n => { const d = new Date(); d.setDate(d.getDate() + n); return d; };

/* dados comuns a todas as páginas */
function baseData(inst) {
  return {
    inst,
    nome: (document.getElementById('pNome').value || '').trim(),
    endereco: (S.end || '').trim(),
    cpf: (S.cpf || '').trim(),
    doctor: (S.doctor || '').trim(),
    city: UNITS[inst].cidade,
    dateStr: fmtLong(new Date())
  };
}

/* idêntico ao buildDocHTML do SGDM atual */
function buildDocHTML(d, title, content, fontSize, lh) {
  const isM = d.inst === 'metro';
  const isC = title === 'RECEITUÁRIO DE CONTROLE ESPECIAL';
  const fs = fontSize || '11pt';
  const e = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
  let h = '';
  const cab = (UNITS[d.inst].cab || '').split('\n').map(x => x.trim()).filter(Boolean);
  if (cab.length) {
    h += '<div style="text-align:center;padding-bottom:8px;border-bottom:2px solid #333;margin-bottom:20px">';
    cab.forEach((l, i) => { h += i < 2 ? '<h2 style="font-size:12pt;margin:2px 0;font-weight:700">' + e(l) + '</h2>' : '<p style="font-size:10pt;margin:1px 0">' + e(l) + '</p>'; });
    h += '</div>';
  }
  if (isC) {
    h += '<div style="border:1px solid #000;padding:10px;font-size:9pt;text-align:center;float:right;width:220px;margin-left:20px;margin-bottom:10px">';
    h += '<strong>IDENTIFICAÇÃO DO EMITENTE</strong><br>';
    h += e(UNITS[d.inst].emitente);
    h += '</div>';
  }
  h += '<div style="text-align:center;font-size:14pt;font-weight:700;text-decoration:underline;margin:10px 0 20px">' + title + '</div>';
  h += '<div style="margin-bottom:4px;font-size:11pt"><strong>PACIENTE:</strong> ' + e(d.nome || '___________________________') + '</div>';
  if (isC && d.endereco) h += '<div style="margin-bottom:4px;font-size:11pt"><strong>ENDEREÇO:</strong> ' + e(d.endereco) + '</div>';
  if (isC && d.cpf) h += '<div style="margin-bottom:4px;font-size:11pt"><strong>CPF:</strong> ' + e(d.cpf) + '</div>';
  h += '<br>';
  h += '<div style="white-space:pre-wrap;font-size:' + fs + ';text-align:justify;line-height:' + (lh || 1.6) + '">' + e(content) + '</div>';
  h += '<div style="margin-top:28px;font-size:11pt">' + d.city + ', ' + d.dateStr + '.</div>';
  if (d.doctor) {
    h += '<div style="margin-top:50px;text-align:center">';
    h += '<div style="width:250px;border-bottom:1px solid #333;margin:0 auto 8px"></div>';
    h += '<p style="font-size:10pt;margin:0">' + e(d.doctor) + '</p></div>';
  }
  if (isC) {
    h += '<div style="display:flex;gap:20px;margin-top:30px;clear:both">';
    h += '<div style="border:1px solid #000;padding:10px;font-size:9pt;flex:1;line-height:2.2"><strong>IDENTIFICAÇÃO DO COMPRADOR</strong><br>Nome: ___________________________<br>RG: ___________________________<br>Endereço: ___________________________<br>Telefone: ___________________________<br>Cidade/UF: ___________________________</div>';
    h += '<div style="border:1px solid #000;padding:10px;font-size:9pt;flex:1;line-height:2.2"><strong>IDENTIFICAÇÃO DO FORNECEDOR</strong><br>Data: ____/____/________<br>Assinatura do Farmacêutico:<br><br>___________________________</div></div>';
  }
  return h;
}

/* uma página de documento (receita, atestado, orientações...) */
function docPage(inst, o) {
  const d = Object.assign(baseData(inst), o.date ? { dateStr: fmtLong(o.date) } : {});
  return { id: o.id, label: o.label, sub: o.sub || '', kind: 'doc', inst, html: buildDocHTML(d, o.title, o.content, o.fs, o.lh), bottom: o.bottom || '' };
}
const rawPage = (o) => ({ id: o.id, label: o.label, sub: o.sub || '', kind: 'raw', cls: o.cls, html: o.html });

/* ---------- prévia ---------- */
function pageInner(p, forPrint) {
  if (p.kind === 'raw') return p.html;
  const m = MARGINS[p.inst];
  const bottom = p.bottom ? `<div class="nota">${esc(p.bottom)}</div>` : '';
  const foot = footHTML(p.inst);
  return `<div class="pgd" style="min-height:calc(297mm - ${m.top}mm - ${m.bottom}mm)"><div class="pc">${p.html}</div>${bottom}${foot}</div>`;
}
function renderPreview(host, pages, idx) {
  if (!pages.length) { host.innerHTML = '<div class="hint">Nenhuma página selecionada.</div>'; return; }
  const p = pages[Math.min(idx, pages.length - 1)];
  let pad = '', timbre = '';
  if (p.kind === 'doc') {
    const m = MARGINS[p.inst];
    pad = `padding:${m.top}mm 15mm ${m.bottom}mm;`;
    if (p.inst === 'ioci') timbre = `<div class="timbre-ph" style="height:${m.top}mm">(espaço do timbre da clínica, 7,0 cm)</div>`;
  } else if (p.cls === 'rawatb') pad = 'padding:5mm;';
  host.innerHTML = `<div class="pvhost"><div class="pvpage" style="${pad}">${timbre}${pageInner(p)}</div></div>`;
  fitPreview(host);
  if (!host._ro && window.ResizeObserver) { host._ro = new ResizeObserver(() => fitPreview(host)); host._ro.observe(host); }
}
function fitPreview(host) {
  const h = host.querySelector('.pvhost'), pg = host.querySelector('.pvpage');
  if (!h || !pg) return;
  const s = h.clientWidth / pg.offsetWidth;
  pg.style.transform = `scale(${s})`;
  h.style.height = Math.ceil(pg.offsetHeight * s) + 'px';
}

/* ---------- impressão ---------- */
const PRINT_CSS = `
@page doc-metro{size:A4;margin:20mm 15mm 25mm}
@page doc-ioci{size:A4;margin:70mm 15mm 20mm}
@page rawatb{size:A4;margin:5mm}
@page rawof{size:A4;margin:0}
@page rawrep{size:A4;margin:15mm}
*{box-sizing:border-box}
html,body{margin:0;padding:0;background:#fff}
section.s{break-after:page}
section.s:last-child{break-after:auto}
section.doc-metro{page:doc-metro}
section.doc-ioci{page:doc-ioci}
section.rawatb{page:rawatb}
section.rawrep{page:rawrep}
section.rawof{page:rawof;height:296mm;overflow:visible;break-inside:avoid}
/* Impressão dos formulários oficiais sem container queries (cqw) nem contenção de layout: alguns Firefox/impressoras cortam o texto digitado.
   1cqw = 2,1mm; os valores abaixo são os mesmos da prévia, só que em mm fixos. */
.of{container-type:normal!important;contain:none!important;overflow:visible!important;width:210mm;height:296mm}
.ofi{font-size:2.73mm!important;padding:6.3mm 6.72mm!important}
.fls{right:6.72mm!important;top:2.94mm!important}
.ov{text-rendering:geometricPrecision}
*{-webkit-print-color-adjust:exact;print-color-adjust:exact}
`;
function printPages(pages) {
  if (!pages.length) return;
  const body = pages.map(p => {
    const cls = p.kind === 'doc' ? 'doc-' + p.inst : p.cls;
    return `<section class="s ${cls}">${pageInner(p, true)}</section>`;
  }).join('');
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>${FORMS_CSS}${PRINT_CSS}</style></head><body>${body}</body></html>`;
  const f = document.getElementById('printFrame');
  const doc = f.contentDocument || f.contentWindow.document;
  doc.open(); doc.write(html); doc.close();
  setTimeout(() => { f.contentWindow.focus(); f.contentWindow.print(); }, 350);
}
