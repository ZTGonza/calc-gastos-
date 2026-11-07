/**
 * MÓDULO INICIO / DASHBOARD
 * Resume el saldo disponible, ingresos y gastos del mes, evolución de seis meses,
 * distribución por categoría y últimos movimientos. Consume servicios del dominio.
 */
import { storageService } from "../../services/storageService.js";
import { getAccountBalance } from "../../services/accountService.js";
import { formatMoney } from "../../domain/money.js";
import { useCurrentDate } from "../../hooks/useCurrentDate.js";
import { getCumulativeFinancialDistribution, getExpenseTotalsByCategory, getMonthlyIncomeExpense } from "../../services/analyticsService.js";
import { ExpenseCategoryChart, IncomeExpenseTrendChart } from "../../components/charts/FinanceCharts.jsx";

const monthLabel = (value) => new Intl.DateTimeFormat("es-CO", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}-01T00:00:00Z`));

export default function DashboardPage({ onNavigate }) {
  // El dashboard obtiene una fotografía del estado local para construir el resumen.
  const state = storageService.getState();
  const currentDate = useCurrentDate();
  const month = currentDate.slice(0, 7);
  const monthTransactions = state.transactions.filter((item) => item.date.startsWith(month));
  // Agregado mensual: acumula ingresos y gastos por separado para las tarjetas superiores.
  const totals = monthTransactions.reduce((acc, item) => {
    const amount = Math.abs(item.entries?.[0]?.amountMinor || 0);
    if (item.type === "INCOME") acc.income += amount;
    if (item.type === "EXPENSE") acc.expense += amount;
    return acc;
  }, { income: 0, expense: 0 });
  const balance = getAccountBalance();
  // Indicador acumulado: saldo inicial contado una sola vez + todos los ingresos.
  const account = state.accounts[0];
  const cumulativeDistribution = getCumulativeFinancialDistribution(
    state.transactions,
    account?.initialBalanceMinor ?? 0
  );
  const recent = [...state.transactions].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)).slice(0, 6);
  // Prepara los seis puntos temporales que alimentan la gráfica de líneas.
  const monthlyTrend = getMonthlyIncomeExpense(state.transactions, currentDate, 6);
  // Agrupa gastos del mes por categoría para la gráfica de dona.
  const categoryTotals = getExpenseTotalsByCategory(monthTransactions, state.categories);

  return <main className="space-y-6">
    <header className="flex flex-wrap items-end justify-between gap-3">
      <div><p className="text-sm font-semibold tracking-wide text-emerald-400">TUS FINANZAS PERSONALES</p><h1 className="!mb-1 text-3xl font-bold tracking-tight text-white">Resumen</h1><p className="text-sm capitalize text-slate-400">{monthLabel(month)}</p></div>
      <button type="button" onClick={() => onNavigate("movimientos")} className="rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-bold text-slate-950 hover:bg-emerald-400">+ Registrar movimiento</button>
    </header>

    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <article className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 sm:col-span-2"><p className="text-sm text-slate-400">Dinero disponible</p><p className={`mt-2 text-3xl font-bold tabular-nums ${balance < 0 ? "text-rose-300" : "text-white"}`}>{formatMoney(balance)}</p><p className="mt-2 text-xs text-slate-500">Saldo inicial + ingresos − gastos</p></article>
      <article className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5"><p className="text-sm text-slate-400">Ingresos del mes</p><p className="mt-2 text-2xl font-bold text-emerald-300">{formatMoney(totals.income)}</p><p className="mt-2 text-xs text-slate-500">{monthTransactions.filter((item) => item.type === "INCOME").length} registros</p></article>
      <article className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5"><p className="text-sm text-slate-400">Gastos del mes</p><p className="mt-2 text-2xl font-bold text-rose-300">{formatMoney(totals.expense)}</p><p className="mt-2 text-xs text-slate-500">{monthTransactions.filter((item) => item.type === "EXPENSE").length} registros</p></article>
    </section>

    {/* INDICADOR ACUMULADO: SALDO INICIAL + INGRESOS FRENTE A GASTOS */}
    <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
      <div className="mb-5">
        <h2 className="!mb-1 text-lg font-semibold text-white">
          Distribución de tu dinero disponible
        </h2>
        <p className="text-xs text-slate-500">
          Acumulado desde que comenzaste a utilizar Calc-Gastos. El saldo inicial se cuenta una sola vez.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <p className="text-xs text-slate-400">Saldo inicial + ingresos</p>
          <p className="mt-1 text-xl font-bold text-emerald-300">
            {formatMoney(cumulativeDistribution.availableBase)}
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-400">Gastos acumulados</p>
          <p className="mt-1 text-xl font-bold text-rose-300">
            {formatMoney(cumulativeDistribution.expense)}
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-400">
            {cumulativeDistribution.remaining < 0 ? "Déficit acumulado" : "Dinero restante"}
          </p>
          <p className={`mt-1 text-xl font-bold ${cumulativeDistribution.remaining < 0 ? "text-rose-300" : "text-emerald-300"}`}>
            {formatMoney(cumulativeDistribution.remaining)}
          </p>
        </div>
      </div>

      {cumulativeDistribution.availableBase > 0 ? (
        <div className="mt-5 space-y-4">
          <div>
            <div className="mb-2 flex justify-between gap-3 text-sm">
              <span className="text-slate-300">Dinero gastado</span>
              <strong className="text-rose-300">
                {cumulativeDistribution.expensePercentage.toFixed(1)}%
              </strong>
            </div>
            <div
              className="h-3 overflow-hidden rounded-full bg-slate-800"
              role="progressbar"
              aria-label="Porcentaje del dinero disponible gastado"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.min(cumulativeDistribution.expensePercentage, 100)}
            >
              <div
                className="h-full rounded-full bg-rose-400"
                style={{ width: `${Math.min(cumulativeDistribution.expensePercentage, 100)}%` }}
              />
            </div>
          </div>

          <div>
            <div className="mb-2 flex justify-between gap-3 text-sm">
              <span className="text-slate-300">Dinero restante</span>
              <strong className={cumulativeDistribution.remaining < 0 ? "text-rose-300" : "text-emerald-300"}>
                {cumulativeDistribution.remainingPercentage.toFixed(1)}%
              </strong>
            </div>
            <div
              className="h-3 overflow-hidden rounded-full bg-slate-800"
              role="progressbar"
              aria-label="Porcentaje del dinero disponible restante"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.min(Math.max(cumulativeDistribution.remainingPercentage, 0), 100)}
            >
              <div
                className={`h-full rounded-full ${cumulativeDistribution.remaining < 0 ? "bg-rose-400" : "bg-emerald-400"}`}
                style={{ width: `${Math.min(Math.max(cumulativeDistribution.remainingPercentage, 0), 100)}%` }}
              />
            </div>
          </div>

          {cumulativeDistribution.remaining < 0 && (
            <p className="text-xs text-amber-300">
              Tus gastos acumulados superan el saldo inicial más los ingresos registrados.
            </p>
          )}
        </div>
      ) : (
        <p className="mt-5 rounded-xl bg-slate-800/60 p-4 text-sm text-slate-400">
          Registra un saldo inicial o un ingreso para comenzar a calcular la distribución de tu dinero.
        </p>
      )}
    </section>

    <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
      <div className="mb-5"><h2 className="!mb-1 text-lg font-semibold text-white">Evolución de tus finanzas</h2><p className="text-xs text-slate-500">Comparación de ingresos y gastos durante los últimos seis meses.</p></div>
      <IncomeExpenseTrendChart data={monthlyTrend} />
    </section>

    <section className="grid gap-5 lg:grid-cols-2">
      <article className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
        <div className="mb-4"><h2 className="!mb-1 text-lg font-semibold text-white">¿En qué gastaste?</h2><p className="text-xs text-slate-500">Distribución de gastos de este mes.</p></div>
        <ExpenseCategoryChart categories={categoryTotals} compact />
        <button type="button" onClick={() => onNavigate("estadisticas")} className="mt-5 text-sm font-semibold text-emerald-300 hover:text-emerald-200">Ver estadísticas →</button>
      </article>
      <article className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
        <div className="mb-4 flex items-center justify-between"><div><h2 className="!mb-1 text-lg font-semibold text-white">Movimientos recientes</h2><p className="text-xs text-slate-500">Tus últimos registros.</p></div><button type="button" onClick={() => onNavigate("movimientos")} className="text-sm font-semibold text-emerald-300">Ver todos →</button></div>
        <div className="divide-y divide-slate-800">{recent.map((item) => { const income = item.type === "INCOME"; const category = state.categories.find((cat) => cat.id === item.categoryId); return <div key={item.id} className="flex items-center justify-between gap-3 py-3"><div className="min-w-0"><p className="truncate text-sm font-medium text-white">{item.description}</p><p className="mt-1 text-xs text-slate-500">{item.date} · {category?.name || "Sin categoría"}</p></div><p className={`shrink-0 text-sm font-semibold ${income ? "text-emerald-300" : "text-rose-300"}`}>{income ? "+" : "−"}{formatMoney(Math.abs(item.entries?.[0]?.amountMinor || 0))}</p></div>; })}{!recent.length && <p className="py-8 text-center text-sm text-slate-500">Registra tu primer movimiento para comenzar.</p>}</div>
      </article>
    </section>

    <section className="rounded-2xl border border-slate-800 bg-gradient-to-br from-emerald-500/10 to-slate-900 p-5"><h2 className="!mb-1 text-lg font-semibold text-white">Un paso a la vez</h2><p className="text-sm text-slate-300">Registrar tus movimientos con constancia te ayudará a entender tus hábitos y tomar mejores decisiones con tu dinero.</p></section>
  </main>;
}
