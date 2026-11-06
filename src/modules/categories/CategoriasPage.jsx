/**
 * MÓDULO CATEGORÍAS
 * Interfaz de administración de categorías predeterminadas y personalizadas.
 * Delega validaciones y restricciones de integridad a categoryService.
 */
import { useCallback, useMemo, useState } from "react";
import { createCategory, deleteCategory, listCategories, updateCategory, VALID_COLORS } from "../../services/categoryService.js";
import { storageService } from "../../services/storageService.js";

const EMPTY_FORM = { name: "", type: "EXPENSE", color: VALID_COLORS[0] };

export default function CategoriasPage() {
  const [revision, setRevision] = useState(0);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [filterType, setFilterType] = useState("ALL");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const categories = useMemo(() => { void revision; return listCategories({ type: filterType === "ALL" ? undefined : filterType }); }, [revision, filterType]);
  const transactionCount = useMemo(() => {
    void revision;
    const transactions = storageService.getState().transactions;
    return (id) => transactions.filter((item) => item.categoryId === id).length;
  }, [revision]);
  const refresh = useCallback(() => setRevision((value) => value + 1), []);

  const resetForm = () => { setForm(EMPTY_FORM); setEditingId(null); };

  /** Guarda una categoría nueva o actualiza la seleccionada; categoryService aplica las reglas. */
  const handleSubmit = (event) => {
    event.preventDefault(); setError(""); setSuccess("");
    try {
      if (editingId) updateCategory(editingId, form);
      else createCategory(form);
      setSuccess(editingId ? "Categoría actualizada correctamente." : "Categoría creada correctamente.");
      resetForm(); refresh();
    } catch (submitError) { setError(submitError.message || "No se pudo guardar la categoría."); }
  };

  const handleEdit = (category) => {
    setEditingId(category.id);
    setForm({ name: category.name, type: category.type, color: category.color || VALID_COLORS[0] });
    setError(""); setSuccess("");
  };

  /** La eliminación se confirma aquí; el servicio impide borrar categorías protegidas o en uso. */
  const handleDelete = (category) => {
    if (!window.confirm(`¿Eliminar la categoría "${category.name}"?`)) return;
    setError(""); setSuccess("");
    try { deleteCategory(category.id); setSuccess("Categoría eliminada."); refresh(); }
    catch (deleteError) { setError(deleteError.message || "No se pudo eliminar la categoría."); }
  };

  return (
    <main className="space-y-6">
      <header>
        <p className="text-sm font-medium text-emerald-400">FINANZAS PERSONALES</p>
        <h1 className="!mb-1 text-3xl font-bold tracking-tight text-white">Categorías</h1>
        <p className="text-sm text-slate-400">Organiza tus ingresos y gastos con categorías que tengan sentido para ti.</p>
      </header>

      <section className="grid gap-5 lg:grid-cols-[minmax(280px,0.8fr)_1.2fr]">
        <form onSubmit={handleSubmit} className="h-fit space-y-4 rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
          <div>
            <h2 className="!mb-1 text-lg font-semibold text-white">{editingId ? "Editar categoría" : "Nueva categoría"}</h2>
            <p className="text-xs text-slate-500">Las categorías permiten analizar tus movimientos.</p>
          </div>
          <label className="block space-y-1.5 text-sm text-slate-300">Nombre
            <input required maxLength={40} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Ej. Mascotas" className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-white outline-none focus:border-emerald-500" />
          </label>
          <label className="block space-y-1.5 text-sm text-slate-300">Tipo
            <select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })} disabled={Boolean(editingId && transactionCount(editingId) > 0)} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-white disabled:opacity-50">
              <option value="EXPENSE">Gasto</option><option value="INCOME">Ingreso</option>
            </select>
          </label>
          <fieldset>
            <legend className="mb-2 text-sm text-slate-300">Color identificador</legend>
            <div className="flex flex-wrap gap-2">
              {VALID_COLORS.map((color) => <button key={color} type="button" aria-label={`Seleccionar color ${color}`} aria-pressed={form.color === color} onClick={() => setForm({ ...form, color })} className={`h-8 w-8 rounded-full border-2 ${form.color === color ? "border-white ring-2 ring-emerald-400" : "border-transparent"}`} style={{ backgroundColor: color }} />)}
            </div>
          </fieldset>
          {error && <p role="alert" className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">{error}</p>}
          {success && <p role="status" className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300">{success}</p>}
          <div className="flex gap-2">
            <button type="submit" className="flex-1 rounded-xl bg-emerald-500 px-4 py-3 font-bold text-slate-950 transition hover:bg-emerald-400">{editingId ? "Guardar cambios" : "Crear categoría"}</button>
            {editingId && <button type="button" onClick={resetForm} className="rounded-xl border border-slate-700 px-4 py-3 text-sm text-slate-300 hover:bg-slate-800">Cancelar</button>}
          </div>
        </form>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div><h2 className="!mb-1 text-lg font-semibold text-white">Tus categorías</h2><p className="text-xs text-slate-500">{categories.length} categorías disponibles</p></div>
            <select value={filterType} onChange={(event) => setFilterType(event.target.value)} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"><option value="ALL">Todas</option><option value="EXPENSE">Gastos</option><option value="INCOME">Ingresos</option></select>
          </div>
          <div className="space-y-2">
            {categories.map((category) => <article key={category.id} className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/60 p-3">
              <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: category.color || "#94a3b8" }} />
              <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-slate-200">{category.name}</p><p className="text-xs text-slate-500">{category.type === "INCOME" ? "Ingreso" : "Gasto"} · {transactionCount(category.id)} movimientos {category.isDefault ? "· Predeterminada" : "· Personalizada"}</p></div>
              <button type="button" onClick={() => handleEdit(category)} className="text-xs text-emerald-300 hover:text-emerald-200">Editar</button>
              {!category.isDefault && <button type="button" onClick={() => handleDelete(category)} className="text-xs text-rose-400 hover:text-rose-300">Eliminar</button>}
            </article>)}
            {!categories.length && <p className="rounded-xl border border-dashed border-slate-700 p-6 text-center text-sm text-slate-500">No hay categorías en este filtro.</p>}
          </div>
        </section>
      </section>
      <p className="text-center text-xs text-slate-600">Las categorías predeterminadas no se eliminan. Las categorías utilizadas en movimientos tampoco se pueden borrar para conservar el historial.</p>
    </main>
  );
}
