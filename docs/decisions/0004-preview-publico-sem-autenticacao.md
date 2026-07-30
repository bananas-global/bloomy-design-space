# 0004 — Preview público, sem autenticação

**Data:** 2026-07-30
**Status:** aceita
**Decidido por:** Bruno Santos, para todos os Design Spaces

## Decisão

Vercel Authentication desligada para preview. Quem tem o link abre, sem conta e
sem login.

## Por quê

Porque é o ponto do ambiente. PO, negócio e cliente precisam abrir uma situação e
discutir regra — qualquer barreira cobra atrito exatamente de quem mais precisa
revisar sem esforço.

## O que fechar custaria

Vale registrar, porque não é óbvio e porque o documento de arquitetura descreve
como "um toggle":

**Vercel Authentication exige que cada pessoa que revisa seja membro do time na
Vercel.** No plano Pro, seat é pago. Fechar o preview não é ligar uma chave — é
passar a administrar acesso e a pagar por revisor, e mandar um fluxo para um
cliente deixa de ser mandar um link.

Se algum dia for necessário fechar, as alternativas a checar antes são Password
Protection (senha compartilhada, sem conta por pessoa) e shareable links por
deployment. Não conferi disponibilidade nem preço das duas no plano atual.

## O que continua valendo

O header `X-Robots-Tag: noindex, nofollow` no `vercel.json`. Preview aberto não é
preview indexado: o endereço continua acessível só para quem recebeu o link.
