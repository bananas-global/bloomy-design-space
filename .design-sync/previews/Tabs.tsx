import { useEffect, useRef } from "react";
import { Tabs } from "bloomy-design-space";

const ABAS = [
  { title: "Programas", content: <p className="text-sm text-neutral-900">Programas estruturados em aquisição.</p> },
  { title: "Protocolos", mobileTitle: "Prot.", content: <p className="text-sm text-neutral-900">ABLLS-R e protocolos de avaliação.</p> },
  { title: "Histórico", content: <p className="text-sm text-neutral-900">Alterações registradas no plano.</p> },
];

/** Abre uma aba ao montar, como um clique do usuário. */
function useAbaInicial(selector: string) {
  const done = useRef(false);
  useEffect(() => {
    if (done.current) return;
    done.current = true;
    document.querySelector<HTMLElement>(selector)?.click();
  }, [selector]);
}

export const ComMobileTitle = () => <Tabs id="tabs-plano" tab={ABAS} />;

export const SegundaAbaAtiva = () => {
  useAbaInicial("#tabs-plano-2-tab-1");
  return <Tabs id="tabs-plano-2" tab={ABAS} />;
};

export const FichaDoPaciente = () => (
  <Tabs
    id="tabs-ficha"
    tab={[
      {
        title: "Dados pessoais",
        content: (
          <div className="space-y-1 text-sm text-neutral-900">
            <p><span className="font-bold">Nome:</span> Helena Martins</p>
            <p><span className="font-bold">Nascimento:</span> 14/03/2020</p>
            <p><span className="font-bold">Responsável:</span> Marina Alves</p>
          </div>
        ),
      },
      { title: "Plano de Intervenção", content: <p className="text-sm text-neutral-900">PIC vigente até 30/11/2026.</p> },
      { title: "Documentos", content: <p className="text-sm text-neutral-900">3 documentos anexados.</p> },
      { title: "Faltas", content: <p className="text-sm text-neutral-900">Nenhuma falta no mês.</p> },
    ]}
  />
);
