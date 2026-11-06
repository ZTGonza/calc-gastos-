/**
 * VALIDACIONES DEL DOMINIO
 * Reglas compartidas para impedir que servicios guarden descripciones vacías,
 * monedas no admitidas o fechas con formato incorrecto.
 */
/** Rechaza cadenas vacías o que solo contienen espacios. */
export function assertNonEmpty(value, label) {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${label} es obligatorio.`);
}

/** Mantiene la regla de producto: la única moneda admitida es COP. */
export function assertCurrency(currency) {
  if (currency !== "COP") throw new Error("Calc-Gastos utiliza únicamente pesos colombianos (COP).");
}

/** Comprueba el formato AAAA-MM-DD antes de aceptar una fecha de movimiento. */
export function assertDate(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00`))) {
    throw new Error("La fecha debe tener el formato AAAA-MM-DD.");
  }
}
