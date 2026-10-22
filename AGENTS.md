# AGENTS.md

Instruções para agentes e pessoas trabalhando no Bloomy Design Space.

## O que é

A biblioteca de **componentes** e **layouts** do Bloomy, em React, espelhando o
monólito Elixir/Phoenix. Ela é a fonte do design system no Claude Design: o que
se desenha lá usa estas peças, e volta para cá num PR que os devs implementam.

O Bloomy é um sistema de terapia ABA para autismo (programas, fases, protocolos
como o ABLLS-R, aplicadores sob supervisão). Use o vocabulário do produto, de
`priv/gettext/pt_BR/LC_MESSAGES/*.po` do monólito.

## Comandos

```bash
pnpm dev          # http://localhost:5206
pnpm check        # typecheck + testes + build; rode antes de abrir PR
pnpm sync:tokens  # copia os tokens de bloomy/assets/css/app.css
```

## Onde as coisas ficam

| Caminho | Conteúdo |
| --- | --- |
| `src/components/` | Espelhos dos componentes Phoenix (`core_components.ex` e vizinhos). |
| `src/layouts/` | Molduras de página: backoffice, paciente, portal público, operadora, login. |
| `src/catalog/` | Previews de cada componente e layout, com as variantes. |
| `src/tokens/` | `bloomy.generated.css` (gerado, não editar) e as fontes. |
| `src/personas/` | Os dez papéis e a matriz de permissões gerada por `scripts/gen-permissions.mjs`. |
| `src/screens/` | Telas de feature: o design combinado no handoff de cada uma. |

## Regra dos componentes

Fidelidade total ao Phoenix. Um dev lê `<Button variant="outline" color="red">`
e escreve `<.button variant="outline" color="red">` sem pensar.

- Mesmo nome, mesmos atributos e valores do `attr` Phoenix; slots viram props.
- Mesmo markup e mesmas classes Tailwind do HEEx.
- Só os tokens do monólito. Não crie cor, variante ou tamanho que lá não existe.
- Precisa de algo que o sistema não tem? Crie na tela do PR e registre no
  `expected` da rota, numa linha que comece por "Componente novo:", para o dev
  saber que é componente novo. Só entra em `src/components/` depois que existir
  no Phoenix.

## Fluxo: do Claude Design para o PR

1. Desenhe no Claude Design usando o design system do Bloomy (sincronizado
   daqui).
2. Crie uma branch e traga a tela para `src/screens/<Nome>.tsx`, usando um
   layout de `src/layouts/` e componentes de `src/components/`.
3. Registre a tela em `src/screens/<pasta>/registro.ts`, com
   `export const feature: Feature` (tipo em `src/app/features.ts`): uma rota em
   `routes` e um cenário em `scenarios` para cada estado que o dev precisa ver
   (vazio, com dados, erro…), cada um com `id`, `title`, `route`, `fixture` e, se
   o menu importar, `persona`. Os dados ficam em `fixtures`, sintéticos. O
   `product.ts` junta os registros sozinho: não edite ele num PR de tela.
   Cada cenário traz também o critério de aceite, que é o que os devs e os
   agentes de validação vão ler no PR:
   - `intent`: o que o estado mostra; `preconditions` e `actions`, quando
     ajudarem; `rules`, os ids das regras que valem ali.
   - `expected`: uma linha por comportamento que dá para conferir na tela.
     Descreva o comportamento, não o dado da fixture: "o cabeçalho mostra o
     nome da operadora e o registro ANS", não "Unimed, ANS 999901". Quem valida
     confere o sistema real, onde esses valores não existem.
   - `ticket`: o link do card, quando houver.
4. Abra o PR e não escreva a descrição. Cada push publica um preview (workflow
   `deploy.yml`, com o token da Vercel) no link fixo da branch,
   `bloomy-ds-<branch>.vercel.app`, e o motor reescreve a descrição com os
   critérios de aceite gerados do registro: as telas que o PR cria ou altera, com
   um link por cenário, o comportamento esperado, as regras e os componentes
   (decisão 0018 do motor). Nada na descrição se preenche à mão: para mudar um
   critério, mude o `registro.ts` e faça push. O endereço do preview não muda
   entre pushes e mostra sempre a última versão; o PR é o que vai para os devs.
5. Depois de implementada, a tela continua aqui como registro do design
   combinado no handoff. Ela não acompanha o sistema: ajustes feitos depois,
   direto no Phoenix, não voltam para cá sem passar por design. Se remover as
   telas implementadas vai virar regra ainda está em aberto.

## Guardrails

- Nunca use dado real de paciente. Nomes e documentos são fictícios.
- Não edite `src/tokens/bloomy.generated.css` nem `src/personas/permissions.ts`:
  são gerados.
- Não modifique `@brucesantos/design-space` (o motor) para resolver algo do
  Bloomy sem perguntar.
- Tela de portal (totem, família, operadora) usa o layout do portal, sem o menu
  da clínica.
- Não faça push direto na `main`: trabalhe em branch e abra PR.
