/**
 * MÓDULO ESTADÍSTICAS
 * Permite filtrar movimientos por periodo y tipo, consultar totales y categorías,
 * y exportar el resultado filtrado a CSV. La gráfica recibe datos ya agregados.
 */
import { useMemo, useState } from "react";
import { storageService } from "../../services/storageService.js";
import { formatMoney } from "../../domain/money.js";
import { getExpenseTotalsByCategory } from "../../services/analyticsService.js";
import { ExpenseCategoryChart } from "../../components/charts/FinanceCharts.jsx";

const today = () => { const now = new Date(); return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10); };
const firstDay = () => `${today().slice(0, 7)}-01`;
const csvCell = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;

export default function ReportesPage() {
  const state = storageService.getState();
  const [from, setFrom] = useState(firstDay());
  const [to, setTo] = useState(today());
  const [type, setType] = useState("ALL");
  // Fuente única para tabla, tarjetas, gráfica y CSV: todos usan el mismo filtro.
  const filtered = useMemo(() => state.transactions.filter((item) => item.date >= from && item.date <= to && (type === "ALL" || item.type === type)), [state.transactions, from, to, type]);
  const summary = filtered.reduce((acc, item) => { const amount = Math.abs(item.entries?.[0]?.amountMinor || 0); if (item.type === "INCOME") acc.income += amount; else acc.expense += amount; return acc; }, { income: 0, expense: 0 });
  const categories = useMemo(() => getExpenseTotalsByCategory(filtered, state.categories), [filtered, state.categories]);
  /** Exporta exactamente los movimientos filtrados; BOM UTF-8 ayuda a Excel a leer tildes. */
  const exportCsv = () => {
    const rows = [["Fecha", "Tipo", "Descripción", "Categoría", "Método de pago", "Valor COP", "Notas"]];
    filtered.forEach((item) => rows.push([item.date, item.type === "INCOME" ? "Ingreso" : "Gasto", item.description, state.categories.find((cat) => cat.id === item.categoryId)?.name || "Sin categoría", item.paymentMethod === "TRANSFER" ? "Transferencia" : "Efectivo", Math.abs(item.entries?.[0]?.amountMinor || 0), item.notes || ""]));
    const blob = new Blob([`\uFEFF${rows.map((row) => row.map(csvCell).join(";")).join("\r\n")}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = `calc-gastos-${from}-${to}.csv`; anchor.click(); URL.revokeObjectURL(url);
  };
  const inputClass = "w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white";

  return <main className="space-y-6"><header className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-sm font-semibold tracking-wide text-emerald-400">TUS HÁBITOS FINANCIEROS</p><h1 className="!mb-1 text-3xl font-bold text-white">Estadísticas</h1><p className="text-sm text-slate-400">Entiende cómo se mueve tu dinero.</p></div><button type="button" onClick={exportCsv} disabled={!filtered.length} className="rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-bold text-slate-950 hover:bg-emerald-400 disabled:opacity-40">Exportar CSV</button></header>
    <section className="grid gap-3 rounded-2xl border border-slate-800 bg-slate-900/80 p-4 sm:grid-cols-3"><label className="space-y-1 text-xs text-slate-400">Desde<input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} className={inputClass}/></label><label className="space-y-1 text-xs text-slate-400">Hasta<input type="date" value={to} min={from} max={today()} onChange={(e) => setTo(e.target.value)} className={inputClass}/></label><label className="space-y-1 text-xs text-slate-400">Tipo<select value={type} onChange={(e) => setType(e.target.value)} className={inputClass}><option value="ALL">Ingresos y gastos</option><option value="INCOME">Ingresos</option><option value="EXPENSE">Gastos</option></select></label></section>
    <section className="grid gap-3 sm:grid-cols-3"><article className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4"><p className="text-sm text-slate-400">Ingresos</p><p className="mt-2 text-2xl font-bold text-emerald-300">{formatMoney(summary.income)}</p></article><article className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4"><p className="text-sm text-slate-400">Gastos</p><p className="mt-2 text-2xl font-bold text-rose-300">{formatMoney(summary.expense)}</p></article><article className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4"><p className="text-sm text-slate-400">Diferencia</p><p className={`mt-2 text-2xl font-bold ${summary.income - summary.expense >= 0 ? "text-emerald-300" : "text-rose-300"}`}>{formatMoney(summary.income - summary.expense)}</p></article></section>
    <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5"><div className="mb-5"><h2 className="!mb-1 text-lg font-semibold text-white">Gastos por categoría</h2><p className="text-xs text-slate-500">Distribución de los gastos dentro del periodo seleccionado ({filtered.length} movimientos).</p></div>{type === "INCOME" ? <p className="rounded-xl border border-dashed border-slate-700 p-8 text-center text-sm text-slate-500">Selecciona “Ingresos y gastos” o “Gastos” para consultar esta distribución.</p> : <ExpenseCategoryChart categories={categories} />}</section>
    <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80"><div className="border-b border-slate-800 p-5"><h2 className="!mb-1 text-lg font-semibold text-white">Detalle de movimientos</h2></div><div className="overflow-x-auto"><table className="w-full min-w-[600px] text-left text-sm"><thead className="bg-slate-950/70 text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Fecha</th><th className="px-4 py-3">Descripción</th><th className="px-4 py-3">Categoría</th><th className="px-4 py-3">Tipo</th><th className="px-4 py-3">Valor</th></tr></thead><tbody className="divide-y divide-slate-800">{filtered.map((item) => <tr key={item.id}><td className="px-4 py-3 text-slate-400">{item.date}</td><td className="px-4 py-3 text-white">{item.description}</td><td className="px-4 py-3 text-slate-400">{state.categories.find((cat) => cat.id === item.categoryId)?.name || "Sin categoría"}</td><td className="px-4 py-3 text-slate-400">{item.type === "INCOME" ? "Ingreso" : "Gasto"}</td><td className={`px-4 py-3 font-semibold ${item.type === "INCOME" ? "text-emerald-300" : "text-rose-300"}`}>{item.type === "INCOME" ? "+" : "−"}{formatMoney(Math.abs(item.entries?.[0]?.amountMinor || 0))}</td></tr>)}</tbody></table>{!filtered.length && <p className="p-8 text-center text-sm text-slate-500">No hay movimientos para este periodo.</p>}</div></section>
  </main>;
}
