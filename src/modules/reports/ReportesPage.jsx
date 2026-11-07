/**
 * MÓDULO ESTADÍSTICAS
 *
 * Permite:
 * - Filtrar movimientos por fechas.
 * - Consultar ingresos, gastos y diferencias.
 * - Visualizar gastos por categoría.
 * - Consultar compromisos recurrentes.
 * - Exportar movimientos a CSV.
 */

import { useMemo, useState } from "react";

import { storageService } from "../../services/storageService.js";

import { formatMoney } from "../../domain/money.js";

import {
  getExpenseTotalsByCategory,
  getRecurringExpenseSummary,
} from "../../services/analyticsService.js";

import {
  ExpenseCategoryChart,
} from "../../components/charts/FinanceCharts.jsx";

/**
 * Fecha local actual en formato AAAA-MM-DD.
 */
const today = () => {
  const now = new Date();

  return new Date(
    now.getTime() -
    now.getTimezoneOffset() * 60_000
  )
    .toISOString()
    .slice(0, 10);
};

/**
 * Primer día del mes actual.
 */
const firstDay = () =>
  `${today().slice(0, 7)}-01`;

/**
 * Escapa valores para evitar romper el formato CSV.
 */
const csvCell = (value) =>
  `"${String(value ?? "").replaceAll('"', '""')}"`;

/**
 * Página de estadísticas.
 */
