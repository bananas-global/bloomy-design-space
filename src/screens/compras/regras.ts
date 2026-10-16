import type { Rule } from "@brucesantos/design-space";

/** As regras de negócio do card, com o porquê de cada uma. */
export const REGRAS: Rule[] = [
  {
    id: "compras.rn-01",
    statement: "RN-01 · Qualquer profissional da unidade pode pedir; o orçamento anexo é opcional.",
    rationale: "Quem sente a falta do material é quem atende. Exigir orçamento de quem está entre duas sessões faz o pedido voltar para o WhatsApp.",
  },
  {
    id: "compras.rn-02",
    statement: "RN-02 · A solicitação tem uma aprovação, da coordenação ou supervisão da unidade do requisitante.",
    rationale: "É quem sabe se a unidade precisa daquilo. A segunda etapa do PMO (\"validar requisição\") repetia a primeira e foi removida.",
  },
  {
    id: "compras.rn-03",
    statement: "RN-03 · Reprovar exige motivo, visível ao requisitante. Devolver para ajuste manda a solicitação de volta para ser corrigida e reenviada.",
    rationale: "Reprovação sem motivo vira pergunta por mensagem e o pedido é refeito igual.",
  },
  {
    id: "compras.rn-04",
    statement: "RN-04 · O comprador cota com 3 fornecedores. Com menos, registra a justificativa (fornecedor único, urgência).",
    rationale: "Três cotações protegem o preço; a justificativa evita travar a compra quando não existem três fornecedores, sem perder o controle.",
  },
  {
    id: "compras.rn-05",
    statement: "RN-05 · O comprador pode cadastrar item e fornecedor na cotação. Se não cadastrou, o cadastro é feito a partir da nota, pelo comprador ou pelo financeiro.",
    rationale: "Na cotação o comprador já tem os dados na mão, mas nem sempre completos; a nota sempre traz CNPJ e itens.",
  },
  {
    id: "compras.rn-06",
    statement: "RN-06 · Alçada em 3 níveis: Compras → Financeiro → CFO. Compras e Financeiro têm limites por pedido, mês e ano; o CFO não tem limite. Dentro do limite de Compras, o pedido não precisa de outra aprovação.",
    rationale: "Compra pequena e recorrente não pode esperar a diretoria; os limites mensal e anual impedem que compras pequenas somem um gasto grande sem ninguém ver; o CFO sem limite garante que todo pedido tem quem o aprove.",
  },
  {
    id: "compras.rn-07",
    statement: "RN-07 · Acima do limite de um nível, o pedido sobe para o seguinte, que aprova, reprova ou pede nova cotação. Acima do limite do Financeiro, vai direto ao CFO.",
    rationale: "Acima do limite, decide quem responde por um valor maior. \"Nova cotação\" existe porque às vezes o problema é o preço, não a compra.",
  },
  {
    id: "compras.rn-08",
    statement: "RN-08 · Cada pedido recebe um número sequencial único, e a nota do fornecedor é vinculada a esse número.",
    rationale: "Sem número, a nota chega e ninguém sabe a que compra se refere; com número, nota, pedido e solicitação ficam ligados.",
  },
  {
    id: "compras.rn-09",
    statement: "RN-09 · A chegada fica pendente até alguém confirmar. Requisitante, comprador ou aprovador da unidade podem confirmar; o lembrete vai para o requisitante.",
    rationale: "Quem estiver na unidade quando a caixa chega pode conferir, mas uma pessoa precisa ser lembrada, senão cada um acha que o outro já fez.",
  },
  {
    id: "compras.rn-10",
    statement: "RN-10 · A confirmação registra se veio tudo certo ou se houve divergência/devolução (quantidade, item errado, avaria).",
    rationale: "É o único momento em que alguém olha o material de verdade; divergência não registrada aqui vira pagamento de algo que não chegou.",
  },
  {
    id: "compras.rn-11",
    statement: "RN-11 · Toda decisão (aprovação, reprovação, mudança de alçada, confirmação) fica no histórico com quem, quando e motivo.",
    rationale: "Compra envolve dinheiro e mais de uma pessoa; quando algo der errado, o histórico responde quem decidiu o quê.",
  },
  /* Propostas do design para lacunas do card: validar com o PO. */
  {
    id: "compras.p-01",
    statement: "P-01 · Ninguém aprova o próprio pedido. Se quem pede é a coordenação da unidade, aprova a supervisão (e vice-versa).",
    rationale: "Pela RN-02 a coordenadora aprovaria a própria solicitação, o que tira o sentido da aprovação. A outra metade da dupla da unidade conhece a mesma necessidade.",
  },
  {
    id: "compras.p-02",
    statement: "P-02 · Nota com valor diferente do pedido em até R$ 10 vincula direto; acima disso, pede justificativa, que vai para o histórico. Nota maior que o pedido avisa o Financeiro.",
    rationale: "Centavos e arredondamento não podem travar o vínculo, mas frete ou item cobrado à parte é dinheiro que ninguém aprovou.",
  },
  {
    id: "compras.p-03",
    statement: "P-03 · A chegada aceita entrega parcial: registra quanto chegou e continua pendente, com o lembrete, até chegar o restante.",
    rationale: "Sem isso, entrega em duas vezes vira divergência, e a divergência dispara uma tratativa com o fornecedor que não é necessária.",
  },
  {
    id: "compras.p-04",
    statement: "P-04 · Quem pediu pode cancelar a própria solicitação enquanto ela não chegou a Compras (aprovação da unidade ou ajuste). O motivo é opcional.",
    rationale: "Se a necessidade some (doação, material achado no estoque), a solicitação não pode ficar parada na fila do aprovador.",
  },
  {
    id: "compras.p-05",
    statement: "P-05 · A cotação avisa quando o prazo do fornecedor passa da data desejada; se o vencedor atrasa, a emissão do pedido avisa o requisitante.",
    rationale: "A data desejada é pedida no RF-01, mas nada a usava: o comprador escolhia o mais barato sem ver que ele chega tarde demais.",
  },
  {
    id: "compras.p-06",
    statement: "P-06 · Compras vê a solicitação a partir da aprovação da unidade; antes disso (aprovação, ajuste, reprovada, cancelada) é assunto da unidade.",
    rationale: "A fila de Compras deve ter só o que é dela; ver o que ainda pode ser reprovado só gera ruído.",
  },
  {
    id: "compras.rf-02",
    statement: "RF-02 (meio-termo) · Em Minhas solicitações, o motivo de reprovação, devolução ou cancelamento fica num ícone ao lado da etapa, com o texto ao passar o mouse; o texto inteiro, no detalhe.",
    rationale: "O card pede o motivo na lista; o design pediu a lista limpa. O ícone avisa que há motivo sem ocupar a linha.",
  },
  {
    id: "compras.rf-04",
    statement: "RF-04 (meio-termo) · A lista de Compras é uma só, com o filtro Pendência (Cotar, Aguardando alçada, Aguardando nota, Aguardando chegada), cada opção com a contagem.",
    rationale: "O card pede a fila agrupada por pendência; o design pediu todas as compras juntas e filtros só em select. O filtro dá o agrupamento e a contagem sem separar a lista.",
  },
];
