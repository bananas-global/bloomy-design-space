# 0008 — Prévias espelham a anatomia do monólito

## Contexto

Pacientes, Plano Terapêutico, Atendimento, Central de autorizações e Na Clínica
tinham regras de negócio exercitáveis, mas não reproduziam os principais
organizadores visuais do Bloomy: filtros, abas, cabeçalhos do paciente e
seletores de visão.

## Decisão

As prévias passam a usar as estruturas observadas nos respectivos LiveViews:

- Pacientes: card único, filtros e tabela;
- Plano Terapêutico: cabeçalho do paciente e navegação por módulos;
- Atendimento: abas de registro, programas, protocolos e feed;
- Central de autorizações: período e seletor de visão;
- Na Clínica: abas separadas para pacientes e profissionais.

Os controles sem suporte na fixture ficam desabilitados. Eles mostram a
anatomia da tela sem prometer uma operação que a especificação ainda não
implementa.

## Consequência

Na Clínica deixa de mostrar pacientes e profissionais simultaneamente. A
jornada precisa selecionar a aba Profissionais para verificar o estado vazio,
como acontece no sistema real.
