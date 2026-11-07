/**
 * MÓDULO MOVIMIENTOS
 *
 * Permite:
 * - Registrar ingresos y gastos.
 * - Crear gastos recurrentes.
 * - Consultar el historial.
 * - Buscar y filtrar movimientos.
 * - Editar movimientos normales.
 * - Detener recurrencias mediante eliminación.
 *
 * La lógica de negocio se delega a transactionService.
 */

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  createTransaction,
  createRecurringExpense,
  deleteTransaction,
  listTransactions,
  updateTransaction,
} from "../../services/transactionService.js";

import {
  formatMoney,
  formatThousandsInput,
  parseThousandsInput,
} from "../../domain/money.js";

import { useCurrentDate } from "../../hooks/useCurrentDate.js";

import { storageService } from "../../services/storageService.js";

/**
 * Valores iniciales del formulario.
 */
const EMPTY = {
  type: "EXPENSE",
  description: "",
  amount: "",
  date: "",
  categoryId: "",
  paymentMethod: "CASH",
  frequency: "ONCE",
  notes: "",
};

/**
 * Clase reutilizable para los campos del formulario.
 */
const inputClass = `
  w-full rounded-lg
  border border-slate-700
  bg-slate-950
  px-3 py-2.5
  text-white
  outline-none
  focus:border-emerald-500
`;

/**
 * Página principal de movimientos.
 */
