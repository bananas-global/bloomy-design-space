# 0006 — O Design Space não pagina, e o produto pagina em 50 lugares

**Data:** 2026-08-02
**Situação:** aceita

## Contexto

O monólito pagina com Flop em **50 schemas**, com `default_limit` de 5, 8, 10 ou
15. Alguns exemplos:

| Coleção | Itens por página |
| --- | --- |
| Registros de controle de horas | 5 |
| Relatórios do paciente | 5 |
| Mapas de horas | 5 |
| Autorizações do paciente | 5 |
| Serviços | 5 |
| Documentos | 8 |
| Fechamentos | 10 |
| Estágios de supervisão | 10 |
| Pacientes, profissionais, visitas | 15 |

O Design Space mostra listas inteiras. Até esta decisão, **paginação não
aparecia em lugar nenhum** — nem em tela, nem em regra, nem em documento.

Isso é uma divergência de especificação, não de estilo: quem aprova a lista de
relatórios aqui aprova uma lista completa, e no produto ela chega de cinco em
cinco.

## Decisão

**Não reproduzir paginação em trinta telas.** Rolagem e paginação são decisões de
implementação; o Design Space existe para fixar comportamento e conteúdo, e
encher as telas de controles de página adicionaria ruído sem fixar nada.

**Declarar o recorte onde ele muda o desenho.** O critério é: o limite é menor
que a unidade de trabalho da tela?

- **Controle de horas — sim, e é o caso mais claro.** A tela existe para conferir
  um mês. `default_limit: 5` significa cinco páginas para vinte e dois dias
  úteis, e o defeito que a tela precisa revelar — meia hora truncada por dia —
  **só é visível somado**. Cinco linhas por vez escondem exatamente a soma.
  Virou a regra `page-size-decides-what-can-be-compared`, com cenário próprio.
- **Relatórios, mapas de horas, autorizações — limite 5, e não muda o desenho.**
  A unidade de trabalho ali é um documento por vez, não o conjunto.
- **Pacientes, profissionais, visitas — limite 15.** Listas de busca; quem
  procura filtra antes de rolar.

O contrato ganhou `PageWindow`, opcional. Ele só é preenchido quando a tela tem
algo a dizer sobre o recorte — e `hiddenByPaging/1` devolve `undefined` quando
tudo cabe numa página, porque **um aviso que aparece sempre é um aviso que
ninguém lê**.

## Consequências

- Uma tela nova cuja unidade de trabalho seja maior que o `default_limit` do seu
  schema precisa declarar o recorte. Não há verificação automática para isso: é
  julgamento, e está escrito aqui para ser exercido de propósito.
- Se a engenharia mudar um limite, a divergência registrada aqui envelhece em
  silêncio. O caminho é o mesmo dos tokens de cor na decisão `0001`: quando o
  produto mudar, esta decisão precisa ser relida.