export default function ReportesPage() {
  const state = storageService.getState();

  const [from, setFrom] = useState(firstDay());

  const [to, setTo] = useState(today());

  const [type, setType] = useState("ALL");

  /**
   * Fuente única de datos filtrados.
   *
   * Las tarjetas, la gráfica y la tabla utilizan
   * los mismos movimientos.
   */
  const filtered = useMemo(
    () =>
      state.transactions.filter(
        (item) =>
          item.date >= from &&
          item.date <= to &&
          (type === "ALL" || item.type === type)
      ),
    [state.transactions, from, to, type]
  );

  /**
   * Calcula los totales del periodo seleccionado.
   */
  const summary = filtered.reduce(
    (acc, item) => {
      const amount = Math.abs(
        item.entries?.[0]?.amountMinor || 0
      );

      if (item.type === "INCOME") {
        acc.income += amount;
      } else {
        acc.expense += amount;
      }

      return acc;
    },
    {
      income: 0,
      expense: 0,
    }
  );

  /**
   * Agrupa los gastos del periodo por categoría.
   */
  const categories = useMemo(
    () =>
      getExpenseTotalsByCategory(
        filtered,
        state.categories
      ),
    [filtered, state.categories]
  );

  /**
   * FUNCIÓN FUNDAMENTAL:
   *
   * Resume las reglas recurrentes activas.
   *
   * Este resumen no depende del filtro de fechas,
   * porque representa los compromisos que siguen activos.
   */
  const recurringSummary = useMemo(
    () =>
      getRecurringExpenseSummary(
        state.recurringRules || []
      ),
    [state.recurringRules]
  );

  /**
   * Exporta los movimientos filtrados a CSV.
   */
  const exportCsv = () => {
    const rows = [
      [
        "Fecha",
        "Tipo",
        "Descripción",
        "Categoría",
        "Método de pago",
        "Valor COP",
        "Notas",
      ],
    ];

    filtered.forEach((item) => {
      rows.push([
        item.date,

        item.type === "INCOME"
          ? "Ingreso"
          : "Gasto",

        item.description,

        state.categories.find(
          (cat) => cat.id === item.categoryId
        )?.name || "Sin categoría",

        item.paymentMethod === "TRANSFER"
          ? "Transferencia"
          : "Efectivo",

        Math.abs(
          item.entries?.[0]?.amountMinor || 0
        ),

        item.notes || "",
      ]);
    });

    const blob = new Blob(
      [
        `\uFEFF${rows
          .map((row) =>
            row.map(csvCell).join(";")
          )
          .join("\r\n")}`,
      ],
      {
        type: "text/csv;charset=utf-8",
      }
    );

    const url = URL.createObjectURL(blob);

    const anchor = document.createElement("a");

    anchor.href = url;

    anchor.download =
      `calc-gastos-${from}-${to}.csv`;

    anchor.click();

    URL.revokeObjectURL(url);
  };

  const inputClass = `
    w-full rounded-lg
    border border-slate-700
    bg-slate-950
    px-3 py-2.5
    text-sm text-white
  `;

  return (
    <main className="space-y-6">

      {/* ENCABEZADO */}
      <header className="
        flex flex-wrap
        items-end justify-between gap-3
      ">
        <div>
          <p className="
            text-sm font-semibold
            tracking-wide text-emerald-400
          ">
            TUS HÁBITOS FINANCIEROS
          </p>

          <h1 className="
            !mb-1 text-3xl
            font-bold text-white
          ">
            Estadísticas
          </h1>

          <p className="text-sm text-slate-400">
            Entiende cómo se mueve tu dinero.
          </p>
        </div>

        <button
          type="button"
          onClick={exportCsv}
          disabled={!filtered.length}
          className="
            rounded-xl
            bg-emerald-500
            px-4 py-2.5
            text-sm font-bold
            text-slate-950
            hover:bg-emerald-400
            disabled:opacity-40
          "
        >
          Exportar CSV
        </button>
      </header>

      {/* FILTROS */}
      <section className="
        grid gap-3
        rounded-2xl
        border border-slate-800
        bg-slate-900/80
        p-4 sm:grid-cols-3
      ">
        <label className="
          space-y-1 text-xs text-slate-400
        ">
          Desde

          <input
            type="date"
            value={from}
            max={to}
            onChange={(event) =>
              setFrom(event.target.value)
            }
            className={inputClass}
          />
        </label>

        <label className="
          space-y-1 text-xs text-slate-400
        ">
          Hasta

          <input
            type="date"
            value={to}
            min={from}
            max={today()}
            onChange={(event) =>
              setTo(event.target.value)
            }
            className={inputClass}
          />
        </label>

        <label className="
          space-y-1 text-xs text-slate-400
        ">
          Tipo

          <select
            value={type}
            onChange={(event) =>
              setType(event.target.value)
            }
            className={inputClass}
          >
            <option value="ALL">
              Ingresos y gastos
            </option>

            <option value="INCOME">
              Ingresos
            </option>

            <option value="EXPENSE">
              Gastos
            </option>
          </select>
        </label>
      </section>

      {/* RESUMEN FINANCIERO */}
      <section className="
        grid gap-3 sm:grid-cols-3
      ">
        <article className="
          rounded-2xl border border-slate-800
          bg-slate-900/80 p-4
        ">
          <p className="text-sm text-slate-400">
            Ingresos
          </p>

          <p className="
            mt-2 text-2xl
            font-bold text-emerald-300
          ">
            {formatMoney(summary.income)}
          </p>
        </article>

        <article className="
          rounded-2xl border border-slate-800
          bg-slate-900/80 p-4
        ">
          <p className="text-sm text-slate-400">
            Gastos
          </p>

          <p className="
            mt-2 text-2xl
            font-bold text-rose-300
          ">
            {formatMoney(summary.expense)}
          </p>
        </article>

        <article className="
          rounded-2xl border border-slate-800
          bg-slate-900/80 p-4
        ">
          <p className="text-sm text-slate-400">
            Diferencia
          </p>

          <p className={`
            mt-2 text-2xl font-bold
            ${
              summary.income - summary.expense >= 0
                ? "text-emerald-300"
                : "text-rose-300"
            }
          `}>
            {formatMoney(
              summary.income - summary.expense
            )}
          </p>
        </article>
      </section>

      {/* GASTOS POR CATEGORÍA */}
      <section className="
        rounded-2xl
        border border-slate-800
        bg-slate-900/80
        p-5
      ">
        <div className="mb-5">
          <h2 className="
            !mb-1 text-lg
            font-semibold text-white
          ">
            Gastos por categoría
          </h2>

          <p className="text-xs text-slate-500">
            Distribución de los gastos dentro
            del periodo seleccionado ({filtered.length} movimientos).
          </p>
        </div>

        {type === "INCOME" ? (
          <p className="
            rounded-xl
            border border-dashed border-slate-700
            p-8 text-center
            text-sm text-slate-500
          ">
            Selecciona «Ingresos y gastos» o «Gastos»
            para consultar esta distribución.
          </p>
        ) : (
          <ExpenseCategoryChart
            categories={categories}
          />
        )}
      </section>

      {/* =====================================================
          NUEVA SECCIÓN: GASTOS RECURRENTES
          ===================================================== */}

      <section className="
        rounded-2xl
        border border-slate-800
        bg-slate-900/80
        p-5
      ">
        <div className="mb-5">
          <h2 className="
            !mb-1 text-lg
            font-semibold text-white
          ">
            Gastos recurrentes
          </h2>

          <p className="text-xs text-slate-500">
            Resumen de los gastos semanales y mensuales
            que tienes activos.
          </p>
        </div>

        <div className="
          grid gap-3 sm:grid-cols-2
        ">

          {/* GASTOS SEMANALES */}
          <article className="
            rounded-xl
            border border-slate-800
            bg-slate-950/50
            p-4
          ">
            <p className="
              text-sm font-medium text-slate-300
            ">
              Gastos semanales
            </p>

            <p className="
              mt-2 text-2xl
              font-bold text-rose-300
            ">
              {formatMoney(
                recurringSummary.weekly.amount
              )}
            </p>

            <p className="
              mt-1 text-xs text-slate-500
            ">
              {recurringSummary.weekly.count}{" "}
              {recurringSummary.weekly.count === 1
                ? "gasto activo"
                : "gastos activos"}
              {" · valor por semana"}
            </p>
          </article>

          {/* GASTOS MENSUALES */}
          <article className="
            rounded-xl
            border border-slate-800
            bg-slate-950/50
            p-4
          ">
            <p className="
              text-sm font-medium text-slate-300
            ">
              Gastos mensuales
            </p>

            <p className="
              mt-2 text-2xl
              font-bold text-rose-300
            ">
              {formatMoney(
                recurringSummary.monthly.amount
              )}
            </p>

            <p className="
              mt-1 text-xs text-slate-500
            ">
              {recurringSummary.monthly.count}{" "}
              {recurringSummary.monthly.count === 1
                ? "gasto activo"
                : "gastos activos"}
              {" · valor por mes"}
            </p>
          </article>

        </div>

        <p className="
          mt-3 text-xs text-slate-500
        ">
          Estos valores muestran los compromisos
          recurrentes activos; no se suman nuevamente
          al historial de movimientos.
        </p>
      </section>

      {/* DETALLE DE MOVIMIENTOS */}
      <section className="
        overflow-hidden
        rounded-2xl
        border border-slate-800
        bg-slate-900/80
      ">
        <div className="
          border-b border-slate-800 p-5
        ">
          <h2 className="
            !mb-1 text-lg
            font-semibold text-white
          ">
            Detalle de movimientos
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="
            w-full min-w-[600px]
            text-left text-sm
          ">
            <thead className="
              bg-slate-950/70
              text-xs uppercase
              text-slate-500
            ">
              <tr>
                <th className="px-4 py-3">
                  Fecha
                </th>

                <th className="px-4 py-3">
                  Descripción
                </th>

                <th className="px-4 py-3">
                  Categoría
                </th>

                <th className="px-4 py-3">
                  Tipo
                </th>

                <th className="px-4 py-3">
                  Valor
                </th>
              </tr>
            </thead>

            <tbody className="
              divide-y divide-slate-800
            ">
              {filtered.map((item) => (
                <tr key={item.id}>
                  <td className="
                    px-4 py-3 text-slate-400
                  ">
                    {item.date}
                  </td>

                  <td className="
                    px-4 py-3 text-white
                  ">
                    {item.description}
                  </td>

                  <td className="
                    px-4 py-3 text-slate-400
                  ">
                    {state.categories.find(
                      (cat) =>
                        cat.id === item.categoryId
                    )?.name || "Sin categoría"}
                  </td>

                  <td className="
                    px-4 py-3 text-slate-400
                  ">
                    {item.type === "INCOME"
                      ? "Ingreso"
                      : "Gasto"}
                  </td>

                  <td className={`
                    px-4 py-3 font-semibold
                    ${
                      item.type === "INCOME"
                        ? "text-emerald-300"
                        : "text-rose-300"
                    }
                  `}>
                    {item.type === "INCOME"
                      ? "+"
                      : "−"}

                    {formatMoney(
                      Math.abs(
                        item.entries?.[0]?.amountMinor || 0
                      )
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {!filtered.length && (
            <p className="
              p-8 text-center
              text-sm text-slate-500
            ">
              No hay movimientos para este periodo.
            </p>
          )}
        </div>
      </section>

    </main>
  );
}