# Termo de Aceite Eletrônico — #1876

Fonte: https://github.com/sidedoor-tech/bloomy/issues/1876 e atualização de Rafael Rosa em 20/10/2026: https://github.com/sidedoor-tech/bloomy/issues/1876#issuecomment-6301820299.

## UX implementada

Aba Relatórios do paciente → Novo relatório → Termo de Aceite Eletrônico. Mantém BackofficeLayout, PatientLayout, Header, Input, Modal, Table, Tag e Button. Nenhum componente global, token, permissão gerada ou motor foi alterado. A conferência é uma composição local desses componentes.

O formulário informa responsáveis elegíveis e excluídos sem pedir seleção ou campos extras. Gera um termo por responsável com aceite em qualquer fonte. Sem aceites, bloqueia a ação e mostra a mensagem exata da issue. A tabela demonstra geração, sucesso, erro e nova tentativa por responsável. Apenas quem tem patients.generate_report pode iniciar ou repetir emissão.

A conferência agrupa duplicados legados conforme build4.py: ordenação cronológica, comparação com o último grupo e janela inclusiva de cinco segundos a partir do primeiro registro do grupo. Exige mesmo responsável, IP, dispositivo e versão. Preserva todos os identificadores. Não aplica deduplicação temporal a documentos distintos do sistema novo.

V1 possui três anexos. V2 possui quatro, com a Política de Assiduidade como Anexo 4. Em v1+v2, textos idênticos são deduplicados pelo SHA-256, preservando ordem das versões e cobertura de cada aceite. A mudança de e-mail nos Termos de Uso faz o exemplo combinado ter cinco anexos. Isso segue a atualização de 20/10 e diverge do critério antigo que fixa quatro. A Política passa a Anexo 5 nesse caso, conforme a ordenação do build4.py. Validar essa numeração combinada com Rafael antes do handoff definitivo.

## Limites e implementação no Phoenix

Este repositório demonstra UX, com dados e hashes sintéticos. Não consulta pacientes, não registra consentimento, não cria relatórios reais, não gera PDF e não baixa arquivo. “Baixar” apresenta um erro de indisponibilidade, pois não há arquivo real associado. Avisos sobre dados fictícios, demonstração ou simulação não fazem parte da interface; essa limitação fica somente nesta documentação técnica. A prévia mostra registros, anexos e declarações do app; não é o layout jurídico integral.

O backend deve validar a elegibilidade novamente, manter um patient_report por responsável, usar os textos históricos corretos e as versões aceitas do sistema novo (content_html sanitizado, content_hash e assinatura). Incluir no PDF todas as seções pedidas na issue: identificação, declaração, registros, documentos, histórico, autenticidade, fechamento e anexos completos; cabeçalho/rodapé, SHA-256 persistido, datas de Brasília e quebra de página por anexo. Não cadastrar documentos legados em legal_documents nem disparar novos pedidos de aceite.

A declaração jurídica permanece sujeita à validação do jurídico antes do merge, conforme a issue. O desenho não afirma que essa aprovação ocorreu. A referência com dados reais foi consultada apenas como contexto; não foi copiada para fixtures.

Cenários registrados em registro.ts são a fonte dos critérios para revisão. Commit, PR e publicação do preview autorizados para revisão. O pipeline publica automaticamente a branch. Merge e publicação em produção continuam pendentes de autorização.

## Validação local

- `CI=true pnpm check`: typecheck, 16 testes (12 de regras da demanda e 4 do catálogo) e build aprovados.
- Navegador: agrupamento v2 com dois IDs, emissão somente para o responsável elegível, bloqueio sem aceites, ausência de geração sem permissão e nova tentativa após falha conferidos. Formulário inspecionado em desktop e largura de celular.
- Corrigida incompatibilidade preexistente da main: react 19.3.1 / react-dom 19.3.0 deixava a aplicação em branco apesar do build passar. react-dom e lockfile alinhados para 19.3.1; funcionamento confirmado no navegador.
- O build mantém aviso de bundle maior que 500 kB; não impede a compilação.

## Revisão de aderência ao catálogo

Confirmação de geração usa showToast/ToastWrapper, tipo success, por cinco segundos; falhas usam error. Processamento fica apenas no status da tabela, sem banner próprio. O bloqueio no formulário usa FieldError, a relação de responsáveis usa Table, e anexos e declarações usam Card/Header. Removidos os expansores details/summary próprios; os dados dos anexos ficam visíveis. Restam elementos HTML de conteúdo e organização (parágrafos, seções e agrupamentos), sem novos controles ou superfícies visuais fora do catálogo. Nenhum componente compartilhado foi alterado.
