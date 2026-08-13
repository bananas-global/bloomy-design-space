# 0010 — Cenários portados não são trabalho ativo

**Data:** 2026-08-12
**Situação:** aceita

## Contexto

Os 274 cenários existentes foram reunidos antes do início do fluxo real de
design e desenvolvimento. Eles registram telas, regras, achados do monólito e
explorações anteriores, mas não passaram por validação de negócio como conjunto.

Os estados usados até aqui confundiam essa origem com maturidade: `in-review`
sugeria uma revisão em curso e `proposed` colocava explorações antigas na mesma
fila das propostas que serão criadas a partir de agora. Promover tudo para
`implemented` também seria incorreto, porque presença no produto real não valida
a tradução feita neste repositório.

## Decisão

Todo o baseline de 274 cenários usa `status: "ported"`, exibido pelo motor como
**Portado — não validado**.

Esse estado significa que o material permanece consultável como referência, mas:

- não está em revisão;
- não foi aprovado;
- não pertence a trabalho ativo de engenharia;
- não representa compromisso de implementação;
- não deve ser validado em massa apenas para trocar de coluna.

Quando um tema entrar no fluxo real, o cenário correspondente será revisto ou
substituído e passará individualmente para `proposed`. Depois seguirá o ciclo
normal: `in-review`, `approved`, `in-implementation` e `implemented`. Se uma nova
decisão substituir uma referência antiga, a antiga poderá virar `superseded`.

## Consequências

- A cobertura do catálogo mostra 274 referências portadas e zero itens nos
  estados de trabalho ativo.
- A entrada padrão mostra somente `Trabalho ativo`, sem módulos vazios. O
  baseline é uma biblioteca separada, aberta por `Ver 274 referências portadas`
  e reproduzida na URL com `view=ported`.
- O recorte padrão `scenariosUnderTest()` do motor não transforma o baseline
  portado em compromisso de manutenção E2E; testes explícitos deste repositório
  continuam disponíveis para conferir sua integridade técnica.
- O histórico e as URLs dos cenários permanecem intactos.
- A decisão 0007 continua descrevendo corretamente o conteúdo proposto do CRM,
  mas sua classificação de ciclo de vida como `proposed` foi substituída por esta
  decisão enquanto ele fizer parte do baseline anterior.
