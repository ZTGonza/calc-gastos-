/** Pie compartido de la aplicación. Contiene información secundaria de producto. */
export default function Footer() {
  return (
    <footer className="mt-8 w-full border-t border-slate-800 bg-slate-950">
      <div className="mx-auto flex flex-col items-center gap-2 px-4 py-6 text-center">
        <p className="text-xs text-slate-400">© {new Date().getFullYear()} Calc-Gastos</p>
        <p className="text-xs text-slate-600">Finanzas personales, sin complicaciones.</p>
      </div>
    </footer>
  );
}
