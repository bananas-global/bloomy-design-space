import { expect, test } from "@playwright/test";

/**
 * O chrome do backoffice em telefone e em desktop.
 *
 * O drawer do produto **sai da linha do conteúdo** abaixo de `lg` — ele é
 * `fixed` e fecha em zero, e volta por cima quando alguém o abre, com um fundo
 * escurecido. Só a partir de `lg` ele vira a coluna `sticky` de 72px.
 *
 * Isto tem teste porque o porte tinha errado exatamente aqui: a barra de 72px
 * ficava presente em toda largura, e num telefone de 375px ela levava um quinto
 * da tela. Somados os recuos do `main` e do cartão, sobravam 223px de conteúdo.
 * Nada quebrava, nada avisava — a tela só ficava estreita.
 */
const TELEFONE = { width: 375, height: 812 };
const DESKTOP = { width: 1280, height: 900 };
const TELA = "/calls?scenario=calls.queue&chrome=0&panel=0";

test("no telefone o drawer sai da linha e o conteúdo ocupa a tela", async ({ page }) => {
  await page.setViewportSize(TELEFONE);
  await page.goto(TELA);

  const drawer = page.locator(".bloomy-drawer");
  await expect(drawer).toHaveCSS("width", "0px");

  const conteudo = await page.locator("#conteudo").boundingBox();
  expect(conteudo, "o conteúdo precisa existir").not.toBeNull();
  expect(conteudo!.x, "nada de trilho comendo a esquerda").toBe(0);
  expect(conteudo!.width).toBe(TELEFONE.width);
});

test("no telefone o botão do cabeçalho abre o drawer por cima", async ({ page }) => {
  await page.setViewportSize(TELEFONE);
  await page.goto(TELA);

  await page.getByRole("button", { name: "Abrir a navegação" }).click();
  await expect(page.locator(".bloomy-drawer")).toHaveCSS("width", "256px");

  // Aberto, o conteúdo não é empurrado: o drawer flutua sobre ele.
  const conteudo = await page.locator("#conteudo").boundingBox();
  expect(conteudo!.x).toBe(0);
});

/**
 * As abas no telefone: só o ícone, e sem rolagem lateral.
 *
 * Com rótulo, quatro abas pedem 431px — mais que a largura útil de um telefone.
 * O trilho passava a rolar para o lado dentro do cartão, e trilho que rola
 * esconde aba: quem não arrasta não descobre que existe "Automação".
 *
 * O rótulo vira `sr-only` em vez de sumir: ele continua sendo o nome acessível
 * da aba, porque o ícone é `aria-hidden` e uma aba sem nome não anuncia nada.
 */
test("no telefone as abas ficam só com o ícone, e cabem", async ({ page }) => {
  await page.setViewportSize(TELEFONE);
  await page.goto(TELA);

  const trilho = page.locator('[role="tablist"]');
  const medidas = await trilho.evaluate((el) => ({
    largura: Math.round(el.getBoundingClientRect().width),
    conteudo: el.scrollWidth,
    pai: Math.round(el.parentElement!.getBoundingClientRect().width),
  }));

  expect(medidas.conteudo, "as abas cabem sem rolagem lateral").toBeLessThanOrEqual(
    medidas.largura + 1,
  );
  expect(medidas.largura, "e o trilho não passa do grupo que o contém").toBeLessThanOrEqual(
    medidas.pai,
  );

  // O rótulo está escondido, e o nome acessível continua lá.
  await expect(page.getByRole("tab", { name: "Ao vivo" })).toBeVisible();
  const rotulo = await trilho
    .locator('[data-button-tab="live"] span:not([class*="fa-"])')
    .evaluate((el) => Math.round(el.getBoundingClientRect().width));
  expect(rotulo, "no telefone o rótulo não ocupa largura").toBeLessThanOrEqual(1);
});

