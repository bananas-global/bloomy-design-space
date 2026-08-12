# 0009 — Fidelidade visual distingue página real de cenário de regra

## Decisão

Uma rota com LiveView correspondente copia a anatomia desse LiveView. Uma rota
que materializa worker, policy, query ou contradição sem página própria usa os
componentes do módulo pai, mas não é apresentada como cópia de uma tela real.

## Consequência

A revisão visual pode dizer com precisão o que foi espelhado e o que foi
composto. Isso evita transformar a busca por consistência em uma falsa alegação
de que toda regra interna já possui interface no produto.

A matriz vigente fica em `docs/auditoria-visual-2026-08-10.md`.
