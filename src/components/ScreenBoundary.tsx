import { Component, type ComponentType, type ReactNode } from "react";
import type { ScreenProps } from "@brucesantos/design-space";
import { fixtures } from "../app/catalog.js";
import { AppShell } from "./AppShell.js";
import { Card, LoadingState } from "./primitives.js";

/**
 * Blindagem das telas.
 *
 * O painel do Design Space deixa escolher **qualquer** fixture do catálogo com
 * **qualquer** rota aberta, e trocar de rota pela navegação mantém a fixture
 * selecionada. Nada garante que os dados que chegam a uma tela tenham o formato
 * que ela espera — e as telas recebem `data: unknown`, que cada uma converte com
 * um `as`. Um `as` é promessa de tipo em tempo de compilação e não protege nada
 * em tempo de execução.
 *
 * Sem esta blindagem, um formato inesperado derruba o render, o React desmonta a
 * árvore inteira e some **até o chrome do Design Space** — a tela fica branca e
 * só volta com recarga. Foi assim que o Bruno encontrou o problema em cerca de
 * metade das telas, minutos depois de eu declarar a noite verde.
 *
 * O diagnóstico aqui não diz “algo quebrou”. Ele compara a fixture ativa com a
 * que o cenário declara e, quando são diferentes — que é o caso comum —, diz
 * exatamente isso, com os dois nomes. Quando são iguais, o defeito é de verdade
 * e a mensagem do erro aparece inteira.
 */

type Props = {
  Screen: ComponentType<ScreenProps>;
  screenProps: ScreenProps;
};

type State = { error: Error | undefined };

class Boundary extends Component<Props, State> {
  override state: State = { error: undefined };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  /**
   * Uma fixture nova precisa poder ser tentada sem recarregar a página.
   *
   * Sem isto o estado de erro gruda: a pessoa troca para a fixture certa e
   * continua vendo a explicação, o que faz a blindagem parecer o defeito.
   */
  override componentDidUpdate(anterior: Props): void {
    const mudou =
      anterior.screenProps.context.fixture?.id !== this.props.screenProps.context.fixture?.id ||
      anterior.screenProps.context.scenario?.id !== this.props.screenProps.context.scenario?.id ||
      // O dado também: numa travessia o cenário já mudou quando o erro foi
      // capturado, e sem isto o estado de erro gruda até a próxima navegação.
      anterior.screenProps.context.data !== this.props.screenProps.context.data;

    if (mudou && this.state.error) this.setState({ error: undefined });
  }

  override render(): ReactNode {
    const { context } = this.props.screenProps;

    // **A janela em que o dado é de antes e o cenário já é o de agora.**
    //
    // Ao navegar por dentro do app, o motor troca cenário e fixture antes de o
    // adapter resolver os dados. Existe pelo menos um render em que
    // `context.data` ainda é o do cenário anterior — e a tela, que converte com
    // um `as` e desreferencia, estoura lendo um campo que não existe naquele
    // formato. Foi isto que apagou metade das telas do Bruno, e o motivo de
    // nenhum dos 874 testes ter visto: todos carregam a página do zero, e numa
    // carga limpa a janela não existe.
    //
    // Com o adapter de fixtures, o dado resolvido **é** o da fixture. Quando as
    // duas referências divergem, ainda estamos na travessia: mostrar o estado de
    // carregamento é mais honesto que renderizar a tela com dado alheio.
    const atravessando =
      context.fixture !== undefined &&
      context.data !== undefined &&
      context.data !== context.fixture.data;

    if (atravessando && !context.isLoading) {
      return (
        <AppShell context={context} title="Carregando a situação">
          <LoadingState label="Trocando de situação" />
        </AppShell>
      );
    }

    const { error } = this.state;
    if (!error) return <this.props.Screen {...this.props.screenProps} />;

    const { scenario, fixture } = this.props.screenProps.context;
    const declarada = scenario?.fixture;
    const ativa = fixture?.id;
    const dadosDeOutraSituacao = declarada !== undefined && ativa !== undefined && declarada !== ativa;
    // O cenário guarda o **id** da fixture; o painel mostra o rótulo. Sem
    // resolver um pelo outro, a frase compara "Agenda do dia, sem conflito" com
    // "overdue-as-coordinator" e obriga quem lê a saber que são a mesma coisa.
    const rotuloDeclarado =
      fixtures.find((candidata) => candidata.id === declarada)?.label ?? declarada;

    // A explicação vai **dentro** do shell de propósito. Renderizá-la solta
    // tirava o `<main id="conteudo">` da página: o marco principal sumia e o
    // atalho “pular para o conteúdo” deixava de ter destino. Um estado de erro
    // que quebra a navegação por teclado troca um problema por outro.
    return (
      <AppShell
        context={this.props.screenProps.context}
        title="Esta situação não pôde ser montada"
        breadcrumb={[{ label: "Design Space" }]}
      >
      <Card className="border-danger-fg/25 bg-danger-bg px-6 py-8">
        <div role="alert">
          <h2 className="m-0 text-[1.0625rem] font-bold text-danger-fg">
            {dadosDeOutraSituacao
              ? "Esta tela está recebendo os dados de outra situação"
              : "Esta tela não conseguiu montar"}
          </h2>

          {dadosDeOutraSituacao ? (
            <>
              <p className="mt-2 max-w-[68ch] text-[0.9375rem] text-navy">
                Os dados em uso são <span className="font-semibold">“{fixture?.label}”</span>, e a
                situação aberta pede <span className="font-semibold">“{rotuloDeclarado}”</span>. Formatos
                diferentes: a tela leu um campo que não existe nestes dados.
              </p>
              <p className="mt-2 max-w-[68ch] text-[0.8125rem] text-[var(--fg-2)]">
                Troque os dados no seletor do rodapé, ou escolha a situação de novo na navegação.
                Nada foi perdido, e não precisa recarregar.
              </p>
            </>
          ) : (
            <>
              <p className="mt-2 max-w-[68ch] text-[0.9375rem] text-navy">{error.message}</p>
              <p className="mt-2 max-w-[68ch] text-[0.8125rem] text-[var(--fg-2)]">
                Os dados em uso são os que a situação declara, então isto é defeito da tela e não
                combinação errada. Vale registrar com o nome da situação aberta.
              </p>
            </>
          )}
        </div>
      </Card>
      </AppShell>
    );
  }
}

/**
 * Envolve uma tela na blindagem, preservando o nome do componente.
 *
 * O nome importa: é ele que aparece no rastro do React e nas mensagens de erro,
 * e um catálogo inteiro de `Blindada` não ajudaria ninguém a achar nada.
 */
export function guard(Screen: ComponentType<ScreenProps>): ComponentType<ScreenProps> {
  function Guarded(props: ScreenProps) {
    return <Boundary Screen={Screen} screenProps={props} />;
  }
  Guarded.displayName = `guard(${Screen.displayName ?? Screen.name})`;
  return Guarded;
}
