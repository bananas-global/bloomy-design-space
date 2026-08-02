/**
 * Ícones da navegação.
 *
 * O sistema real usa Font Awesome, carregado de fora do repositório — não há
 * glifo vendorizado para copiar. Estes são **desenhos aproximados**, e o nome
 * exato do ícone do monólito fica registrado em cada um para que uma passada
 * futura possa trocá-los pelos verdadeiros sem adivinhar qual era qual.
 *
 * Divergência conhecida do espelho, registrada de propósito: preferir um SVG
 * aproximado a deixar o item sem ícone nenhum, que mudaria a altura da linha e
 * a leitura da navegação inteira.
 */

type IconProps = { className?: string };

function Svg({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className ?? "h-5 w-5 shrink-0"}
    >
      {children}
    </svg>
  );
}

/** `fa-chart-pie` */
export const IconDashboard = ({ className }: IconProps) => (
  <Svg className={className}>
    <path d="M10 2.5v7.5h7.5A7.5 7.5 0 1 0 10 2.5Z" />
    <path d="M12.5 2.9A7.5 7.5 0 0 1 17.1 7.5H12.5V2.9Z" />
  </Svg>
);

/** `fa-calendar-day` */
export const IconAgendamentos = ({ className }: IconProps) => (
  <Svg className={className}>
    <rect x="2.5" y="4" width="15" height="13.5" rx="2" />
    <path d="M2.5 8h15M6.5 2.5v3M13.5 2.5v3" />
    <rect x="5.5" y="10.5" width="5" height="4" rx="0.75" />
  </Svg>
);

/** `fa-table` */
export const IconMapaDaUnidade = ({ className }: IconProps) => (
  <Svg className={className}>
    <rect x="2.5" y="3.5" width="15" height="13" rx="2" />
    <path d="M2.5 8h15M7.5 8v8.5M12.5 8v8.5" />
  </Svg>
);

/** `fa-users` */
export const IconPacientes = ({ className }: IconProps) => (
  <Svg className={className}>
    <circle cx="7.5" cy="7" r="2.75" />
    <path d="M2.5 16.5c0-2.5 2.2-4.25 5-4.25s5 1.75 5 4.25" />
    <path d="M13.5 5.6a2.6 2.6 0 0 1 0 5M14.5 12.6c1.9.5 3 1.9 3 3.9" />
  </Svg>
);

/** `fa-user-plus` */
export const IconLeads = ({ className }: IconProps) => (
  <Svg className={className}>
    <circle cx="8" cy="7" r="2.75" />
    <path d="M3 16.5c0-2.5 2.2-4.25 5-4.25s5 1.75 5 4.25" />
    <path d="M15 7.5v5M12.5 10h5" />
  </Svg>
);

/** `fa-house-chimney-medical` */
export const IconNaClinica = ({ className }: IconProps) => (
  <Svg className={className}>
    <path d="M3 9.5 10 3.5l7 6" />
    <path d="M4.75 8.75v7.75h10.5V8.75" />
    <path d="M10 10.75v3.5M8.25 12.5h3.5" />
  </Svg>
);

/** `fa-memo-circle-check` */
export const IconBiblioteca = ({ className }: IconProps) => (
  <Svg className={className}>
    <path d="M4 3.5h9.5v6M4 3.5v13h5" />
    <path d="M6.5 7h5M6.5 10h3" />
    <circle cx="14" cy="14" r="3.5" />
    <path d="M12.6 14l1 1 1.8-2" />
  </Svg>
);

/** `fa-user-md` */
export const IconProfissionais = ({ className }: IconProps) => (
  <Svg className={className}>
    <circle cx="10" cy="6.5" r="2.75" />
    <path d="M5 16.5c0-2.6 2.2-4.5 5-4.5s5 1.9 5 4.5" />
    <path d="M8 9.5v1.5a2 2 0 0 0 4 0V9.5" />
  </Svg>
);

/** `fa-hospital` */
export const IconUnidades = ({ className }: IconProps) => (
  <Svg className={className}>
    <rect x="3.5" y="5" width="13" height="11.5" rx="1.5" />
    <path d="M10 7.5v4M8 9.5h4M7 16.5v-3h6v3" />
  </Svg>
);