/**
 * O contrário, e é o caso que estava quebrado: **do tablet para cima a aba
 * mostra o rótulo.**
 *
 * A regra era `sr-only @phone:not-sr-only`, e `not-sr-only` dentro de variante
 * de container não gera CSS no Tailwind 4. Sobrava o `sr-only`, e as abas
 * ficavam só com o ícone em toda largura — num palco de 1736px inclusive.
 *
 * Nada quebrava e nada avisava: o teste do telefone acima continuava verde,
 * porque ele mede o caso em que esconder é o certo. Este mede o outro lado, e é
 * por que a asserção é sobre a **largura** do rótulo e não sobre o nome
 * acessível — o nome acessível estava certo o tempo todo.
 *
 * Quem manda aqui é a largura do **palco**, não a da janela: a regra é consulta
 * de container. E as duas não são a mesma coisa dentro do Design Space — numa
 * janela de 768px o palco mede 488, porque o chrome do próprio Design Space
 * fica com o resto. Foi o que a primeira versão deste teste errou: pediu janela
 * de tablet, recebeu palco de telefone, e reprovou com razão. Então o palco vai
 * fixado, como no teste do preview estreito abaixo.
 */
for (const [nome, palco] of [
  ["tablet", 768],
  ["desktop", 1280],
] as const) {
  test(`num palco de ${nome} as abas mostram o rótulo`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(TELA);
    await page.evaluate((largura) => {
      const stage = document.querySelector(".ds-stage") as HTMLElement;
      stage.style.width = `${largura}px`;
      stage.style.maxWidth = `${largura}px`;
    }, palco);

    const trilho = page.locator('[role="tablist"]');
    const rotulos = await trilho
      .locator('[role="tab"] span:not([class*="fa-"])')
      .evaluateAll((els) => els.map((el) => Math.round(el.getBoundingClientRect().width)));

    expect(rotulos.length, "as três abas têm rótulo no DOM").toBe(3);
    for (const largura of rotulos) {
      expect(largura, "e o rótulo é visível, não `sr-only`").toBeGreaterThan(20);
    }

    const transborda = await trilho.evaluate((el) => el.scrollWidth > el.clientWidth + 1);
    expect(transborda, "com rótulo e tudo, o trilho não rola").toBe(false);
  });
}

/**
 * O marcador cobre o botão ativo, e nada mais.
 *
 * A altura dele era `h-10` em `small` e `h-12` em `normal`, contra um botão que
 * mede 36, 48 ou — no telefone, só com o ícone e sem texto para dar altura de
 * linha — 28. Em `small` sobravam 4px, e no telefone 12: o marcador escapava
 * por cima e por baixo do trilho, e lido de longe parecia uma aba solta fora da
 * moldura. Era o que a revisão de 08/09 apontou.
 *
 * Agora as quatro medidas saem do botão, como a largura já saía. O teste mede
 * nos dois modos, porque o número fixo acertava um deles por acidente.
 */
for (const [nome, viewport] of [
  ["telefone", TELEFONE],
  ["desktop", DESKTOP],
] as const) {
  test(`no ${nome} o marcador cobre o botão ativo e fica dentro do trilho`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto(TELA);

    const trilho = page.locator('[role="tablist"]');
    await expect
      .poll(() =>
        trilho.evaluate((el) => {
          const marcador = el.querySelector("[data-button-tab-marker]") as HTMLElement;
          const ativo = el.querySelector('[aria-selected="true"]') as HTMLElement;
          const dele = marcador.getBoundingClientRect();
          const dela = el.getBoundingClientRect();
          return {
            larguraIgual: marcador.offsetWidth === ativo.offsetWidth,
            alturaIgual: marcador.offsetHeight === ativo.offsetHeight,
            sobraNoTopo: Math.round(dele.top - dela.top),
            sobraNaBase: Math.round(dela.bottom - dele.bottom),
          };
        }),
      )
      .toEqual({
        larguraIgual: true,
        alturaIgual: true,
        // O `p-2` do trilho, intacto nas duas pontas.
        sobraNoTopo: 8,
        sobraNaBase: 8,
      });
  });
}

/**
 * Aba só com ícone é quadrada.
 *
 * Com o recuo horizontal e nada mais, a largura era a do glifo: `fa-users` dá
 * 36, `fa-clock` dá 32, `fa-tower-broadcast` dá 34. Três abas em sequência
 * saíam de tamanhos diferentes, e a do meio — que carrega o contador — dava 65.
 */
