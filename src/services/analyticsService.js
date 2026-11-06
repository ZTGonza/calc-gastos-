/**
 * SERVICIO DE ESTADÍSTICAS (NÚCLEO DE LAS GRÁFICAS)
 * Transforma movimientos en agregados listos para visualizar: evolución mensual
 * de ingresos/gastos y distribución de gastos por categoría. No modifica los datos.
 */
// Normaliza el importe firmado del movimiento a valor absoluto para los agregados.
const amountOf = (transaction) => Math.abs(transaction.entries?.[0]?.amountMinor || 0);

const monthKey = (year, monthIndex) => `${year}-${String(monthIndex + 1).padStart(2, "0")}`;

/** Devuelve los últimos N meses en orden cronológico, incluyendo el mes actual. */
/** FUNCIÓN FUNDAMENTAL DE LA GRÁFICA DE LÍNEAS: prepara una serie cronológica de N meses, incluso aquellos sin movimientos (quedan en cero). */
export function getMonthlyIncomeExpense(transactions, currentDate, months = 6) {
  const [year, month] = currentDate.slice(0, 7).split("-").map(Number);
  const totals = new Map();

  for (let offset = months - 1; offset >= 0; offset -= 1) {
    const date = new Date(Date.UTC(year, month - 1 - offset, 1));
    const key = monthKey(date.getUTCFullYear(), date.getUTCMonth());
    totals.set(key, { month: key, income: 0, expense: 0 });
  }

  for (const transaction of transactions) {
    const key = transaction.date?.slice(0, 7);
    const bucket = totals.get(key);
    if (!bucket) continue;
    if (transaction.type === "INCOME") bucket.income += amountOf(transaction);
    if (transaction.type === "EXPENSE") bucket.expense += amountOf(transaction);
  }

  return [...totals.values()];
}

/** Agrupa los gastos por categoría sin descartar categorías pequeñas. */
/** FUNCIÓN FUNDAMENTAL DE LA GRÁFICA DE DONA: suma solo gastos y los agrupa por categoría, incluyendo movimientos sin categoría. */
export function getExpenseTotalsByCategory(transactions, categories) {
  const categoryMap = new Map(categories.map((category) => [category.id, category]));
  const totals = new Map();

  for (const transaction of transactions) {
    if (transaction.type !== "EXPENSE") continue;
    const id = transaction.categoryId || "none";
    const category = categoryMap.get(id);
    const current = totals.get(id) || {
      id,
      name: category?.name || "Sin categoría",
      color: category?.color || "#64748b",
      amount: 0,
    };
    current.amount += amountOf(transaction);
    totals.set(id, current);
  }

  return [...totals.values()].sort((a, b) => b.amount - a.amount);
}

/** Convierte AAAA-MM en una etiqueta legible para el eje horizontal de la gráfica. */
export function formatMonthLabel(monthKeyValue, locale = "es-CO") {
  const date = new Date(`${monthKeyValue}-01T00:00:00Z`);
  return new Intl.DateTimeFormat(locale, { month: "short", timeZone: "UTC" })
    .format(date)
    .replace(".", "")
    .replace(/^./, (letter) => letter.toLocaleUpperCase(locale));
}