/** `fa-bullhorn` */
export const IconAutorizacoes = ({ className }: IconProps) => (
  <Svg className={className}>
    <path d="M4 8.5v3a1.5 1.5 0 0 0 1.5 1.5H7l6 3.5V5L7 8.5H5.5A1.5 1.5 0 0 0 4 8.5Z" />
    <path d="M15.5 8.25a2.5 2.5 0 0 1 0 3.5" />
  </Svg>
);

/** `fa-building` */
export const IconOperadoras = ({ className }: IconProps) => (
  <Svg className={className}>
    <rect x="4.5" y="3" width="11" height="14" rx="1.5" />
    <path d="M7.5 6h2M10.5 6h2M7.5 9h2M10.5 9h2M8.5 17v-3h3v3" />
  </Svg>
);

/** `fa-suitcase-medical` */
export const IconServicos = ({ className }: IconProps) => (
  <Svg className={className}>
    <rect x="2.5" y="6.5" width="15" height="10" rx="2" />
    <path d="M7 6.5v-2a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    <path d="M10 9.5v4M8 11.5h4" />
  </Svg>
);

/** `fa-calendar-xmark` */
export const IconBloqueios = ({ className }: IconProps) => (
  <Svg className={className}>
    <rect x="2.5" y="4" width="15" height="13.5" rx="2" />
    <path d="M2.5 8h15M6.5 2.5v3M13.5 2.5v3" />
    <path d="M8 11.5l4 4M12 11.5l-4 4" />
  </Svg>
);

/** `fa-calendar-pen` */
export const IconAtendimentos = ({ className }: IconProps) => (
  <Svg className={className}>
    <path d="M17.5 9.5V6a2 2 0 0 0-2-2h-11a2 2 0 0 0-2 2v9.5a2 2 0 0 0 2 2H9" />
    <path d="M2.5 8.5h15M6.5 2.5v3M13.5 2.5v3" />
    <path d="M16.5 11.5 12 16v2h2l4.5-4.5a1.4 1.4 0 0 0-2-2Z" />
  </Svg>
);

/** `fa-dollar` */
export const IconFechamentos = ({ className }: IconProps) => (
  <Svg className={className}>
    <path d="M10 2.5v15" />
    <path d="M13.5 6.25c0-1.5-1.6-2.5-3.5-2.5S6.5 4.75 6.5 6.25 8.1 8.6 10 9s3.5 1.2 3.5 2.75-1.6 2.5-3.5 2.5-3.5-1-3.5-2.5" />
  </Svg>
);

/** `fa-gear` */
export const IconGerencia = ({ className }: IconProps) => (
  <Svg className={className}>
    <circle cx="10" cy="10" r="2.5" />
    <path d="M10 2.5v2M10 15.5v2M2.5 10h2M15.5 10h2M4.7 4.7l1.4 1.4M13.9 13.9l1.4 1.4M15.3 4.7l-1.4 1.4M6.1 13.9l-1.4 1.4" />
  </Svg>
);

/** `fa-user-tie` */
export const IconColaboradores = ({ className }: IconProps) => (
  <Svg className={className}>
    <circle cx="10" cy="6" r="2.75" />
    <path d="M5 17c0-2.4 2.2-4.25 5-4.25s5 1.85 5 4.25" />
    <path d="M10 9.25 8.75 11 10 16l1.25-5L10 9.25Z" />
  </Svg>
);

/** `fa-people-group` */
export const IconSupervisao = ({ className }: IconProps) => (
  <Svg className={className}>
    <circle cx="5.5" cy="6.5" r="2" />
    <circle cx="14.5" cy="6.5" r="2" />
    <circle cx="10" cy="11" r="2.25" />
    <path d="M2 13c0-1.7 1.6-3 3.5-3M18 13c0-1.7-1.6-3-3.5-3M5.75 17.5c0-2 1.9-3.5 4.25-3.5s4.25 1.5 4.25 3.5" />
  </Svg>
);

/** `fa-sidebar` — o botão que recolhe o drawer, no cabeçalho. */
export const IconSidebar = ({ className }: IconProps) => (
  <Svg className={className}>
    <rect x="2.5" y="4" width="15" height="12" rx="2" />
    <path d="M8 4v12" />
  </Svg>
);