test("no telefone cada aba só com ícone é um quadrado, e todas do mesmo tamanho", async ({
  page,
}) => {
  await page.setViewportSize(TELEFONE);
  await page.goto(TELA);

  const caixas = await page
    .locator('[role="tablist"] [role="tab"]')
    .evaluateAll((els) => els.map((el) => `${(el as HTMLElement).offsetWidth}x${(el as HTMLElement).offsetHeight}`));

  expect(caixas.length).toBe(3);
  // Quadrado, e o lado é a altura que a aba tem com rótulo em `small`.
  expect(new Set(caixas), "as três medem 36x36").toEqual(new Set(["36x36"]));
});

/**
 * O contador de aba não desmancha o quadrado: no telefone ele vira canto.
 *
 * Sumir com ele custaria a informação — a Documentação do profissional é a
 * única tela onde esse número aparece. Vira sobreposição de canto, que é o
 * tratamento que o `notification_badge` do `button/1` já dá ao sino do
 * cabeçalho.
 */
test("no telefone o contador da aba vira canto e a aba continua quadrada", async ({ page }) => {
  await page.setViewportSize(TELEFONE);
  await page.goto("/team/documentation?scenario=documents.professional&chrome=0&panel=0");

  const aba = page.locator('[role="tablist"] [role="tab"]', { hasText: "5" });
  const medido = await aba.evaluate((el) => {
    const contador = el.querySelector("span.rounded-full") as HTMLElement;
    return {
      caixa: `${(el as HTMLElement).offsetWidth}x${(el as HTMLElement).offsetHeight}`,
      posicao: getComputedStyle(contador).position,
      numero: contador.textContent,
    };
  });

  expect(medido.caixa, "a aba com contador mede o mesmo que as outras").toBe("36x36");
  expect(medido.posicao, "o contador sai da linha").toBe("absolute");
  expect(medido.numero, "e o número continua na tela").toBe("5");
});

/**
 * A caixa do ícone de `info_card/1` é quadrada, inclusive apertada.
 *
 * Ela é item de flex e cedia largura para o número e o rótulo do lado: 32 de
 * altura por 17, 22 ou 25 de largura, variando com o tamanho do rótulo. Os
 * quatro números do dia em duas colunas num telefone é o caso mais apertado que
 * a tela tem, e é onde a revisão de 08/09 viu.
 */
test("no telefone as caixas de ícone dos números do dia continuam quadradas", async ({ page }) => {
  await page.setViewportSize(TELEFONE);
  await page.goto(TELA);

  const caixas = await page
    .locator('[role="tabpanel"] .rounded-xl.border div.flex.h-8')
    .evaluateAll((els) => els.map((el) => `${(el as HTMLElement).offsetWidth}x${(el as HTMLElement).offsetHeight}`));

  expect(caixas.length, "os quatro números do dia").toBe(4);
  expect(new Set(caixas), "todas 32x32").toEqual(new Set(["32x32"]));
});

/**
 * A aba "Ao vivo" não tem contador.
 *
 * Tinha um `badge` com o tamanho da fila, e ele repetia dentro do trilho o
 * número que o cartão "na fila" dá logo abaixo. O trilho aqui é navegação entre
 * três configurações do agora, não painel de pendência.
 */
test("a aba Ao vivo não repete o tamanho da fila", async ({ page }) => {
  await page.setViewportSize(DESKTOP);
  await page.goto(TELA);

  const aba = page.locator('[data-button-tab="live"]');
  await expect(aba).toHaveText("Ao vivo");
});

/**
 * A revisão de 08/09 11:30, que é toda sobre o telefone ganhar linha de texto.
 *
 * Os quatro achados vinham do mesmo aperto: num palco de 375px o cartão da fila
 * dava 247px de conteúdo, e nele cabem nome, etiqueta, duas linhas de meta, a
 * frase entre aspas e três botões. Não sobrava largura para nada, e o que cedia
 * era sempre o texto.
 */
