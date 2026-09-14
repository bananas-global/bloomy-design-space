# 0020 — Resultados de transferência por status

Data: 2026-09-10 · Situação: proposta

Revisão do backlog visual da Central de Transferências, posterior às decisões
0018 e 0019:

- Retirar da interface o saldo de horas por sala e a contagem de mapas sem
  profissional do cabeçalho. Os mapas continuam na lista e no filtro de situação.
  O cálculo de saldo permanece como referência testada, sem regra ativa de exibição.
- Posicionar o resumo antes da lista de resultados. Pílulas com contagens filtram
  Todos, Cabe, Não cabe junto, Não cabe, Sem mudança e, quando aplicável, Exceção.
  Apenas uma fica selecionada por vez, indicada por `aria-pressed`.
- O filtro é de leitura: não altera a seleção, a simulação nem os mapas que serão
  transferidos ao aplicar. A interface explicita isso e mantém a quantidade na
  ação de aplicar. Contagens zero permanecem disponíveis com estado vazio textual.
- Recalcular a simulação restaura Todos. Ao priorizar, o resultado atualizado
  permanece visível e recebe foco, com anúncio da mudança.
- Cards têm a mesma borda e fundo neutros. A etiqueta textual identifica o status;
  remover o ícone redundante. A ação à direita usa `tint` e texto “Priorizar”,
  preservando o nome acessível com o paciente.

Verificação em `tests/e2e/transferencias.spec.ts`: filtros, estado vazio,
quantidade a aplicar invariável e foco após priorizar dentro de um filtro.
