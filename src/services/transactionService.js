/**
 * SERVICIO DE MOVIMIENTOS (NÚCLEO DEL PROGRAMA)
 * Construye, valida, crea, edita, consulta y elimina ingresos/gastos. Todas las
 * operaciones pasan por este servicio para conservar las reglas de negocio.
 */
import { storageService } from "./storageService.js";
import { PERSONAL_ACCOUNT_ID } from "../domain/constants.js";
import { toMinorUnits } from "../domain/money.js";
import { assertDate, assertNonEmpty } from "../domain/validators.js";

/** FUNCIÓN FUNDAMENTAL: aplica todas las reglas del movimiento y produce el objeto canónico que se persiste. Los importes de gasto quedan negativos y los ingresos positivos. */
function buildTransaction(state, input, previous = null) {
  assertNonEmpty(input.description, "La descripción");
  assertDate(input.date);
  const amountMinor = toMinorUnits(input.amount);
  if (amountMinor <= 0) throw new Error("El importe debe ser mayor que cero.");
  if (!["INCOME", "EXPENSE"].includes(input.type)) throw new Error("Solo puedes registrar ingresos y gastos.");
  const category = state.categories.find((item) => item.id === input.categoryId && item.active !== false);
  if (!category || category.type !== input.type) throw new Error("Selecciona una categoría válida para este movimiento.");
  const signedAmount = input.type === "INCOME" ? amountMinor : -amountMinor;
  const now = new Date().toISOString();
  return {
    id: previous?.id || crypto.randomUUID(),
    type: input.type,
    description: input.description.trim(),
    date: input.date,
    categoryId: input.categoryId,
    paymentMethod: ["CASH", "TRANSFER"].includes(input.paymentMethod) ? input.paymentMethod : "CASH",
    notes: input.notes?.trim() || "",
    entries: [{ accountId: PERSONAL_ACCOUNT_ID, amountMinor: signedAmount }],
    createdAt: previous?.createdAt || now,
    updatedAt: now,
  };
}

/** FUNCIÓN FUNDAMENTAL: crea un movimiento validado y lo agrega al estado persistente. */
export function createTransaction(input) {
  let created;
  storageService.updateState((state) => {
    created = buildTransaction(state, input);
    return { ...state, transactions: [...state.transactions, created] };
  });
  return created;
}

/** Actualiza un movimiento existente conservando su id y fecha de creación. */
export function updateTransaction(id, input) {
  let updated;
  storageService.updateState((state) => {
    const previous = state.transactions.find((item) => item.id === id);
    if (!previous) throw new Error("El movimiento que intentas editar ya no existe.");
    updated = buildTransaction(state, input, previous);
    return { ...state, transactions: state.transactions.map((item) => item.id === id ? updated : item) };
  });
  return updated;
}

/** Consulta movimientos con filtros opcionales y ordena los más recientes primero. */
export function listTransactions({ from, to, type, categoryId } = {}) {
  return storageService.getState().transactions.filter((item) =>
    (!from || item.date >= from) && (!to || item.date <= to) &&
    (!type || item.type === type) && (!categoryId || item.categoryId === categoryId),
  ).sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
}

/** Elimina un movimiento por id; falla si ya no existe para evitar falsos éxitos. */
export function deleteTransaction(id) {
  return storageService.updateState((state) => {
    if (!state.transactions.some((item) => item.id === id)) throw new Error("El movimiento ya no existe.");
    return { ...state, transactions: state.transactions.filter((item) => item.id !== id) };
  });
}