test("no telefone o cartão do sistema recua 16px, e no desktop volta a 24", async ({ page }) => {
  await page.setViewportSize(TELEFONE);
  await page.goto(TELA);
  const cartao = page.locator("ul.grid li .rounded-2xl").first();
  await expect(cartao).toHaveCSS("padding", "16px");

  await page.setViewportSize(DESKTOP);
  await expect(cartao, "o `p-6` do original continua valendo do @phone para cima").toHaveCSS(
    "padding",
    "24px",
  );
});

/**
 * `info_card/1` empilha no telefone: ícone em cima, número e rótulo embaixo.
 *
 * Lado a lado, a caixa de 32px mais o `gap-4` levam 48 dos 247px, e
 * "precisam de atenção" quebrava em três linhas — os quatro números do dia
 * ficam em duas colunas, então três deles ficavam de alturas diferentes.
 */
test("no telefone os números do dia empilham ícone e texto", async ({ page }) => {
  await page.setViewportSize(TELEFONE);
  await page.goto(TELA);

  const numero = page.locator('[role="tabpanel"] .rounded-xl.border .flex.items-center').first();
  await expect(numero).toHaveCSS("flex-direction", "column");

  await page.setViewportSize(DESKTOP);
  await expect(numero, "e no desktop é uma linha, como `info_card/1`").toHaveCSS(
    "flex-direction",
    "row",
  );
});

/**
 * No telefone, Chamar e Editar ficam só com o ícone — e mantêm o nome.
 *
 * Com os três botões escritos a linha pedia 245px contra 247 de cartão: cabia
 * por um fio, e quebrava em duas linhas na frase mais longa, que é
 * "Chamar novamente". Dispensar continua escrita de propósito: não tem ícone no
 * sistema, e é a ação que tira o cartão da fila.
 */
test("no telefone Chamar e Editar são quadrados, e continuam com nome", async ({ page }) => {
  await page.setViewportSize(TELEFONE);
  await page.goto(TELA);

  const cartao = page.locator("ul.grid li").first();
  const chamar = cartao.getByRole("button", { name: /^Chamar/ });
  const editar = cartao.getByRole("button", { name: "Editar" });
  const dispensar = cartao.getByRole("button", { name: "Dispensar" });

  // O nome acessível é o que faz o `getByRole` acima encontrar cada um.
  for (const botao of [chamar, editar]) {
    const caixa = await botao.evaluate((el) => {
      const alvo = el as HTMLElement;
      return `${alvo.offsetWidth}x${alvo.offsetHeight}`;
    });
    expect(caixa, "quadrado de 48, que é a altura do `button/1` normal").toBe("48x48");
  }

  await expect(dispensar, "Dispensar continua escrita").toHaveText("Dispensar");

  // E a linha inteira cabe numa só, que era o ponto.
  const linhas = await cartao.locator(".mt-auto").evaluate((el) => {
    const alvo = el as HTMLElement;
    return Math.round(alvo.offsetHeight / 48);
  });
  expect(linhas, "os três botões numa linha").toBe(1);
});

test("no desktop Chamar e Editar voltam a ter texto", async ({ page }) => {
  await page.setViewportSize(DESKTOP);
  await page.goto(TELA);

  const cartao = page.locator("ul.grid li").first();
  await expect(cartao.getByRole("button", { name: /^Chamar/ })).toContainText("Chamar");
  await expect(cartao.getByRole("button", { name: "Editar" })).toContainText("Editar");
});

/**
 * O campo de texto cresce com o conteúdo, em vez de rolar por dentro.
 *
 * Tinha 120px de altura e a frase padrão dá quatro linhas num telefone: duas
 * visíveis e duas atrás de uma barra de rolagem de 245px de largura, dentro de
 * uma página que também rola. Quem edita o anúncio precisa ler a frase inteira
 * antes de mexer.
 *
 * O teste mede o encolher também, porque é onde a implementação ingênua falha:
 * ler `scrollHeight` sem zerar a altura antes devolve o maior entre conteúdo e
 * caixa, e o campo que cresceu uma vez nunca mais desceria.
 */
