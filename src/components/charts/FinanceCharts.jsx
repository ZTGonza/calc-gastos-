/**
 * COMPONENTES DE VISUALIZACIÓN FINANCIERA
 * Presenta los agregados calculados por analyticsService. Este archivo se ocupa
 * únicamente de la representación visual y formato de etiquetas/tooltips; no calcula
 * saldos ni altera movimientos.
 */
import { useMemo } from "react";
import {
  ArcElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
} from "chart.js";
import { Doughnut, Line } from "react-chartjs-2";
import { formatMoney } from "../../domain/money.js";
import { formatMonthLabel } from "../../services/analyticsService.js";
import { useTheme } from "../../hooks/ThemeContext.jsx";

// Registro global obligatorio de escalas, elementos y plugins usados por Line y Doughnut.
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Tooltip, Legend, Filler);

const currencyTooltip = (context) => formatMoney(context.parsed.y ?? context.parsed);

/** Gráfica de líneas: compara ingresos y gastos mes a mes. Recibe datos agregados, no movimientos crudos. */
export function IncomeExpenseTrendChart({ data }) {
  const { resolvedTheme } = useTheme();
  const chartText = resolvedTheme === "dark" ? "#9CA3AF" : "#64736A";
  const chartGrid = resolvedTheme === "dark" ? "rgba(156, 163, 175, 0.14)" : "rgba(100, 115, 106, 0.16)";
  const chartData = useMemo(() => ({
    labels: data.map((item) => formatMonthLabel(item.month)),
    datasets: [
      {
        label: "Ingresos",
        data: data.map((item) => item.income),
        borderColor: "#10b981",
        backgroundColor: "rgba(16, 185, 129, 0.12)",
        pointBackgroundColor: "#10b981",
        pointRadius: 3,
        pointHoverRadius: 5,
        borderWidth: 2,
        tension: 0.35,
        fill: false,
      },
      {
        label: "Gastos",
        data: data.map((item) => item.expense),
        borderColor: "#ef6464",
        backgroundColor: "rgba(239, 100, 100, 0.12)",
        pointBackgroundColor: "#ef6464",
        pointRadius: 3,
        pointHoverRadius: 5,
        borderWidth: 2,
        tension: 0.35,
        fill: false,
      },
    ],
  }), [data]);

  const options = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: { position: "bottom", labels: { color: chartText, usePointStyle: true, boxWidth: 7, padding: 18 } },
      tooltip: { callbacks: { label: (context) => `${context.dataset.label}: ${currencyTooltip(context)}` } },
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: chartText } },
      y: {
        beginAtZero: true,
        grid: { color: chartGrid },
        ticks: {
          color: chartText,
          callback: (value) => new Intl.NumberFormat("es-CO", { notation: "compact", maximumFractionDigits: 1 }).format(value),
        },
      },
    },
  }), [chartText, chartGrid]);

  return <div className="h-72 w-full"><Line data={chartData} options={options} /></div>;
}

/** Gráfica de dona: muestra el peso de cada categoría sobre el gasto total del periodo. */
export function ExpenseCategoryChart({ categories, compact = false }) {
  const { resolvedTheme } = useTheme();
  const chartBorder = resolvedTheme === "dark" ? "#222A31" : "#FFFFFF";
  const total = categories.reduce((sum, item) => sum + item.amount, 0);
  const chartData = useMemo(() => ({
    labels: categories.map((item) => item.name),
    datasets: [{
      data: categories.map((item) => item.amount),
      backgroundColor: categories.map((item) => item.color),
      borderColor: chartBorder,
      borderWidth: 3,
      hoverOffset: 7,
    }],
  }), [categories, chartBorder]);
  const options = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    cutout: "66%",
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: (context) => `${context.label}: ${formatMoney(context.parsed)}` } },
    },
  }), []);

  if (!categories.length || total <= 0) {
    return <p className="rounded-xl border border-dashed border-slate-700 p-8 text-center text-sm text-slate-500">Aún no hay gastos registrados en este periodo.</p>;
  }

  return <div className={compact ? "grid items-center gap-5 sm:grid-cols-[minmax(130px,0.8fr)_1.2fr]" : "grid items-center gap-6 md:grid-cols-[minmax(180px,0.9fr)_1.1fr]"}>
    <div className="relative mx-auto h-52 w-full max-w-[260px]">
      <Doughnut data={chartData} options={options} />
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xs text-slate-400">Total de gastos</span>
        <strong className="mt-1 max-w-[85%] truncate text-center text-base text-white">{formatMoney(total)}</strong>
      </div>
    </div>
    <div className="max-h-64 space-y-3 overflow-y-auto pr-1">
      {categories.map((item) => (
        <div key={item.id} className="flex items-center justify-between gap-3 text-sm">
          <div className="flex min-w-0 items-center gap-2">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
            <span className="truncate text-slate-300">{item.name}</span>
          </div>
          <div className="shrink-0 text-right">
            <strong className="block text-white">{formatMoney(item.amount)}</strong>
            <span className="text-xs text-slate-500">{((item.amount / total) * 100).toFixed(1)}%</span>
          </div>
        </div>
      ))}
    </div>
  </div>;
}
