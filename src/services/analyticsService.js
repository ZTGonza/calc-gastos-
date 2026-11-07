/**
 * SERVICIO DE ESTADÍSTICAS
 *
 * Transforma los movimientos financieros en datos
 * preparados para las gráficas y los reportes.
 *
 * No modifica el almacenamiento.
 */

/**
 * Normaliza el importe firmado de un movimiento.
 */
const amountOf = (transaction) =>
  Math.abs(
    transaction.entries?.[0]?.amountMinor || 0
  );

/**
 * Genera una clave AAAA-MM.
 */
const monthKey = (year, monthIndex) =>
  `${year}-${String(monthIndex + 1).padStart(2, "0")}`;

/**
 * FUNCIÓN FUNDAMENTAL DE LA GRÁFICA DE LÍNEAS:
 *
 * Prepara los ingresos y gastos de los últimos N meses.
 * Incluye meses sin movimientos con valor cero.
 */
export function getMonthlyIncomeExpense(
  transactions,
  currentDate,
  months = 6
) {
  const [year, month] = currentDate
    .slice(0, 7)
    .split("-")
    .map(Number);

  const totals = new Map();

  for (
    let offset = months - 1;
    offset >= 0;
    offset -= 1
  ) {
    const date = new Date(
      Date.UTC(year, month - 1 - offset, 1)
    );

    const key = monthKey(
      date.getUTCFullYear(),
      date.getUTCMonth()
    );

    totals.set(key, {
      month: key,
      income: 0,
      expense: 0,
    });
  }

  for (const transaction of transactions) {
    const key = transaction.date?.slice(0, 7);

    const bucket = totals.get(key);

    if (!bucket) continue;

    if (transaction.type === "INCOME") {
      bucket.income += amountOf(transaction);
    }

    if (transaction.type === "EXPENSE") {
      bucket.expense += amountOf(transaction);
    }
  }

  return [...totals.values()];
}

/**
 * FUNCIÓN FUNDAMENTAL DE LA GRÁFICA DE DONA:
 *
 * Agrupa los gastos por categoría.
 * También contempla movimientos sin categoría.
 */
export function getExpenseTotalsByCategory(
  transactions,
  categories
) {
  const categoryMap = new Map(
    categories.map(
      (category) => [category.id, category]
    )
  );

  const totals = new Map();

  for (const transaction of transactions) {
    if (transaction.type !== "EXPENSE") {
      continue;
    }

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

  return [...totals.values()].sort(
    (a, b) => b.amount - a.amount
  );
}

/**
 * Convierte AAAA-MM en una etiqueta legible.
 */
export function formatMonthLabel(
  monthKeyValue,
  locale = "es-CO"
) {
  const date = new Date(
    `${monthKeyValue}-01T00:00:00Z`
  );

  return new Intl.DateTimeFormat(locale, {
    month: "short",
    timeZone: "UTC",
  })
    .format(date)
    .replace(".", "")
    .replace(
      /^./,
      (letter) => letter.toLocaleUpperCase(locale)
    );
}

/**
 * FUNCIÓN FUNDAMENTAL DE GASTOS RECURRENTES:
 *
 * Resume las reglas activas y separa los gastos
 * semanales de los mensuales.
 *
 * El importe representa el compromiso por periodo.
 * No vuelve a sumar los movimientos históricos.
 */
export function getRecurringExpenseSummary(
  recurringRules = []
) {
  const summary = {
    weekly: {
      count: 0,
      amount: 0,
    },

    monthly: {
      count: 0,
      amount: 0,
    },
  };

  for (const rule of recurringRules) {
    if (
      !rule.active ||
      rule.type !== "EXPENSE"
    ) {
      continue;
    }

    if (rule.frequency === "WEEKLY") {
      summary.weekly.count += 1;

      summary.weekly.amount +=
        Number(rule.amountMinor) || 0;
    }

    if (rule.frequency === "MONTHLY") {
      summary.monthly.count += 1;

      summary.monthly.amount +=
        Number(rule.amountMinor) || 0;
    }
  }

  return summary;
}
/**
 * FUNCIÓN FUNDAMENTAL DEL INDICADOR FINANCIERO ACUMULADO:
 *
 * Compara todos los gastos registrados con el dinero total
 * disponible desde que comenzó el seguimiento:
 * saldo inicial + ingresos acumulados.
 *
 * El saldo inicial se incorpora una sola vez. Los gastos no
 * reducen la base de comparación; se restan para calcular
 * el dinero restante. Así, el porcentaje gastado puede superar
 * el 100 % cuando los gastos exceden el dinero disponible.
 */
export function getCumulativeFinancialDistribution(
  transactions,
  initialBalanceMinor = 0
) {
  const totals = transactions.reduce(
    (result, transaction) => {
      const amount = amountOf(transaction);

      if (transaction.type === "INCOME") {
        result.income += amount;
      }

      if (transaction.type === "EXPENSE") {
        result.expense += amount;
      }

      return result;
    },
    {
      income: 0,
      expense: 0,
    }
  );

  const initialBalance = Number(initialBalanceMinor) || 0;
  const availableBase = initialBalance + totals.income;
  const remaining = availableBase - totals.expense;
  const hasAvailableBase = availableBase > 0;

  return {
    initialBalance,
    income: totals.income,
    expense: totals.expense,
    availableBase,
    remaining,
    expensePercentage: hasAvailableBase
      ? (totals.expense / availableBase) * 100
      : null,
    remainingPercentage: hasAvailableBase
      ? (remaining / availableBase) * 100
      : null,
  };
}
