/**
 * SERVICIO DE CATEGORÍAS
 * Controla las categorías de ingresos y gastos, sus nombres, colores, duplicados
 * y restricciones para proteger el historial de movimientos.
 */
import { storageService } from "./storageService.js";
import { assertNonEmpty } from "../domain/validators.js";

const VALID_TYPES = ["INCOME", "EXPENSE"];
const VALID_COLORS = ["#22c55e", "#38bdf8", "#a78bfa", "#f59e0b", "#f472b6", "#fb7185", "#94a3b8", "#14b8a6", "#f97316", "#818cf8"];

/** FUNCIÓN CLAVE: normaliza y valida la categoría, evita duplicados activos del mismo tipo y limita la paleta a colores permitidos. */
function validateCategory(input, categories, excludedId = null) {
  assertNonEmpty(input.name, "El nombre de la categoría");
  if (!VALID_TYPES.includes(input.type)) throw new Error("El tipo debe ser ingreso o gasto.");
  const normalized = input.name.trim().toLocaleLowerCase("es-CO");
  if (categories.some((item) => item.id !== excludedId && item.type === input.type && item.name.trim().toLocaleLowerCase("es-CO") === normalized && item.active !== false)) {
    throw new Error("Ya existe una categoría con ese nombre y tipo.");
  }
  const color = VALID_COLORS.includes(input.color) ? input.color : VALID_COLORS[0];
  return { name: input.name.trim(), type: input.type, color };
}

/** Devuelve categorías filtradas y ordenadas alfabéticamente para los formularios. */
export function listCategories({ type, includeInactive = false } = {}) {
  return storageService.getState().categories.filter((category) =>
    (!type || category.type === type) && (includeInactive || category.active !== false),
  ).sort((a, b) => a.name.localeCompare(b.name, "es"));
}

/** Crea una categoría personalizada después de aplicar validateCategory. */
export function createCategory(input) {
  let created;
  storageService.updateState((state) => {
    const values = validateCategory(input, state.categories);
    created = { id: crypto.randomUUID(), ...values, isDefault: false, active: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    return { ...state, categories: [...state.categories, created] };
  });
  return created;
}

/** Actualiza una categoría y evita cambiar su tipo cuando ya tiene movimientos asociados. */
export function updateCategory(categoryId, input) {
  let updated;
  storageService.updateState((state) => {
    const current = state.categories.find((item) => item.id === categoryId);
    if (!current) throw new Error("La categoría no existe.");
    const values = validateCategory(input, state.categories, categoryId);
    const hasTransactions = state.transactions.some((item) => item.categoryId === categoryId);
    const hasBudgets = (state.budgets || []).some((item) => item.categoryId === categoryId);
    if ((hasTransactions || hasBudgets) && current.type !== values.type) {
      throw new Error("No puedes cambiar el tipo de una categoría que ya tiene movimientos asociados.");
    }
    updated = { ...current, ...values, updatedAt: new Date().toISOString() };
    return { ...state, categories: state.categories.map((item) => item.id === categoryId ? updated : item) };
  });
  return updated;
}

/** Elimina solo categorías personalizadas que no estén referenciadas por movimientos. */
export function deleteCategory(categoryId) {
  storageService.updateState((state) => {
    const current = state.categories.find((item) => item.id === categoryId);
    if (!current) throw new Error("La categoría no existe.");
    if (current.isDefault) throw new Error("Las categorías predeterminadas no se pueden eliminar; puedes cambiarles el nombre.");
    if (state.transactions.some((item) => item.categoryId === categoryId)) {
      throw new Error("Esta categoría tiene movimientos asociados. Reasigna esos movimientos antes de eliminarla.");
    }
    if ((state.budgets || []).some((item) => item.categoryId === categoryId)) {
      throw new Error("Esta categoría tiene presupuestos asociados. Elimina o reasigna esos presupuestos antes de eliminarla.");
    }
    return { ...state, categories: state.categories.filter((item) => item.id !== categoryId) };
  });
}

export { VALID_COLORS };
