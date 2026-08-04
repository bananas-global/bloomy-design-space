# 0007 — O CRM de leads é proposta, e precisa parecer uma

**Data:** 2026-08-03
**Situação:** aceita

## Contexto

O Bloomy tem hoje uma feature de Leads em `/backoffice/visitas`, no módulo
`Bloomy.Prospects`: lead com responsável, criança e visitas, funil de oito
etapas com histórico de mudanças, conversão em paciente, lista com busca e
quatro cartões de estatística. Ela está portada aqui desde 2026-08-02, no módulo
`prospects` — cinco cenários e quatro regras.

Essa feature não cobre a jornada comercial. Só tem entrada manual; as origens
são três (`indication`, `search`, `others`); não existe operadora do lead,
motivo de perda, dono, timeline de interações, tarefa de follow-up, dedupe nem
vínculo lead→paciente depois da conversão. Na prática, a clínica opera o
comercial num CRM externo e em planilhas do Google Drive, e digita à mão as
listas que as operadoras mandam.

Um protótipo de extensão foi desenhado no Claude Design — oito superfícies,
funil de nove etapas, wizard de importação, integrações de captação e painel de
métricas — e este é o porte dele para cá.

**O problema:** nada disso existe em Elixir. Todo o resto deste repositório
descreve o sistema que roda, traduzido do monólito, com citações conferidas por
`scripts/check-citations.mjs`. Misturar proposta e realidade sem marca tornaria
a especificação impossível de conferir — e o handoff, impossível de confiar.

## Decisão

**Estender o módulo `prospects` em vez de criar um módulo novo.** A proposta é a
mesma feature crescida, não outro produto: os ids de cenário continuam com o
prefixo `prospects.`, e as três jornadas novas convivem com a que já existia. Um
módulo `crm` separado duplicaria o vocabulário do funil em dois lugares e
quebraria a regra de o prefixo do cenário casar com um módulo registrado.

**Marcar todos os vinte e dois cenários novos como `proposed`.** É a marca que
distingue, no painel e no handoff, o que a engenharia traduz do que a engenharia
ainda vai decidir se constrói.

**Repetir a marca na tela.** Todas as telas do CRM abrem com um aviso dizendo que
o funil que roda hoje tem oito etapas em linha e vive em `/backoffice/visitas`.
Sem ele, quem abre o link do quadro vai procurar no monólito uma tela que não
existe — e o link é a forma como este repositório é lido.

**Rotas em `/leads/*`, e `/prospects` intocado.** A proposta renomeia a superfície
de "Visitas" para "Leads", que é a palavra do protótipo e do menu. As cinco
situações que descrevem `/backoffice/visitas` continuam em `/prospects`, com as
telas e regras que já tinham.

## O achado que a migração precisa resolver

`scheduled` significa **duas etapas diferentes** nos dois funis:

| Chave | Funil de hoje | Funil proposto |
| --- | --- | --- |
| `new` | Novo | Novo |
| `initial_contact` / `in_contact` | Contato inicial | Em contato |
| — | *(não existe)* | Qualificado |
| `scheduled` | **Primeira sessão marcada** — depois de `waiting_plan` | **Avaliação agendada** — antes de `in_avaliation` |
| `in_avaliation` | Em avaliação | Em avaliação |
| `submitted` | Proposta enviada | Proposta enviada |
| `waiting_plan` | Aguardando plano | Aguardando operadora |
| `converted` / `lost` | Convertido / Perdido | Convertido / Perdido |

Um `UPDATE` de rótulo deixaria todo o `prospect_step_histories` com a etapa certa
no lugar errado do funil, e a primeira leitura do painel novo mostraria uma
conversão para avaliação que nunca aconteceu. O erro é silencioso: não quebra
nada, só mente nos números.

Por isso `LeadStep` convive com `FunnelStep` em `src/contracts/index.ts` em vez
de substituí-lo, a regra `scheduled-means-two-places-in-the-funnel` fixa o
achado, e o aviso está na própria tela do quadro — que é onde a nova ordem das
etapas aparece pela primeira vez para quem vai implementar.

## Duas coisas que ficaram fora, de propósito

**Permissões.** A especificação da proposta descreve papéis que não existem aqui
— "Comercial", "Gestor", "Marketing". Os papéis do Bloomy são dez, e
`src/personas/permissions.ts` é gerado das 26 policies do monólito, onde não há
nenhuma permissão de CRM. As telas perguntam pela permissão existente mais
próxima (`patients.create`, para efetivar), e a matriz **não foi editada à mão**.
Quando a feature entrar no roadmap, a mudança é em `scripts/gen-permissions.mjs`,
depois que as policies existirem.

**Fase 3 da proposta.** WhatsApp Business API, mensagem automática de boas-vindas
e distribuição round-robin aparecem como texto nas telas de integração e no
quadro, mas não têm cenário próprio: descrevem automação que depende de decisões
que ninguém tomou ainda, e cenário sem critério de aceite não vira caso
verificável.

## Consequências

- 22 cenários novos, todos `proposed`, todos com jornada em
  `tests/e2e/journey.spec.ts` e axe na mesma passagem.
- 13 regras novas em `src/rules/leads.ts`, cada uma com implementação e testes.
- 8 telas novas em `/leads/*`. `/prospects` continua descrevendo o sistema real.
- `LeadStep` e `FunnelStep` coexistem enquanto os dois funis coexistirem. Quando
  a migração acontecer, é `FunnelStep` que sai — junto com os cinco cenários que
  descrevem o funil de hoje.
