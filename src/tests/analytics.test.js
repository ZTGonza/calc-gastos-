/** Pruebas de los agregados que alimentan las gráficas y estadísticas. */
import test from "node:test";
import assert from "node:assert/strict";
import { getMonthlyIncomeExpense, getExpenseTotalsByCategory, formatMonthLabel } from "../services/analyticsService.js";

const transaction = (type, date, amount, categoryId = "food") => ({
  type,
  date,
  categoryId,
  entries: [{ amountMinor: type === "EXPENSE" ? -amount : amount }],
});

test("construye seis meses en orden e incluye meses sin movimientos", () => {
  const transactions = [
    transaction("INCOME", "2026-11-02", 250000),
    transaction("EXPENSE", "2026-10-12", 40000),
    transaction("EXPENSE", "2026-05-30", 10000), // fuera de los seis meses
  ];
  const result = getMonthlyIncomeExpense(transactions, "2026-11-06", 6);

  assert.deepEqual(result.map((item) => item.month), ["2026-06", "2026-07", "2026-08", "2026-09", "2026-10", "2026-11"]);
  assert.equal(result[0].income, 0);
  assert.equal(result[4].expense, 40000);
  assert.equal(result[5].income, 250000);
});

test("agrupa todos los gastos por categoría y conserva categorías sin referencia", () => {
  const transactions = [
    transaction("EXPENSE", "2026-11-01", 12000, "food"),
    transaction("EXPENSE", "2026-11-02", 8000, "food"),
    transaction("EXPENSE", "2026-11-03", 5000, "unknown"),
    transaction("INCOME", "2026-11-03", 90000, "income"),
  ];
  const result = getExpenseTotalsByCategory(transactions, [
    { id: "food", name: "Alimentación", color: "#f59e0b" },
  ]);

  assert.equal(result.length, 2);
  assert.deepEqual(result[0], { id: "food", name: "Alimentación", color: "#f59e0b", amount: 20000 });
  assert.deepEqual(result[1], { id: "unknown", name: "Sin categoría", color: "#64748b", amount: 5000 });
});

test("formatea las etiquetas mensuales en español", () => {
  assert.equal(formatMonthLabel("2026-11"), "Nov");
});
