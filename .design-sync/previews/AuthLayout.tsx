import { AuthLayout } from "bloomy-design-space";
import logoNegative from "../../src/assets/bloomy-logo-negative.svg";

const INPUT =
  "block w-full p-6 h-12 rounded-2xl font-normal disabled:bg-purple-dark/[0.02] focus:ring-0 focus:border-solid focus:border transition-colors duration-200 bg-white text-brand-purple-dark placeholder:text-brand-purple-dark/45 focus:border-brand-purple-light shadow-[0_14px_14px_0] shadow-brand-purple-dark/10 outline-hidden border border-transparent";

export const LoginDaEquipe = () => (
  <AuthLayout>
    <div className="max-w-[480px] w-full">
      <img src={logoNegative} className="mb-32 mx-auto" />

      <div className="flex items-center w-full bg-brand-purple-dark/10 rounded-2xl p-2 gap-x-2 mb-6">
        <button className="p-4 rounded-xl w-full hover:text-brand-purple">Família</button>
        <button className="p-4 rounded-xl w-full hover:text-brand-purple">Operadora</button>
        <button className="p-4 rounded-xl w-full bg-white shadow-[0_14px_14px_0] shadow-brand-purple-dark/10">Equipe</button>
      </div>

      <form className="space-y-8" onSubmit={(event) => event.preventDefault()}>
        <div className="flex flex-col gap-6">
          <div className="relative">
            <input type="email" placeholder="Login" className={INPUT} />
          </div>
          <div className="relative">
            <input type="password" placeholder="Senha" className={INPUT} />
          </div>
        </div>

        <div className="flex justify-end">
          <a href="#" className="self-end font-bold text-brand-neutral hover:text-brand-blue">
            Esqueceu sua senha?
          </a>
        </div>

        <button className="rounded-xl font-bold transition duration-200 ease-in-out active:scale-95 flex justify-center h-12 px-4 py-3 items-baseline bg-brand-purple-light text-white w-full shadow-[0_4px_8px_0] shadow-brand-purple-dark/10">
          Entrar
        </button>
      </form>
    </div>
  </AuthLayout>
);
