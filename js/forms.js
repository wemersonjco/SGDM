/* Formulários oficiais do SUS (AIH e APAC) e laudo de antimicrobianos, com o mesmo layout dos modelos originais. */
const FORMS_CSS = `
.pgd{font-family:"Times New Roman",Times,serif;font-size:11pt;line-height:1.6;color:#000;display:flex;flex-direction:column;box-sizing:border-box}
.pgd .pc{flex:1}
.pgd .nota{border:1px solid #333;padding:8px 10px;margin:0 0 14px;font-size:9.5pt;font-weight:700;text-align:center;line-height:1.4}

.of{width:210mm;height:297mm;container-type:inline-size;background:#fff;color:#000;font-family:Arial,Helvetica,sans-serif;overflow:hidden;box-sizing:border-box}
.ofi{font-size:1.3cqw;line-height:1.2;padding:3cqw 3.2cqw;display:flex;flex-direction:column;gap:.5em;height:100%;justify-content:space-between;box-sizing:border-box;position:relative}
.ofh{display:flex;gap:.6em;align-items:stretch}
.ofh .logo{border:1px solid #000;width:15%;display:flex;flex-direction:column;align-items:center;justify-content:center;font-weight:700;font-size:1.3em;text-align:center;line-height:1.1}
.ofh .logo small{font-weight:400;font-size:.5em}
.ofh .tt{border:1px solid #000;flex:1;display:flex;align-items:center;justify-content:center;text-align:center;font-weight:700;font-style:italic;font-size:1.35em;padding:.4em}
.os{border:1px solid #000;border-radius:1em;padding:1em .5em .4em;position:relative;display:flex;flex-direction:column;gap:.15em}
.ot{white-space:nowrap;position:absolute;top:-.75em;left:.8em;background:#fff;padding:0 .3em;font-weight:700;font-size:1em}
.os.mid .ot{left:50%;transform:translateX(-50%)}
.ob{background:#000;color:#fff;text-align:center;font-weight:700;padding:.2em;font-size:1em;margin-top:.1em}
.or{display:flex;gap:.2em}
.oc{border:1px solid #000;position:relative;padding:1.25em .4em .2em;min-height:3.2em;min-width:0}
.ol{position:absolute;top:.1em;left:.35em;font-size:.72em;font-weight:700;text-transform:uppercase;line-height:1;white-space:nowrap;max-width:97%;overflow:hidden}
.ov{display:block;font-size:.98em;white-space:pre-wrap;overflow-wrap:anywhere}
.of.apac .oc{min-height:2.9em;padding-top:1.1em}
.of.apac .or{gap:0}
.fls{position:absolute;right:3.2cqw;top:1.4cqw;font-weight:700;font-style:italic;font-size:1.1em}

.atb{font-family:Arial,sans-serif;font-size:12px;color:#000;line-height:1.35;padding:10px;max-width:800px;margin:0 auto;box-sizing:border-box}
.atb .hd{text-align:center;margin-bottom:10px}
.atb h1{font-size:16px;text-align:center;margin:5px 0}
.atb h2{font-size:14px;text-transform:uppercase;text-align:center;margin:10px 0 5px}
.atb h3{font-size:13px;margin:5px 0}
.atb .fg{margin-bottom:8px}
.atb .r{display:flex;flex-wrap:wrap;margin-bottom:5px;align-items:center;gap:0 14px}
.atb u{display:inline-block;min-width:60px;border-bottom:1px solid #000;text-decoration:none;padding:0 3px}
.atb table{width:100%;border-collapse:collapse;margin:8px 0}
.atb th,.atb td{border:1px solid #000;padding:4px;text-align:left;font-size:12px}
.atb .rd,.atb .ck{display:inline-block;width:10px;height:10px;border:1px solid #000;vertical-align:-1px;margin:0 3px 0 6px}
.atb .rd{border-radius:50%}
.atb .on{background:#000;box-shadow:inset 0 0 0 2px #fff}
.atb .ft{margin-top:10px;text-align:center;font-size:10px}
.atb .at{font-size:11px;margin:5px 0}
`;