export default function MovimientosPage() {
  const currentDate = useCurrentDate();

  const [revision, setRevision] = useState(0);

  const [form, setForm] = useState(() => ({
    ...EMPTY,
    date: currentDate,
  }));

  const [editingId, setEditingId] = useState(null);

  const previousCurrentDate = useRef(currentDate);

  const [filterType, setFilterType] = useState("ALL");

  const [filterCategory, setFilterCategory] =
    useState("ALL");

  const [period, setPeriod] = useState("THIS_MONTH");

  const [from, setFrom] = useState("");

  const [to, setTo] = useState("");

  const [search, setSearch] = useState("");

  const [error, setError] = useState("");

  const [success, setSuccess] = useState("");

  /**
   * Actualiza la fecha del formulario cuando cambia el día.
   * No modifica una fecha que el usuario esté editando.
   */
  useEffect(() => {
    if (
      !editingId &&
      form.date === previousCurrentDate.current
    ) {
      setForm((current) => ({
        ...current,
        date: currentDate,
      }));
    }

    previousCurrentDate.current = currentDate;
  }, [currentDate, editingId, form.date]);

  /**
   * Recupera el estado local cuando cambia revision.
   */
  const state = useMemo(() => {
    void revision;

    return storageService.getState();
  }, [revision]);

  const categories = state.categories.filter(
    (item) => item.active !== false
  );

  const availableCategories = categories.filter(
    (item) => item.type === form.type
  );

  /**
   * Recupera y ordena los movimientos.
   */
  const allTransactions = useMemo(() => {
    void revision;

    return listTransactions();
  }, [revision]);

  /**
   * Aplica los filtros del historial.
   */
  const filtered = useMemo(() => {
    const current = currentDate;

    const month = current.slice(0, 7);

    const previousDate = new Date(
      `${month}-01T00:00:00`
    );

    previousDate.setMonth(
      previousDate.getMonth() - 1
    );

    const previousMonth =
      `${previousDate.getFullYear()}-${String(
        previousDate.getMonth() + 1
      ).padStart(2, "0")}`;

    return allTransactions.filter((item) => {
      const periodMatch =
        period === "ALL" ||

        (
          period === "THIS_MONTH" &&
          item.date.startsWith(month)
        ) ||

        (
          period === "LAST_MONTH" &&
          item.date.startsWith(previousMonth)
        ) ||

        (
          period === "THIS_YEAR" &&
          item.date.startsWith(current.slice(0, 4))
        ) ||

        (
          period === "CUSTOM" &&
          (!from || item.date >= from) &&
          (!to || item.date <= to)
        );

      return (
        periodMatch &&
        (
          filterType === "ALL" ||
          item.type === filterType
        ) &&
        (
          filterCategory === "ALL" ||
          item.categoryId === filterCategory
        ) &&
        `${item.description} ${item.notes || ""}`
          .toLowerCase()
          .includes(search.toLowerCase())
      );
    });
  }, [
    allTransactions,
    period,
    from,
    to,
    filterType,
    filterCategory,
    search,
    currentDate,
  ]);

  /**
   * Fuerza la actualización de la interfaz
   * después de guardar o eliminar información.
   */
  const refresh = () => {
    setRevision((value) => value + 1);
  };

  /**
   * Obtiene el nombre de una categoría.
   */
  const categoryName = (id) =>
    categories.find(
      (item) => item.id === id
    )?.name || "Sin categoría";

  /**
   * FUNCIÓN CLAVE:
   *
   * Decide si se registra un movimiento normal
   * o un gasto recurrente.
   */
  const submit = (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    try {
      const payload = {
        ...form,
        amount: parseThousandsInput(form.amount),
      };

      if (editingId && payload.frequency !== "ONCE") {
        /**
         * Si se cambia un movimiento normal a recurrente,
         * se reemplaza por un nuevo gasto recurrente.
         */
        deleteTransaction(editingId);

        createRecurringExpense(payload);

        setSuccess(
          "Movimiento reemplazado por un gasto recurrente."
        );
      } else if (editingId) {
        updateTransaction(editingId, payload);

        setSuccess("Movimiento actualizado.");
      } else if (
        payload.type === "EXPENSE" &&
        payload.frequency !== "ONCE"
      ) {
        createRecurringExpense(payload);

        setSuccess("Gasto recurrente registrado.");
      } else {
        createTransaction(payload);

        setSuccess("Movimiento registrado.");
      }

      setEditingId(null);

      setForm({
        ...EMPTY,
        date: currentDate,
      });

      refresh();
    } catch (err) {
      setError(
        err.message ||
        "No se pudo guardar el movimiento."
      );
    }
  };

  /**
   * Carga un movimiento normal en el formulario.
   */
  const edit = (item) => {
    setEditingId(item.id);

    setForm({
      type: item.type,
      description: item.description,

      amount: formatThousandsInput(
        Math.abs(item.entries[0].amountMinor)
      ),

      date: item.date,

      categoryId: item.categoryId || "",

      paymentMethod: item.paymentMethod || "CASH",

      frequency: "ONCE",

      notes: item.notes || "",
    });

    setError("");
    setSuccess("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  /**
   * Elimina un movimiento.
   *
   * Si pertenece a una recurrencia activa,
   * también detiene las próximas apariciones.
   */
  const remove = (item) => {
    const recurringActive = Boolean(
      item.recurringRuleId &&
      storageService
        .getState()
        .recurringRules
        ?.some(
          (rule) => rule.id === item.recurringRuleId
        )
    );

    const confirmation = recurringActive
      ? `¿Eliminar el gasto recurrente "${item.description}"? Se detendrán sus próximas repeticiones, pero se conservarán los demás registros históricos.`
      : `¿Eliminar el movimiento "${item.description}"?`;

    if (!window.confirm(confirmation)) {
      return;
    }

    try {
      deleteTransaction(item.id);

      setSuccess(
        recurringActive
          ? "Recurrencia eliminada. Se conservaron los demás registros históricos."
          : "Movimiento eliminado."
      );

      setError("");

      refresh();
    } catch (err) {
      setError(err.message);
    }
  };

  /**
   * Calcula los totales del historial filtrado.
   */
  const totals = filtered.reduce(
    (acc, item) => {
      if (item.type === "INCOME") {
        acc.income += item.entries[0].amountMinor;
      } else {
        acc.expense += Math.abs(
          item.entries[0].amountMinor
        );
      }

      return acc;
    },
    {
      income: 0,
      expense: 0,
    }
  );

  return (
    <main className="space-y-6">

      {/* ENCABEZADO */}
      <header>
        <p className="
          text-sm font-semibold
          tracking-wide text-emerald-400
        ">
          TUS FINANZAS PERSONALES
        </p>

        <h1 className="
          !mb-1 text-3xl
          font-bold text-white
        ">
          Movimientos
        </h1>

        <p className="text-sm text-slate-400">
          Registra fácilmente el dinero que recibes
          y el que gastas.
        </p>
      </header>

      {/* RESUMEN DE MOVIMIENTOS */}
      <section className="grid gap-3 sm:grid-cols-2">

        <article className="
          rounded-2xl border border-slate-800
          bg-slate-900/80 p-4
        ">
          <p className="text-sm text-slate-400">
            Ingresos del filtro
          </p>

          <p className="
            mt-2 text-2xl
            font-bold text-emerald-400
          ">
            {formatMoney(totals.income)}
          </p>
        </article>

        <article className="
          rounded-2xl border border-slate-800
          bg-slate-900/80 p-4
        ">
          <p className="text-sm text-slate-400">
            Gastos del filtro
          </p>

          <p className="
            mt-2 text-2xl
            font-bold text-rose-400
          ">
            {formatMoney(totals.expense)}
          </p>
        </article>

      </section>

      <section className="
        grid items-start gap-6
        xl:grid-cols-[minmax(320px,0.85fr)_minmax(0,1.15fr)]
      ">

        {/* FORMULARIO */}
        <form
          onSubmit={submit}
          className="
            rounded-2xl
            border border-slate-800
            bg-slate-900/90
            p-5
          "
        >

          <div className="mb-5">
            <h2 className="
              !mb-1 text-xl
              font-semibold text-white
            ">
              {editingId
                ? "Editar movimiento"
                : "Nuevo movimiento"}
            </h2>

            <p className="text-xs text-slate-400">
              Todos los importes se registran en pesos colombianos.
            </p>
          </div>

          {/* TIPO DE MOVIMIENTO */}
          <div className="
            mb-4 grid grid-cols-2 gap-2
          ">
            {[
              {
                value: "EXPENSE",
                label: "Gasto",
              },
              {
                value: "INCOME",
                label: "Ingreso",
              },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() =>
                  setForm((current) => ({
                    ...current,
                    type: option.value,
                    categoryId: "",

                    frequency:
                      option.value === "INCOME"
                        ? "ONCE"
                        : current.frequency,
                  }))
                }
                className={`
                  rounded-lg border
                  px-3 py-3
                  text-sm font-semibold
                  ${
                    form.type === option.value
                      ? "border-emerald-500 bg-emerald-500/10 text-emerald-300"
                      : "border-slate-700 text-slate-400"
                  }
                `}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="space-y-4">

            {/* FRECUENCIA: SOLO APARECE PARA GASTOS */}
            {form.type === "EXPENSE" && (
              <label className="
                block space-y-1.5
                text-sm text-slate-300
              ">
                Frecuencia

                <select
                  value={form.frequency}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      frequency: event.target.value,
                    }))
                  }
                  className={inputClass}
                >
                  <option value="ONCE">
                    Hoy (una sola vez)
                  </option>

                  <option value="WEEKLY">
                    Semanal
                  </option>

                  <option value="MONTHLY">
                    Mensual
                  </option>
                </select>

                <span className="
                  block text-xs text-slate-500
                ">
                  Los gastos semanales y mensuales
                  se registrarán automáticamente.
                  Para cambiar sus datos, elimina
                  la recurrencia y crea una nueva.
                </span>
              </label>
            )}

            {/* DESCRIPCIÓN */}
            <label className="
              block space-y-1.5
              text-sm text-slate-300
            ">
              Descripción

              <input
                required
                maxLength={90}
                value={form.description}
                onChange={(event) =>
                  setForm({
                    ...form,
                    description: event.target.value,
                  })
                }
                placeholder="Ej. Almuerzo, salario, transporte..."
                className={inputClass}
              />
            </label>

            {/* VALOR */}
            <label className="
              block space-y-1.5
              text-sm text-slate-300
            ">
              Valor (COP)

              <input
                required
                type="text"
                inputMode="numeric"
                autoComplete="off"
                value={form.amount}
                onChange={(event) =>
                  setForm({
                    ...form,
                    amount: formatThousandsInput(
                      event.target.value
                    ),
                  })
                }
                placeholder="10.000"
                className={inputClass}
              />
            </label>

            {/* CATEGORÍA */}
            <label className="
              block space-y-1.5
              text-sm text-slate-300
            ">
              Categoría

              <select
                required
                value={form.categoryId}
                onChange={(event) =>
                  setForm({
                    ...form,
                    categoryId: event.target.value,
                  })
                }
                className={inputClass}
              >
                <option value="">
                  Selecciona una categoría
                </option>

                {availableCategories.map((item) => (
                  <option
                    key={item.id}
                    value={item.id}
                  >
                    {item.name}
                  </option>
                ))}
              </select>
            </label>

            {/* FECHA */}
            <label className="
              block space-y-1.5
              text-sm text-slate-300
            ">
              Fecha

              <input
                required
                type="date"
                value={form.date}
                onChange={(event) =>
                  setForm({
                    ...form,
                    date: event.target.value,
                  })
                }
                className={inputClass}
              />
            </label>

            {/* MÉTODO DE PAGO */}
            <label className="
              block space-y-1.5
              text-sm text-slate-300
            ">
              Método de pago

              <select
                value={form.paymentMethod}
                onChange={(event) =>
                  setForm({
                    ...form,
                    paymentMethod: event.target.value,
                  })
                }
                className={inputClass}
              >
                <option value="CASH">
                  Efectivo
                </option>

                <option value="TRANSFER">
                  Transferencia
                </option>
              </select>
            </label>

            {/* NOTAS */}
            <label className="
              block space-y-1.5
              text-sm text-slate-300
            ">
              Nota (opcional)

              <textarea
                rows="2"
                maxLength={300}
                value={form.notes}
                onChange={(event) =>
                  setForm({
                    ...form,
                    notes: event.target.value,
                  })
                }
                placeholder="Un detalle adicional..."
                className={inputClass}
              />
            </label>

          </div>

          {/* MENSAJES DE ESTADO */}
          {error && (
            <p
              role="alert"
              className="
                mt-4 rounded-lg
                border border-rose-500/30
                bg-rose-500/10
                p-3 text-sm text-rose-300
              "
            >
              {error}
            </p>
          )}

          {success && (
            <p
              role="status"
              className="
                mt-4 rounded-lg
                border border-emerald-500/30
                bg-emerald-500/10
                p-3 text-sm text-emerald-300
              "
            >
              {success}
            </p>
          )}

          {/* BOTONES DEL FORMULARIO */}
          <div className="mt-5 flex gap-2">

            <button
              type="submit"
              className="
                flex-1 rounded-xl
                bg-emerald-500
                px-4 py-3
                font-bold text-slate-950
                hover:bg-emerald-400
              "
            >
              {editingId
                ? "Guardar cambios"
                : `Registrar ${
                    form.type === "EXPENSE"
                      ? "gasto"
                      : "ingreso"
                  }`}
            </button>

            {editingId && (
              <button
                type="button"
                onClick={() => {
                  setEditingId(null);

                  setForm({
                    ...EMPTY,
                    date: currentDate,
                  });
                }}
                className="
                  rounded-xl
                  border border-slate-700
                  px-4 py-3
                  text-sm text-slate-300
                "
              >
                Cancelar
              </button>
            )}

          </div>
        </form>

        {/* HISTORIAL */}
        <section className="
          overflow-hidden
          rounded-2xl
          border border-slate-800
          bg-slate-900/80
        ">

          <div className="
            border-b border-slate-800
            p-5
          ">
            <h2 className="
              !mb-1 text-lg
              font-semibold text-white
            ">
              Historial
            </h2>

            <p className="text-xs text-slate-500">
              Consulta, filtra y modifica tus registros.
            </p>

            {/* FILTROS */}
            <div className="
              mt-4 grid gap-2 sm:grid-cols-2
            ">
              <input
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Buscar descripción..."
                className={inputClass}
              />

              <select
                value={period}
                onChange={(event) =>
                  setPeriod(event.target.value)
                }
                className={inputClass}
              >
                <option value="THIS_MONTH">
                  Este mes
                </option>

                <option value="LAST_MONTH">
                  Mes anterior
                </option>

                <option value="THIS_YEAR">
                  Este año
                </option>

                <option value="ALL">
                  Todo el historial
                </option>

                <option value="CUSTOM">
                  Periodo personalizado
                </option>
              </select>

              <select
                value={filterType}
                onChange={(event) =>
                  setFilterType(event.target.value)
                }
                className={inputClass}
              >
                <option value="ALL">
                  Ingresos y gastos
                </option>

                <option value="EXPENSE">
                  Solo gastos
                </option>

                <option value="INCOME">
                  Solo ingresos
                </option>
              </select>

              <select
                value={filterCategory}
                onChange={(event) =>
                  setFilterCategory(event.target.value)
                }
                className={inputClass}
              >
                <option value="ALL">
                  Todas las categorías
                </option>

                {categories.map((item) => (
                  <option
                    key={item.id}
                    value={item.id}
                  >
                    {item.name}
                  </option>
                ))}
              </select>
            </div>

            {period === "CUSTOM" && (
              <div className="
                mt-2 grid grid-cols-2 gap-2
              ">
                <input
                  type="date"
                  value={from}
                  onChange={(event) =>
                    setFrom(event.target.value)
                  }
                  className={inputClass}
                />

                <input
                  type="date"
                  value={to}
                  onChange={(event) =>
                    setTo(event.target.value)
                  }
                  className={inputClass}
                />
              </div>
            )}
          </div>

          {/* LISTADO DE MOVIMIENTOS */}
          <div className="
            max-h-[760px]
            overflow-y-auto
            divide-y divide-slate-800
          ">
            {filtered.map((item) => {
              const income = item.type === "INCOME";

              const recurringActive = Boolean(
                item.recurringRuleId &&
                state.recurringRules?.some(
                  (rule) =>
                    rule.id === item.recurringRuleId
                )
              );

              return (
                <article
                  key={item.id}
                  className="
                    flex flex-wrap
                    items-center justify-between
                    gap-3 p-4
                  "
                >
                  <div className="
                    min-w-0 flex-1
                  ">
                    <div className="
                      flex flex-wrap
                      items-center gap-2
                    ">
                      <p className="
                        truncate font-medium text-white
                      ">
                        {item.description}
                      </p>

                      <span
                        className={`
                          rounded-full px-2 py-0.5
                          text-[10px] font-semibold
                          ${
                            income
                              ? "bg-emerald-400/10 text-emerald-300"
                              : "bg-rose-400/10 text-rose-300"
                          }
                        `}
                      >
                        {income ? "Ingreso" : "Gasto"}
                      </span>

                      {item.recurringRuleId && (
                        <span className="
                          rounded-full
                          bg-amber-500/10
                          px-2 py-0.5
                          text-[10px] font-semibold
                          text-amber-300
                        ">
                          {item.recurrenceFrequency === "WEEKLY"
                            ? "Semanal"
                            : "Mensual"}
                        </span>
                      )}
                    </div>

                    <p className="
                      mt-1 text-xs text-slate-500
                    ">
                      {item.date}
                      {" · "}
                      {categoryName(item.categoryId)}
                      {" · "}
                      {item.paymentMethod === "TRANSFER"
                        ? "Transferencia"
                        : "Efectivo"}
                    </p>
                  </div>

                  <div className="text-right">
                    <p
                      className={`
                        font-semibold tabular-nums
                        ${
                          income
                            ? "text-emerald-300"
                            : "text-rose-300"
                        }
                      `}
                    >
                      {income ? "+" : "−"}
                      {formatMoney(
                        Math.abs(
                          item.entries[0].amountMinor
                        )
                      )}
                    </p>

                    <div className="
                      mt-1 flex justify-end
                      gap-3 text-xs
                    ">
                      {!recurringActive && (
                        <button
                          type="button"
                          onClick={() => edit(item)}
                          className="
                            text-emerald-300
                            hover:text-emerald-200
                          "
                        >
                          Editar
                        </button>
                      )}

                      {recurringActive && (
                        <span className="text-slate-500">
                          Elimina para detener
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() => remove(item)}
                        className="
                          text-rose-300
                          hover:text-rose-200
                        "
                      >
                        {recurringActive
                          ? "Eliminar recurrencia"
                          : "Eliminar"}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}

            {!filtered.length && (
              <p className="
                p-10 text-center
                text-sm text-slate-500
              ">
                No hay movimientos para estos filtros.
              </p>
            )}
          </div>
        </section>
      </section>
    </main>
  );
}