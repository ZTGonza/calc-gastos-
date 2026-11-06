/**
 * UTILIDADES MONETARIAS
 * Calc-Gastos opera en COP y almacena importes como enteros (pesos), evitando
 * errores de precisión de coma flotante. Aquí se convierten, validan y presentan valores.
 */
/** FUNCIÓN FUNDAMENTAL: normaliza y valida un importe antes de guardarlo. En COP el peso se representa como entero. */
export function toMinorUnits(amount) {
  const value = Number(amount);
  if (!Number.isFinite(value) || value < 0) throw new Error("El importe debe ser un número positivo.");
  const rounded = Math.round(value);
  if (!Number.isSafeInteger(rounded)) throw new Error("El importe supera el límite permitido.");
  return rounded;
}

/** Recupera el importe entero almacenado; rechaza valores internos corruptos. */
export function fromMinorUnits(amountMinor) {
  if (!Number.isSafeInteger(amountMinor)) throw new Error("Importe interno inválido.");
  return amountMinor;
}

/** Presenta un importe como moneda COP para mostrarlo, sin cambiar el valor almacenado. */
export function formatMoney(amount, locale = "es-CO") {
  const value = Number(amount);
  if (!Number.isFinite(value)) return "—";
  return new Intl.NumberFormat(locale, { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(value);
}

/** Formatea un valor entero de COP con puntos como separadores de miles. */
/** Formatea mientras se escribe: elimina caracteres no numéricos y agrupa cada tres dígitos. */
export function formatThousandsInput(value) {
  const digits = String(value ?? "").replace(/\D/g, "");
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/** Convierte el texto formateado del input en un número entero de pesos. */
/** Convierte el texto visual (por ejemplo, 125.000) al número entero 125000. */
export function parseThousandsInput(value) {
  const digits = String(value ?? "").replace(/\D/g, "");
  return digits ? Number(digits) : NaN;
}
