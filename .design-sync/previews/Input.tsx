import { Input } from "bloomy-design-space";

const ESPECIALIDADES = [
  { label: "Aplicador ABA", value: "aba" },
  { label: "Fisioterapia", value: "physiotherapy" },
  { label: "Fonoaudiologia", value: "speech-therapy" },
  { label: "Psicologia", value: "psychology" },
  { label: "Terapia Ocupacional", value: "occupational-therapy" },
];

export const TiposNativos = () => (
  <div className="grid max-w-xl gap-4 md:grid-cols-2">
    <Input id="nome" label="Nome do paciente" placeholder="Nome completo" />
    <Input id="busca" label="Buscar" leftIcon="fa-magnifying-glass" placeholder="Paciente" />
    <Input id="horas" type="number" label="Carga semanal" hint="horas" value="20" />
    <Input id="nascimento" type="date" label="Data de nascimento" value="2020-03-14" />
    <Input id="somente-leitura" label="Somente leitura" value="Não editável" disabled />
    <Input id="senha" type="password" label="Senha" rightIcon="fa-eye" value="segredo" />
  </div>
);

export const ComErro = () => (
  <div className="max-w-sm pb-6">
    <Input id="cep" label="CEP" value="04567" errors={["CEP inválido"]} />
  </div>
);

export const Select = () => (
  <div className="grid max-w-3xl gap-6 pb-6 md:grid-cols-2">
    <Input type="select" id="especialidade" name="professional[specialty]" label="Especialidade" prompt="Selecione a especialidade" value="" options={ESPECIALIDADES} />
    <Input type="select" id="status" name="professional[status]" label="Status profissional" prompt="Selecione o status" value="active" options={[["Ativo", "active"], ["Inativo", "inactive"]]} />
    <Input type="select" id="especialidade-erro" label="Especialidade com erro" prompt="Selecione a especialidade" value="" options={ESPECIALIDADES} errors={["selecione uma especialidade"]} />
    <Input type="select" id="especialidade-bloqueada" label="Especialidade indisponível" prompt="Selecione a especialidade" value="psychology" options={ESPECIALIDADES} disabled />
  </div>
);

export const TextareaCheckboxSwitch = () => (
  <div className="max-w-xl space-y-3">
    <Input type="textarea" id="observacao" label="Observação" placeholder="Como foi o atendimento" />
    <Input type="checkbox" id="supervisao" name="programa[supervisao]" label="Exige supervisão" value />
    <Input type="switch" id="renovacao" name="programa[renovacao]" label="Renovação automática" value />
    <Input type="value_switch" name="programa[dias]" label="Segunda" inputValue="monday" value={["monday"]} />
  </div>
);

export const CounterESlider = () => (
  <div className="max-w-xl space-y-6">
    <Input type="counter" id="tentativas" name="programa[tentativas]" label="Tentativas por sessão" value="3" max={10} />
    <Input type="slider" name="avaliacao[nivel]" label="Nível de ajuda" options={[["Independente", "0"], ["Verbal", "1"], ["Gestual", "2"], ["Física", "3"]]} value="1" />
  </div>
);
