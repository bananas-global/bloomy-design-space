# 0004 — Preview público, sem autenticação

**Data:** 2026-07-30
**Status:** aceita
**Decidido por:** Bruno Santos, depois de conferir o contrato do Bloomy

## Contexto

O documento de arquitetura decidiu que o preview do Design Space é público por
padrão (D-11), com uma exceção declarada: contrato de cliente que tenha cláusula
de confidencialidade cobrindo **telas e materiais** do projeto, e não apenas dados
pessoais. Saúde costuma ter.

A verificação ficou como decisão aberta até alguém olhar o contrato.

## Decisão

O contrato do Bloomy não tem cláusula que impeça. **Vercel Authentication fica
desligada para preview neste projeto.** Quem tem o link abre, sem conta e sem
login.

## Consequência que isso cria

A troca só se sustenta enquanto a premissa se sustentar: **não existe dado real
neste repositório.** Com o preview aberto, essa não é mais uma boa prática — é a
única contramedida que resta.

O que isso obriga, na prática:

- Fixture é sempre sintética e sanitizada. Os CPFs deste repositório têm dígito
  verificador inválido de propósito, e nenhum nome, telefone ou número de
  carteirinha vem de registro real.
- Nenhum token de API, senha, dado de saúde ou informação financeira real é
  commitado — nem em fixture, nem em teste, nem em comentário.
- Um adapter que aponte para staging **não** pode existir em branch cujo preview
  seja público. Se algum dia houver necessidade, a variável de ambiente é escopada
  naquela branch e o acesso àquele preview é fechado.
- Captura de tela e log não expõem dado real, porque não há dado real a expor.

Se qualquer uma dessas quatro coisas mudar, esta decisão precisa ser revisitada
antes da mudança, não depois.

## O que continua valendo

- **`noindex`.** O header `X-Robots-Tag: noindex, nofollow` no `vercel.json`
  permanece. Preview aberto não é preview indexado: o endereço continua acessível
  só para quem recebeu o link, e tela de cliente não lançada não aparece em busca.
- **Source mapping fora do preview.** A decisão
  [0003](0003-source-mapping-no-preview.md) não muda. Com o preview aberto, ela
  fica até um pouco mais relevante: o plugin injetaria os caminhos do repositório
  no HTML público.

## Consequências operacionais

Positivas, e são o motivo da decisão:

- PO e cliente revisam por link, sem conta, sem convite, sem atrito.
- O Playwright aponta direto para a URL do preview no CI, sem segredo de bypass,
  header de automação ou shareable link a emitir e revogar.
- Não existe credencial de preview para vazar, porque não existe credencial.

## Escopo

Esta decisão vale **para o Bloomy**. Cada produto tem contrato próprio e precisa
da própria verificação — a Finaya, em particular, é serviço financeiro e ainda não
foi conferida.