test("no telefone o campo de texto cresce e encolhe com o conteúdo, sem rolar", async ({
  page,
}) => {
  await page.setViewportSize(TELEFONE);
  await page.goto(TELA);

  await page.locator('[data-button-tab="rules"]').click();
  await page.locator("#conteudo button[aria-expanded]").first().click();

  const campo = page.locator("#on_checkin-texto");
  const medir = () =>
    campo.evaluate((el) => {
      const alvo = el as HTMLTextAreaElement;
      return { util: alvo.clientHeight, conteudo: alvo.scrollHeight };
    });

  const inicial = await medir();
  expect(inicial.conteudo, "a frase padrão já cabe inteira").toBeLessThanOrEqual(inicial.util);

  await campo.fill(
    "{profissional}, {paciente} chegou e está aguardando na recepção. Por favor, comparecer " +
      "à recepção o quanto antes para iniciar o atendimento, pois a família já está aguardando " +
      "há alguns minutos e a sala está livre.",
  );
  const crescido = await medir();
  expect(crescido.util, "o campo cresceu").toBeGreaterThan(inicial.util);
  expect(
    crescido.conteudo,
    "e cabe exatamente, sem os 2px de borda que `scrollHeight` não conta",
  ).toBeLessThanOrEqual(crescido.util);

  await campo.fill("Curto.");
  const encolhido = await medir();
  expect(encolhido.util, "e volta ao piso de `min-h-24` ao apagar").toBe(inicial.util);

  await expect(campo, "a barra de rolagem não existe mais").toHaveCSS("overflow-y", "hidden");
});

/**
 * O caso que denunciou tudo: **o preview do Design Space**.
 *
 * Quando alguém escolhe "celular" no controle de viewport, quem encolhe é
 * `.ds-stage` — a janela do navegador continua larga. Consultas de mídia seguem
 * a janela, então `md:` e `lg:` não disparavam ali: a revisão via o menu lateral
 * de 72px, cartões em duas colunas e as abas largas dentro de um palco de 375px,
 * e concluía que a tela estava quebrada no telefone.
 *
 * O motor já declara `container-type: inline-size` no palco. A tela passou a
 * usar consultas de **container** — `@tablet`, `@desktop`, `@wide` —, com os
 * mesmos valores dos pontos de quebra. Numa janela de verdade dá no mesmo; no
 * preview, só o container acerta.
 */
test("o preview estreito responde como um telefone, mesmo em janela larga", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(TELA);
  await page.evaluate(() => {
    const palco = document.querySelector(".ds-stage") as HTMLElement;
    palco.style.width = "375px";
    palco.style.maxWidth = "375px";
  });

  // `expect.poll` e não uma medição só: encolher o palco por `style` não
  // reavalia as consultas de container no mesmo tique. Medido de uma vez, este
  // teste reprovava com `drawer: 72` em duas de cada três execuções — via o
  // palco já estreito e o drawer ainda no estado largo. Não era a tela.
  await expect
    .poll(() =>
      page.evaluate(() => {
        const em = (s: string) => document.querySelector(s) as HTMLElement;
        const trilho = em('[role="tablist"]');
        return {
          drawer: Math.round(em(".bloomy-drawer").getBoundingClientRect().width),
          conteudo: Math.round(em("#conteudo").getBoundingClientRect().width),
          colunasDaFila: getComputedStyle(em("ul.grid")).gridTemplateColumns.split(" ").length,
          trilhoTransborda: trilho.scrollWidth > trilho.clientWidth + 1,
        };
      }),
    )
    .toEqual({
      // O menu lateral sai da linha, o conteúdo fica com o palco inteiro, um
      // cartão embaixo do outro, e as abas cabem sem rolagem lateral.
      drawer: 0,
      conteudo: 375,
      colunasDaFila: 1,
      trilhoTransborda: false,
    });
});

test("no desktop o drawer volta a ser a barra de 72px", async ({ page }) => {
  await page.setViewportSize(DESKTOP);
  await page.goto(TELA);

  await expect(page.locator(".bloomy-drawer")).toHaveCSS("width", "72px");
  await expect(page.getByRole("button", { name: "Abrir a navegação" })).toBeHidden();
});
