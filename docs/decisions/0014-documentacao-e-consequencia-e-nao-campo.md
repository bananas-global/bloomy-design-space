# 0014 — Documentação é consequência, e não campo

**Data:** 2026-08-14
**Situação:** em revisão

## Contexto

O time de design construiu no Claude Design um conjunto de fluxos de
documentação — pasta do profissional, credenciamento em operadoras, pasta da
unidade e inativação de profissional. O material é um protótipo em React puro,
fora do vocabulário e dos componentes do produto: estado em stores globais,
datas fixas em três relógios diferentes, e componentes desenhados do zero em vez
dos `core_components` do monólito.

A decisão 0013 já havia registrado que a proposta recebida naquela ocasião
continha um grupo “Documentação” deixado de fora da entrega. Esta é a entrega
daquele tema — vinda pelo caminho que o protótipo de fato usa, que **não** é
Listas gerenciais.

## Decisão

A documentação entra como quatro situações, reconstruídas com os componentes do
sistema (`table`, `button_tabs`, `drawer_modal`, `modal`, `tag`, `input`,
`progress`, `inside_card`, `radio_selector`, `empty_state_card`):

1. **Pasta do profissional** — `/team/:id/documents`
2. **Documentação da equipe** — `/team/documentation`
3. **Inativação de profissional** — `/team/:id/deactivate`
4. **Pasta da unidade** — `/structure/documents`

O eixo é uma pergunta só: *o que faz uma pessoa deixar de poder atender por um
convênio?* São quatro respostas, e três delas não parecem documentação — um papel
que venceu sozinho, um registro sem arquivo atrás, e uma decisão da operadora que
nenhum documento novo desfaz.

### O que estrutura o resto

**Credenciamento é derivado, nunca digitado.** O vínculo com a operadora é
consequência de quais documentos estão compartilhados e válidos, recalculado a
cada mudança. Isso produz um comportamento que assusta na primeira vez e é o
certo: um documento que vence derruba o credenciamento **sem que ninguém aja**.
A tela precisa dizer isso por extenso, porque a primeira reação de quem opera é
procurar quem mexeu — e não existe quem.

A única exceção é o descredenciamento manual, e a assimetria é real: anexar um
papel não desfaz uma decisão que a operadora tomou.

## Três divergências da proposta, resolvidas

O protótipo trazia três incoerências entre telas. Não são achados do monólito —
são do próprio material de design, e por isso foram resolvidas aqui em vez de
reproduzidas.

**1. Janela de aviso.** Sessenta dias no perfil do profissional, trinta no painel
gerencial e trinta na unidade. A mesma pessoa veria o mesmo certificado como
urgente numa tela e tranquilo na outra. **Unificada em trinta dias** — o menor
prazo em que dá para pedir segunda via de conselho, agendar dedetização ou
renovar alvará.

**2. Vencimento no credenciamento da unidade.** No profissional, documento
vencido contava como faltante; na unidade, bastava existir e estar compartilhado.
**Unificado:** vencido conta como falta nos dois escopos. A vistoria da operadora
não distingue um AVCB vencido de um AVCB inexistente.

**3. Encaixe do documento no slot padrão da unidade.** O protótipo reconhecia o
slot por expressão regular sobre o **nome** do documento (`/potabilidade|[áa]gua/i`
e outras onze). Renomear um documento o tirava do slot e reabria uma pendência
resolvida, sem nenhuma ação que explicasse a mudança — e `/[áa]gua/` capturava
qualquer laudo com “água” no título. **O encaixe passa a vir do tipo declarado no
cadastro**, e o tipo fica travado na edição de documento padrão.

## Duas escolhas de versão

**A aba do profissional é a V2.** O protótipo tinha duas: a primeira separava
compartilhamento, documentos padrão e tabela em três seções, com o
compartilhamento como passo encadeado depois de salvar. Isso produzia a pendência
mais comum da pasta — o documento certo, anexado, e invisível para a operadora que
o exige. A V2 é uma área só, e o compartilhamento acontece dentro do próprio
formulário.

**A completude é do escopo aberto.** Somar os três escopos produz um número que
não explica a tela em que aparece: alguém com a pasta profissional impecável
apareceria com 25% porque o ASO não subiu, olhando para uma matriz onde o ASO nem
é coluna.

## Permissões

Não existe permissão de documento de profissional nas 26 policies do monólito —
`patients.view_clinical_document` é de paciente, e nada equivalente existe para
profissional. Esta entrega **não inventa policy**.

A documentação — pasta do profissional, matriz da equipe e inativação — usa
`professionals.edit`, a policy do cadastro a que a pasta pertence. Ela recorta
**admin, admin de clínica, coordenação e People**, e é a mais próxima do recorte
pedido pelo produto ("os admins e People, por enquanto") entre as que existem de
verdade: nenhuma das 104 permissões geradas tem exatamente esse conjunto de
papéis.

Duas consequências para revisar quando a engenharia definir a policy própria:

- **A coordenação entra junto.** É um papel a mais do que a decisão pediu, e vem
  de graça com `professionals.edit`. Cortá-la exigiria perguntar por papel na
  tela, que é justamente o que este repositório proíbe — papéis são acumuláveis
  no monólito (`roles` é bitwise), e a pergunta certa é sempre por permissão.
- **A recepção fica de fora.** Ela vê a lista de profissionais
  (`professionals.list`) e não vê a pasta de documentos. É a diferença que esta
  escolha produz, e é intencional.

A pasta da unidade não entra nesse recorte: ela usa `services.list` para ler e
`units.edit` para editar. `units.list` seria a permissão natural e é **de admin
apenas** — o monólito compara com `"admin_clinic"`, string que não existe na
lista de papéis, e isso já está registrado como divergência na decisão 0002.
Amarrar a leitura a ela deixaria a operação sem enxergar o alvará da unidade em
que trabalha por causa de um defeito de policy, e reproduzir esse defeito num
lugar novo não é fidelidade.

## Limite da entrega

- Listas gerenciais **não** muda: o grupo “Documentação” continua não renderizado
  lá, como a decisão 0013 estabeleceu, e o teste que fixa essa ausência continua
  valendo. A documentação foi para o perfil do profissional e para a Estrutura —
  que é onde o protótipo a coloca e onde o produto decidiu que ela pertence. Não
  é uma pendência da decisão 0013: é a resposta dela.
- O filtro por termos com conector E/OU, presente em cinco telas do protótipo,
  não faz parte desta entrega. As tabelas usam a tabela do sistema, sem filtro
  próprio — introduzir um sexto padrão de filtro exige decisão à parte.
- A exportação de PDF é especificada até a seleção e o critério de recusa; o
  documento gerado não faz parte.

## Consequências

- Quatorze regras novas, todas com implementação em `src/rules/documents.ts` e
  `src/rules/professionalDeactivation.ts` e teste em `tests/rules.test.ts`.
- Dezoito cenários em `in-review`. Eles entram na varredura de jornada e de axe;
  não entram em `scenariosUnderTest` do motor, que é o recorte de aprovado em
  diante. A aprovação registra URL de commit, e não de branch — o handoff explica
  por quê.
- A inativação de profissional passa a ser distinta da de paciente na
  especificação: só ela tem destino de caseload, e é a etapa que não pode ser
  resolvida depois.
- As fixtures reusam as pessoas do cadastro da equipe. A Marina que exige
  assinatura de supervisor é a mesma que está com a quitação do conselho vencida.
