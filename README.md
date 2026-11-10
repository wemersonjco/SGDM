# SGDM

Sistema único da equipe cirúrgica (Clínica IOCI e Hospital Metropolitano de Várzea Grande). Reúne em um só lugar o SGDM atual, o laudo de antimicrobianos, a AIH e a APAC.

Site estático (HTML, CSS e JavaScript puros). Não precisa de build: abra `index.html` ou publique pelo GitHub Pages.

## O que tem

- **Documentos médicos**: receita, receituário controlado, atestados, encaminhamento, relatório, exames, orientações, descrições cirúrgicas, evolução/ambulatório e laudo de antimicrobianos.
- **Pacotes de impressão**: Pós-op gastro imprime receita, atestado (data de ontem), orientações e laudo de antimicrobianos pré-preenchido. Vitaminas pós-op e Pré-op bariátrico também levam as orientações.
- **Protocolo de enoxaparina**: pergunta IMC e história de TEV (TEV: 40 mg 2x/dia por 28 dias; IMC ≥ 50: 40 mg 2x/dia por 14 dias; IMC < 50: 40 mg 1x/dia por 10 dias).
- **AIH**: formulário oficial do SUS. Ao emitir, salva 4 campos no Supabase (paciente, dados clínicos, médico, data), imprime AIH + receita da meia + receita pós-op (com aviso de prévia) e mostra a mensagem para colar no prontuário. Também lista as AIH emitidas e cruza com as cirurgias.
- **Cirurgias (SCC)**: lançamento, dashboard por período, relatórios diário e mensal, CSV/PDF e cadastro de cirurgiões, com as mesmas tabelas do SCC atual.
- **Cadastros**: médicos (nome e assinatura, cada um escolhe o seu nas telas de documentos, AIH e APAC), listas de medicamentos e exames, modelos de texto e dados das unidades. Salvos no Supabase (tabelas `sgdm_medicos` e `sgdm_config`), compartilhados por todos.
- **APAC**: formulário oficial do SUS com todos os campos do procedimento, diagnóstico e observações editáveis. Modelos (EDA, consulta em cirurgia geral e outros que você cadastrar) ficam salvos no Supabase (`sgdm_apac_modelos`) e são compartilhados.

## Dados do paciente

O nome do paciente fica só na memória da aba. Endereço e CPF só aparecem no receituário controlado. Nada é gravado, exceto os 4 campos da AIH.

## Pendências conhecidas

- O login (`IOCI`) é conferido no navegador e as tabelas do Supabase têm acesso público. Endurecer isso fica para uma etapa própria.

- Cadastros: é possível cadastrar novos modelos de texto (receita, atestado, encaminhamento, orientações, descrição cirúrgica, evolução, bizuário) e novas unidades (cabeçalho, rodapé, cidade e espaço para papel timbrado), compartilhados via Supabase.
