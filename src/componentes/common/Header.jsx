/** Cabecera compartida de Calc-Gastos. Mantiene la identidad visual del producto. */
import { FaPiggyBank } from "react-icons/fa";

export default function Header() {
  return (
    <header className="flex flex-col items-center text-center">
      <div className="flex items-center gap-3">
        <FaPiggyBank aria-hidden="true" className="text-emerald-400" size={38} />
        <h1 className="!mb-0 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">Calc-Gastos</h1>
      </div>
      <p className="mt-2 text-sm text-slate-400">Registra tus ingresos, controla tus gastos y entiende mejor tu dinero.</p>
    </header>
  );
}