const esc = s => String(s == null ? '' : s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

/* ---------- células dos formulários oficiais ---------- */
const oc = (n, l, v = '', f = 1, x = '') => `<div class="oc" style="flex:${f};${x}"><span class="ol">${n} - ${l}</span><span class="ov">${esc(v)}</span></div>`;
const orow = (...a) => `<div class="or">${a.join('')}</div>`;
const osec = (t, b, cls = '') => `<div class="os ${cls}"><span class="ot">${t}</span>${b}</div>`;
const ohdr = (t, fls) => `<div class="ofh"><div class="logo">SUS<small>Sistema Único<br>de Saúde</small></div><div class="tt">${t}</div></div>${fls ? '<span class="fls">fls.1/2</span>' : ''}`;

const HOSP = 'HOSPITAL METROPOLITANO DE VARZEA GRANDE';
const CNES_HOSP = '6853781';

/* a: nome, f20..f28, clinica, carater, docTipo, docNum, medico, data */
function aihHTML(a) {
  const doc = `(${a.docTipo === 'CNS' ? ' X ' : '  '}) CNS   (${a.docTipo === 'CPF' ? ' X ' : '  '}) CPF`;
  return `<div class="of"><div class="ofi">${ohdr('LAUDO PARA SOLICITAÇÃO DE AUTORIZAÇÃO<br>DE INTERNAÇÃO HOSPITALAR')}
  ${osec('Identificação do Estabelecimento de Saúde', orow(oc(1, 'NOME DO ESTABELECIMENTO SOLICITANTE', HOSP, 8), oc(2, 'CNES', CNES_HOSP, 2)) + orow(oc(3, 'NOME DO ESTABELECIMENTO EXECUTANTE', HOSP, 8), oc(4, 'CNES', CNES_HOSP, 2)))}
  ${osec('Identificação do Paciente', orow(oc(5, 'NOME DO PACIENTE', a.nome, 7), oc(6, 'Nº DO PRONTUÁRIO', '', 2.4)) + orow(oc(7, 'CARTÃO NACIONAL DE SAÚDE (CNS)', '', 5), oc(8, 'DATA DE NASCIMENTO', '', 1.6), oc(9, 'SEXO', '', 1.4), oc(10, 'RAÇA/COR', '', 1.4)) + orow(oc(11, 'NOME DA MÃE', '', 6.5), oc(12, 'TELEFONE DE CONTATO', '', 2.6)) + orow(oc(13, 'NOME DO RESPONSÁVEL', '', 6.5), oc(14, 'TELEFONE DE CONTATO', '', 2.6)) + orow(oc(15, 'ENDEREÇO (RUA, Nº, BAIRRO)', '', 1)) + orow(oc(16, 'MUNICÍPIO DE RESIDÊNCIA', '', 5), oc(17, 'CÓD. IBGE MUNICÍPIO', '', 1.4), oc(18, 'UF', '', .6), oc(19, 'CEP', '', 1.6)))}
  ${osec('JUSTIFICATIVA DA INTERNAÇÃO', orow(oc(20, 'PRINCIPAIS SINAIS E SINTOMAS CLÍNICOS', a.f20, 1, 'min-height:11em')) + orow(oc(21, 'CONDIÇÕES QUE JUSTIFICAM A INTERNAÇÃO', a.f21, 1, 'min-height:5em')) + orow(oc(22, 'PRINCIPAIS RESULTADOS DE PROVAS DIAGNÓSTICAS (RESULTADOS DE EXAMES REALIZADOS)', a.f22, 1, 'min-height:4.5em')) + orow(oc(23, 'DIAGNÓSTICO INICIAL', a.f23, 4), oc(24, 'CID 10 PRINCIPAL', a.f24, 2), oc(25, 'CID 10 SECUNDÁRIO', '', 2), oc(26, 'CID 10 CAUSAS ASSOCIADAS', '', 2)), 'mid')}
  ${osec('PROCEDIMENTO SOLICITADO', orow(oc(27, 'DESCRIÇÃO DO PROCEDIMENTO SOLICITADO', a.f27, 6), oc(28, 'CÓDIGO DO PROCEDIMENTO', a.f28, 3)) + orow(oc(29, 'CLÍNICA', a.clinica, 2), oc(30, 'CARÁTER DA INTERNAÇÃO', a.carater, 2), oc(31, 'DOCUMENTO', doc, 2), oc(32, 'Nº DOCUMENTO (CNS/CPF) DO PROFISSIONAL SOLICITANTE/ASSISTENTE', a.docNum, 4)) + orow(oc(33, 'NOME DO PROFISSIONAL SOLICITANTE/ASSISTENTE', a.medico, 6), oc(34, 'DATA DA SOLICITAÇÃO', a.data, 1.6), oc(35, 'ASSINATURA E CARIMBO (Nº DO REGISTRO DO CONSELHO)', '', 3.4)), 'mid')}
  ${osec('PREENCHER EM CASO DE CAUSAS EXTERNAS (ACIDENTES OU VIOLÊNCIAS)', `<div class="or"><div style="flex:2;font-weight:700;font-size:.9em;display:flex;flex-direction:column;justify-content:space-around;padding:.2em"><span>36 - (  ) ACIDENTE DE TRÂNSITO</span><span>37 - (  ) ACIDENTE TRABALHO TÍPICO</span><span>38 - (  ) ACIDENTE TRABALHO TRAJETO</span></div><div style="flex:7;display:flex;flex-direction:column;gap:.15em">${orow(oc(39, 'CNPJ DA SEGURADORA', '', 5), oc(40, 'Nº DO BILHETE', '', 2), oc(41, 'SÉRIE', '', 1)) + orow(oc(42, 'CNPJ EMPRESA', '', 5), oc(43, 'CNAE DA EMPRESA', '', 2), oc(44, 'CBOR', '', 1))}</div></div>` + orow(oc(45, 'VÍNCULO COM A PREVIDÊNCIA', '(  ) EMPREGADO    (  ) EMPREGADOR    (  ) AUTÔNOMO    (  ) DESEMPREGADO    (  ) APOSENTADO    (  ) NÃO SEGURADO', 1, 'min-height:2.4em')), 'mid')}
  ${osec('AUTORIZAÇÃO', `<div class="or"><div style="flex:7;display:flex;flex-direction:column;gap:.15em">${orow(oc(46, 'NOME DO PROFISSIONAL AUTORIZADOR', '', 7), oc(47, 'CÓD. ÓRGÃO EMISSOR', '', 2.2)) + orow(oc(48, 'DOCUMENTO', '(  ) CNS   (  ) CPF', 2), oc(49, 'Nº DOCUMENTO (CNS/CPF) DO PROFISSIONAL AUTORIZADOR', '', 7)) + orow(oc(50, 'DATA DA AUTORIZAÇÃO', '', 2), oc(51, 'ASSINATURA E CARIMBO (Nº DO REGISTRO DO CONSELHO)', '', 7))}</div>${oc(52, 'Nº DA AUTORIZAÇÃO DE INTERNAÇÃO HOSPITALAR', '', 3, 'align-self:stretch')}</div>`, 'mid')}
  </div></div>`;
}

/* a: nome, f15, f16, f33, f34, f37, medico, data */
function apacHTML(a) {
  const sc = [18, 21, 24, 27, 30].map(n => orow(oc(n, 'CÓDIGO DO PROCEDIMENTO SECUNDÁRIO', '', 3), oc(n + 1, 'NOME DO PROCEDIMENTO SECUNDÁRIO', '', 6), oc(n + 2, 'QTDE.', '', 1))).join('');
  return `<div class="of apac"><div class="ofi" style="gap:.25em">${ohdr('LAUDO PARA SOLICITAÇÃO/AUTORIZAÇÃO DE<br>PROCEDIMENTO AMBULATORIAL', true)}
  <div class="ob">IDENTIFICAÇÃO DO ESTABELECIMENTO DE SAÚDE (SOLICITANTE)</div>${orow(oc(1, 'NOME DO ESTABELECIMENTO DE SAÚDE SOLICITANTE', 'HOSPITAL METROPOLITANO DE VÁRZEA GRANDE', 8), oc(2, 'CNES', CNES_HOSP, 2))}
  <div class="ob">IDENTIFICAÇÃO DO PACIENTE</div>${orow(oc(3, 'NOME DO PACIENTE', a.nome, 8), oc(4, 'Nº DO PRONTUÁRIO', '', 2)) + orow(oc(5, 'CARTÃO NACIONAL DE SAÚDE (CNS)', '', 5), oc(6, 'DATA DE NASCIMENTO', '', 2), oc(7, 'SEXO', 'Masc. ( )  Fem. ( )', 2)) + orow(oc(8, 'NOME DA MÃE OU RESPONSÁVEL', '', 7), oc(9, 'TELEFONE DE CONTATO', '', 3)) + orow(oc(10, 'ENDEREÇO (RUA, Nº, BAIRRO)', '', 1)) + orow(oc(11, 'MUNICÍPIO DE RESIDÊNCIA', '', 5), oc(12, 'CÓD. IBGE MUNICÍPIO', '', 1.6), oc(13, 'UF', '', .7), oc(14, 'CEP', '', 2))}
  <div class="ob">PROCEDIMENTO SOLICITADO</div>${orow(oc(15, 'CÓDIGO DO PROCEDIMENTO PRINCIPAL', a.f15, 3), oc(16, 'NOME DO PROCEDIMENTO PRINCIPAL', a.f16, 6), oc(17, 'QTDE.', '1', 1))}
  <div class="ob">PROCEDIMENTO(S) SECUNDÁRIO(S)</div>${sc}
  <div class="ob">JUSTIFICATIVA DO(S) PROCEDIMENTO(S) SOLICITADO(S)</div>${orow(oc(33, 'DESCRIÇÃO DO DIAGNÓSTICO', a.f33, 5.5), oc(34, 'CID10 PRINCIPAL', a.f34, 1.5), oc(35, 'CID10 SECUNDÁRIO', '', 1.5), oc(36, 'CID10 CAUSAS ASSOCIADAS', '', 1.5)) + orow(oc(37, 'OBSERVAÇÕES', a.f37, 1, 'min-height:9em'))}
  <div class="ob">SOLICITAÇÃO</div><div class="or"><div style="flex:6.6;display:flex;flex-direction:column">${orow(oc(38, 'NOME DO PROFISSIONAL SOLICITANTE', a.medico, 5), oc(39, 'DATA DA SOLICITAÇÃO', a.data, 1.6)) + orow(oc(40, 'DOCUMENTO', '(  ) CNS   (  ) CPF', 2), oc(41, 'Nº DOCUMENTO (CNS/CPF) DO PROFISSIONAL SOLICITANTE', '', 4.6))}</div>${oc(42, 'ASSINATURA E CARIMBO (Nº REGISTRO DO CONSELHO)', '', 3.4, 'align-self:stretch')}</div>
  <div class="ob">AUTORIZAÇÃO</div><div class="or"><div style="flex:6.6;display:flex;flex-direction:column">${orow(oc(43, 'NOME DO PROFISSIONAL AUTORIZADOR', '', 5), oc(44, 'CÓD. ÓRGÃO EMISSOR', '', 2)) + orow(oc(45, 'DOCUMENTO', '(  ) CNS   (  ) CPF', 2), oc(46, 'Nº DOCUMENTO (CNS/CPF) DO PROFISSIONAL AUTORIZADOR', '', 5)) + orow(oc(47, 'DATA DA AUTORIZAÇÃO', '', 2), oc(48, 'ASSINATURA E CARIMBO (Nº DO REGISTRO DO CONSELHO)', '', 5))}</div><div style="flex:3.4;display:flex;flex-direction:column">${oc(49, 'Nº DA AUTORIZAÇÃO (APAC)', '', 1, 'flex:1')}${oc(50, 'PERÍODO DE VALIDADE DA APAC', '/ /   a   / /', 1)}</div></div>
  <div class="ob">IDENTIFICAÇÃO DO ESTABELECIMENTO DE SAÚDE (EXECUTANTE)</div>${orow(oc(51, 'NOME FANTASIA DO ESTABELECIMENTO DE SAÚDE EXECUTANTE', '', 8), oc(52, 'CNES', '', 2))}
  </div></div>`;
}

/* d: nome, data (dd/mm/aaaa), medico, antimicrobiano, via, posologia, duracao, justificativa */
function atbHTML(d) {
  const R = on => `<i class="rd${on ? ' on' : ''}"></i>`, K = on => `<i class="ck${on ? ' on' : ''}"></i>`;
  return `<div class="atb"><div class="hd"><div>GOVERNO DO ESTADO DE MATO GROSSO</div><div>SECRETARIA DE ESTADO DE SAÚDE</div><div>HOSPITAL METROPOLITANO DE VARZEA GRANDE</div><h1>Hospital Metropolitano de Várzea Grande</h1></div>
  <h2>CONTROLE DA PRESCRIÇÃO DE ANTIMICROBIANOS</h2>
  <div class="fg"><h3>Dados do paciente</h3>
   <div class="r"><span>Nome: <u style="min-width:300px">${esc(d.nome)}</u></span></div>
   <div class="r"><span>Atendimento: <u style="min-width:90px"></u></span><span>Bloco: <u style="min-width:50px"></u></span><span>Leito/Enfermaria: <u style="min-width:90px"></u></span></div>
   <div class="r"><span>Data Internação: <u style="min-width:90px"></u></span><span>Sexo: <u style="min-width:30px"></u></span><span>Idade: <u style="min-width:50px"></u></span></div>
   <div class="r"><span>Peso: <u style="min-width:50px"></u></span></div></div>
  <div class="fg"><b>Indicação de Antimicrobiano:</b> ${R(1)}Profilático ${R(0)}Terapêutico</div>
  <div class="fg"><b>Topografia da Infecção:</b><br>${K(0)}Trato Urinário ${K(0)}Respiratória ${K(0)}Cirurgia<br>${K(0)}Pele e Tecido Subcutâneo ${K(0)}Corrente Sanguínea &nbsp; Outra? Qual? <u style="min-width:120px"></u></div>
  <div class="fg"><b>Classificação da Infecção:</b> ${R(0)}Comunitária ${R(0)}Hospitalar</div>
  <div class="fg"><b>Uso prévio de antimicrobiano:</b> ${R(0)}SIM ${R(1)}NÃO &nbsp; Qual(is): <u style="min-width:200px"></u></div>
  <table><thead><tr><th>Antimicrobiano</th><th>Via</th><th>Posologia</th><th>Duração Prevista do Tratamento</th></tr></thead><tbody><tr><td>${esc(d.antimicrobiano)}</td><td>${esc(d.via)}</td><td>${esc(d.posologia)}</td><td>${esc(d.duracao)}</td></tr></tbody></table>
  <div class="fg"><b>Resultado Microbiológico:</b> ${R(0)}SIM ${R(1)}NÃO</div>
  <div class="fg"><b>Justificativa:</b> <u style="min-width:420px">${esc(d.justificativa)}</u></div>
  <div class="fg"><div class="r"><span><b>Médico Solicitante (assinatura e carimbo):</b> <u style="min-width:200px">${esc(d.medico)}</u></span><span><b>Data:</b> <u style="min-width:80px">${esc(d.data)}</u></span></div></div>
  <div class="fg"><h3>Parecer do SCIH</h3><div class="r"><span><b>Autorizado:</b> ${R(0)}SIM ${R(0)}NÃO</span><span>Dias autorizados: <u style="min-width:30px"></u></span><span>Data: <u style="min-width:70px"></u></span></div><div class="r"><span>Médico do SCIH (assinatura e carimbo): <u style="min-width:200px"></u></span></div></div>
  <div class="fg"><h3>Serviços de Farmácia</h3><div class="r"><span>Recebido em data: <u style="min-width:80px"></u></span><span>Horário: <u style="min-width:50px"></u></span><span>Funcionário: <u style="min-width:140px"></u></span></div><div class="r"><span>Observações: <u style="min-width:420px"></u></span></div></div>
  <div class="at"><strong>ATENÇÃO:</strong> ao optar por antimicrobianos indutores de resistência, avalie a possibilidade de utilizar outras opções mais seguras para uso intra-hospitalar.</div>
  <div class="ft"><p style="margin:2px">Av. Dom Orlando Chaves, s/n. Cristo Rei - Várzea Grande - MT</p><p style="margin:2px">CEP: 78.118-000 - Tel.: 65 3054-9415</p></div></div>`;
}
