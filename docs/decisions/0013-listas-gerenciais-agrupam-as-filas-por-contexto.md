# 0013 — Listas gerenciais agrupam as filas por contexto

**Data:** 2026-08-13
**Situação:** proposta

## Contexto

O sistema real apresenta onze listas irmãs numa única barra horizontal. A
decisão 0012 reproduziu esse baseline para tornar o conteúdo existente
verificável, mas a quantidade de opções exige que a pessoa leia a barra inteira
antes de encontrar a fila procurada.

O time de design propôs trocar a lista plana por grupos orientados ao contexto
de trabalho. A proposta recebida também contém “Documentação”, mas esse grupo
ainda não faz parte da entrega e não deve aparecer vazio ou desabilitado.

## Decisão

As onze listas existentes permanecem disponíveis, reorganizadas assim:

1. **Operação:** Cadastro de Pacientes, Cadastro de Profissionais e
   Autorizações;
2. **Agenda:** Mapa de Horas e Faltas Profissionais;
3. **Assistencial:** Supervisores, Aplicadores, Responsáveis Clínicos e Planos
   terapêuticos;
4. **Relatórios:** Profissionais por Especialidade e Controle de Relatórios.

“PICs” passa a aparecer na navegação como “Planos terapêuticos”; o conteúdo e o
vocabulário técnico interno do plano de intervenção comportamental permanecem.

“Profissionais por Especialidade” não estava nomeado nos recortes da proposta.
Ele fica em Relatórios porque é uma agregação da composição da equipe. Essa
classificação preserva a lista existente e fica explícita para revisão do time
de desenvolvimento.

“Documentação” não é renderizada: não há botão, menu vazio, cenário ou fixture
para esse grupo nesta entrega.

A navegação usa o componente existente `lazy_tabs`, de
`BloomyWeb.Components.LazyTabComponent`, já adotado no perfil do paciente. Isso
preserva o marcador móvel, os menus ancorados e o carregamento da opção sob
demanda; a decisão não cria um terceiro padrão de abas para o produto.

## Limite da entrega

A entrega é somente a reorganização da navegação. Filtros, tabelas, dados,
ações, regras de negócio e permissões das onze listas são referências do sistema
existente e não devem ser reinterpretados ou alterados por esta entrega.

## Consequências

- Cada deep link continua abrindo diretamente a mesma lista e destaca o grupo
  correspondente.
- Trocar de grupo exige escolher uma lista no menu; abrir o menu sozinho não
  altera o conteúdo atual.
- Grupos e itens são navegáveis por teclado, e o item ativo tem indicação em
  texto e semântica, não apenas cor.
- `lazy_tabs` passa a fazer parte do catálogo executável de componentes com o
  nome e a origem usados pelo monólito.
- A proposta muda a arquitetura da informação, não a implementação das
  regras, filtros, tabelas ou permissões de cada lista.
