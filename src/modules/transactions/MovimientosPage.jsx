/**
 * MÓDULO MOVIMIENTOS
 * Interfaz para registrar, editar, eliminar, buscar y filtrar ingresos/gastos.
 * Las reglas definitivas de validación y persistencia están en transactionService.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { createTransaction, deleteTransaction, listTransactions, updateTransaction } from "../../services/transactionService.js";
import { formatMoney, formatThousandsInput, parseThousandsInput } from "../../domain/money.js";
import { useCurrentDate } from "../../hooks/useCurrentDate.js";
import { storageService } from "../../services/storageService.js";

const EMPTY = { type: "EXPENSE", description: "", amount: "", date: "", categoryId: "", paymentMethod: "CASH", notes: "" };
const inputClass = "w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-white outline-none focus:border-emerald-500";

export default function MovimientosPage() {
  const currentDate = useCurrentDate();
  const [revision, setRevision] = useState(0);
  const [form, setForm] = useState(() => ({ ...EMPTY, date: currentDate }));
  const [editingId, setEditingId] = useState(null);
  const previousCurrentDate = useRef(currentDate);
  const [filterType, setFilterType] = useState("ALL");
  const [filterCategory, setFilterCategory] = useState("ALL");
  const [period, setPeriod] = useState("THIS_MONTH");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  useEffect(() => {
    if (!editingId && form.date === previousCurrentDate.current) {
      setForm((current) => ({ ...current, date: currentDate }));
    }
    previousCurrentDate.current = currentDate;
  }, [currentDate, editingId, form.date]);
  const state = useMemo(() => { void revision; return storageService.getState(); }, [revision]);
  const categories = state.categories.filter((item) => item.active !== false);
  const availableCategories = categories.filter((item) => item.type === form.type);
  const allTransactions = useMemo(() => { void revision; return listTransactions(); }, [revision]);
  const filtered = useMemo(() => {
    const current = currentDate;
    const month = current.slice(0, 7);
    const previousDate = new Date(`${month}-01T00:00:00`); previousDate.setMonth(previousDate.getMonth() - 1);
    const previousMonth = `${previousDate.getFullYear()}-${String(previousDate.getMonth() + 1).padStart(2, "0")}`;
    return allTransactions.filter((item) => {
      const periodMatch = period === "ALL" || (period === "THIS_MONTH" && item.date.startsWith(month)) || (period === "LAST_MONTH" && item.date.startsWith(previousMonth)) || (period === "THIS_YEAR" && item.date.startsWith(current.slice(0, 4))) || (period === "CUSTOM" && (!from || item.date >= from) && (!to || item.date <= to));
      return periodMatch && (filterType === "ALL" || item.type === filterType) && (filterCategory === "ALL" || item.categoryId === filterCategory) && `${item.description} ${item.notes || ""}`.toLowerCase().includes(search.toLowerCase());
    });
  }, [allTransactions, period, from, to, filterType, filterCategory, search, currentDate]);
  const refresh = () => setRevision((value) => value + 1);
  const categoryName = (id) => categories.find((item) => item.id === id)?.name || "Sin categoría";

  /** FUNCIÓN CLAVE DE LA INTERFAZ: decide entre crear o actualizar y delega la validación al servicio. */
  const submit = (event) => {
    event.preventDefault(); setError(""); setSuccess("");
    try {
      const payload = { ...form, amount: parseThousandsInput(form.amount) };
      if (editingId) { updateTransaction(editingId, payload); setSuccess("Movimiento actualizado."); }
      else { createTransaction(payload); setSuccess("Movimiento registrado."); }
      setEditingId(null); setForm({ ...EMPTY, date: currentDate }); refresh();
    } catch (err) { setError(err.message || "No se pudo guardar el movimiento."); }
  };
  /** Carga un movimiento existente en el formulario sin modificarlo todavía. */
  const edit = (item) => {
    setEditingId(item.id);
    setForm({ type: item.type, description: item.description, amount: formatThousandsInput(Math.abs(item.entries[0].amountMinor)), date: item.date, categoryId: item.categoryId || "", paymentMethod: item.paymentMethod || "CASH", notes: item.notes || "" });
    setError(""); setSuccess(""); window.scrollTo({ top: 0, behavior: "smooth" });
  };
  /** Solicita confirmación antes de eliminar y refresca la vista tras persistir el cambio. */
  const remove = (item) => {
    if (!window.confirm(`¿Eliminar el movimiento "${item.description}"?`)) return;
    try { deleteTransaction(item.id); setSuccess("Movimiento eliminado."); setError(""); refresh(); }
    catch (err) { setError(err.message); }
  };
  const totals = filtered.reduce((acc, item) => { if (item.type === "INCOME") acc.income += item.entries[0].amountMinor; else acc.expense += Math.abs(item.entries[0].amountMinor); return acc; }, { income: 0, expense: 0 });

  return <main className="space-y-6">
    <header><p className="text-sm font-semibold tracking-wide text-emerald-400">TUS FINANZAS PERSONALES</p><h1 className="!mb-1 text-3xl font-bold text-white">Movimientos</h1><p className="text-sm text-slate-400">Registra fácilmente el dinero que recibes y el que gastas.</p></header>
    <section className="grid gap-3 sm:grid-cols-2"><article className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4"><p className="text-sm text-slate-400">Ingresos del filtro</p><p className="mt-2 text-2xl font-bold text-emerald-400">{formatMoney(totals.income)}</p></article><article className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4"><p className="text-sm text-slate-400">Gastos del filtro</p><p className="mt-2 text-2xl font-bold text-rose-400">{formatMoney(totals.expense)}</p></article></section>
    <section className="grid items-start gap-6 xl:grid-cols-[minmax(320px,0.85fr)_minmax(0,1.15fr)]">
      <form onSubmit={submit} className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5">
        <div className="mb-5"><h2 className="!mb-1 text-xl font-semibold text-white">{editingId ? "Editar movimiento" : "Nuevo movimiento"}</h2><p className="text-xs text-slate-400">Todos los importes se registran en pesos colombianos.</p></div>
        <div className="mb-4 grid grid-cols-2 gap-2">{[{ value: "EXPENSE", label: "Gasto" }, { value: "INCOME", label: "Ingreso" }].map((option) => <button key={option.value} type="button" onClick={() => setForm((current) => ({ ...current, type: option.value, categoryId: "" }))} className={`rounded-lg border px-3 py-3 text-sm font-semibold ${form.type === option.value ? "border-emerald-500 bg-emerald-500/10 text-emerald-300" : "border-slate-700 text-slate-400"}`}>{option.label}</button>)}</div>
        <div className="space-y-4">
          <label className="block space-y-1.5 text-sm text-slate-300">Descripción<input required maxLength={90} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Ej. Almuerzo, salario, transporte..." className={inputClass}/></label>
          <label className="block space-y-1.5 text-sm text-slate-300">Valor (COP)<input required type="text" inputMode="numeric" autoComplete="off" value={form.amount} onChange={(e) => setForm({ ...form, amount: formatThousandsInput(e.target.value) })} placeholder="10.000" className={inputClass}/></label>
          <label className="block space-y-1.5 text-sm text-slate-300">Categoría<select required value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} className={inputClass}><option value="">Selecciona una categoría</option>{availableCategories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label className="block space-y-1.5 text-sm text-slate-300">Fecha<input required type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className={`${inputClass}`}/></label>
          <label className="block space-y-1.5 text-sm text-slate-300">Método de pago<select value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })} className={inputClass}><option value="CASH">Efectivo</option><option value="TRANSFER">Transferencia</option></select></label>
          <label className="block space-y-1.5 text-sm text-slate-300">Nota (opcional)<textarea rows="2" maxLength={300} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Un detalle adicional..." className={inputClass}/></label>
        </div>
        {error && <p role="alert" className="mt-4 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">{error}</p>}{success && <p role="status" className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300">{success}</p>}
        <div className="mt-5 flex gap-2"><button type="submit" className="flex-1 rounded-xl bg-emerald-500 px-4 py-3 font-bold text-slate-950 hover:bg-emerald-400">{editingId ? "Guardar cambios" : `Registrar ${form.type === "EXPENSE" ? "gasto" : "ingreso"}`}</button>{editingId && <button type="button" onClick={() => { setEditingId(null); setForm({ ...EMPTY, date: currentDate }); }} className="rounded-xl border border-slate-700 px-4 py-3 text-sm text-slate-300">Cancelar</button>}</div>
      </form>
      <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80">
        <div className="border-b border-slate-800 p-5"><h2 className="!mb-1 text-lg font-semibold text-white">Historial</h2><p className="text-xs text-slate-500">Consulta, filtra y modifica tus registros.</p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2"><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar descripción..." className={inputClass}/><select value={period} onChange={(e) => setPeriod(e.target.value)} className={inputClass}><option value="THIS_MONTH">Este mes</option><option value="LAST_MONTH">Mes anterior</option><option value="THIS_YEAR">Este año</option><option value="ALL">Todo el historial</option><option value="CUSTOM">Periodo personalizado</option></select><select value={filterType} onChange={(e) => setFilterType(e.target.value)} className={inputClass}><option value="ALL">Ingresos y gastos</option><option value="EXPENSE">Solo gastos</option><option value="INCOME">Solo ingresos</option></select><select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className={inputClass}><option value="ALL">Todas las categorías</option>{categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div>
          {period === "CUSTOM" && <div className="mt-2 grid grid-cols-2 gap-2"><input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={`${inputClass}`}/><input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={`${inputClass}`}/></div>}
        </div>
        <div className="max-h-[760px] overflow-y-auto divide-y divide-slate-800">{filtered.map((item) => { const income = item.type === "INCOME"; return <article key={item.id} className="flex flex-wrap items-center justify-between gap-3 p-4"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="truncate font-medium text-white">{item.description}</p><span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${income ? "bg-emerald-400/10 text-emerald-300" : "bg-rose-400/10 text-rose-300"}`}>{income ? "Ingreso" : "Gasto"}</span></div><p className="mt-1 text-xs text-slate-500">{item.date} · {categoryName(item.categoryId)} · {item.paymentMethod === "TRANSFER" ? "Transferencia" : "Efectivo"}</p></div><div className="text-right"><p className={`font-semibold tabular-nums ${income ? "text-emerald-300" : "text-rose-300"}`}>{income ? "+" : "−"}{formatMoney(Math.abs(item.entries[0].amountMinor))}</p><div className="mt-1 flex justify-end gap-3 text-xs"><button type="button" onClick={() => edit(item)} className="text-emerald-300 hover:text-emerald-200">Editar</button><button type="button" onClick={() => remove(item)} className="text-rose-300 hover:text-rose-200">Eliminar</button></div></div></article>; })}{!filtered.length && <p className="p-10 text-center text-sm text-slate-500">No hay movimientos para estos filtros.</p>}</div>
      </section>
    </section>
  </main>;
}
