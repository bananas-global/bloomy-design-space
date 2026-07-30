# 0004 — Preview público, sem autenticação

**Data:** 2026-07-30
**Status:** aceita
**Decidido por:** Bruno Santos, para todos os Design Spaces

## Decisão

Vercel Authentication desligada para preview. Quem tem o link abre, sem conta e
sem login.

## Modelo de proteção

A URL não é adivinhável e o `vercel.json` manda `X-Robots-Tag: noindex, nofollow`.
É isso, e é deliberado — o mesmo modelo de link compartilhado que o Figma usa há
anos e que o time já opera no dia a dia.

## Por quê

Porque é o ponto do ambiente: PO, negócio e cliente abrem uma situação e discutem
regra a partir de um link. Fechar custaria mais do que parece — Vercel
Authentication exige que cada revisor seja membro do time na Vercel, e no plano Pro
seat é pago, então mandar um fluxo para um cliente deixaria de ser mandar um link.
