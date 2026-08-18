# 0012 — Listas gerenciais reproduzem as onze abas do sistema

**Data:** 2026-08-13
**Situação:** substituída pela decisão 0013

## Contexto

A primeira versão da Gerência no Design Space transformava o conteúdo em quatro
frentes resumidas, com prioridade e dono. Essa leitura não existe na tela real:
`/backoffice/gerencia` monta onze componentes irmãos dentro da mesma barra de
abas, cada um com filtros e tabela próprios.

A fonte da estrutura é
`lib/bloomy_web/backoffice/live/management/index.ex:10-194`. Os conteúdos de
cada lista vêm dos componentes em
`lib/bloomy_web/backoffice/live/management/`.

## Decisão

O cenário ativo de Listas gerenciais reproduz as onze abas do sistema, na ordem
em que aparecem no LiveView:

1. Supervisor;
2. Aplicadores;
3. Responsáveis Clínicos;
4. Cadastro de Pacientes;
5. Cadastro de Profissionais;
6. Autorizações;
7. Profissionais por Especialidade;
8. Mapa de Horas;
9. Controle de Relatórios;
10. Faltas;
11. PICs.

Cada aba abre por uma fixture própria, mas compartilha o mesmo conjunto de dados
sintéticos e determinísticos. Busca, filtros, estado vazio, situação textual e
os diálogos principais fazem parte da especificação executável. A permissão
continua seguindo `ManagementPolicy`: Admin, Admin de Clínica e Coordenador,
conforme
`lib/bloomy_web/backoffice/live/management/management_policy.ex:1-3`.

## Consequências

- Listas gerenciais deixa de ser apresentada como dashboard inventado pelo
  Design Space.
- As onze entradas novas começaram em `proposed` nesta etapa. A decisão 0013
  restringiu depois a proposta à navegação e reclassificou as listas como
  referências `ported`.
- Fixtures nunca copiam nomes, telefones ou outros registros vistos no ambiente
  real.
- A barra permanece horizontal e rolável, porque a quantidade de abas é parte
  do comportamento existente e não deve ser escondida por agrupamento local.
