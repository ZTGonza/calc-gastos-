/**
 * MÓDULO CONFIGURACIÓN
 *
 * Permite establecer el saldo inicial, el salario base mensual,
 * consultar el estado general y gestionar respaldos locales.
 */

import { useState } from "react";

import RespaldoDatos from "../../componentes/configuracion/RespaldoDatos.jsx";
import { storageService } from "../../services/storageService.js";

import {
  updateInitialBalance,
  updateMonthlyBaseSalary,
  getAccountBalance,
} from "../../services/accountService.js";

import { formatMoney } from "../../domain/money.js";
import ThemeControl from "../../components/ui/ThemeControl.jsx";

export default function DatosPage() {
  const [, setRevision] = useState(0);

  const state = storageService.getState();
  const account = state.accounts[0];

  const [initialBalance, setInitialBalance] = useState(
    String(account?.initialBalanceMinor ?? 0)
  );

  const [initialDate, setInitialDate] = useState(
    state.profile.initialBalanceDate ||
      new Date().toISOString().slice(0, 10)
  );

  const [monthlyBaseSalary, setMonthlyBaseSalary] = useState(
    String(state.profile.monthlyBaseSalaryMinor ?? 0)
  );

  const [salaryMessage, setSalaryMessage] = useState("");
  const [message, setMessage] = useState("");

  const refresh = () =>
    setRevision((value) => value + 1);

  /**
   * Guarda el saldo inicial.
   */
  const saveInitial = (event) => {
    event.preventDefault();

    try {
      updateInitialBalance(
        Number(initialBalance),
        initialDate
      );

      setMessage("Saldo inicial actualizado.");
      refresh();
    } catch (error) {
      setMessage(error.message);
    }
  };

  /**
   * Guarda el salario habitual como dato de referencia.
   * No crea un movimiento de ingreso.
   */
  const saveSalary = (event) => {
    event.preventDefault();

    try {
      updateMonthlyBaseSalary(
        Number(monthlyBaseSalary)
      );

      setSalaryMessage(
        "Salario base mensual actualizado."
      );

      refresh();
    } catch (error) {
      setSalaryMessage(error.message);
    }
  };

  const counts = [
    ["Movimientos", state.transactions.length],
    ["Categorías", state.categories.length],
  ];

  return (
    <main className="space-y-6">
      <header>
        <p className="text-sm font-semibold tracking-wide text-emerald-400">
          PREFERENCIAS PERSONALES
        </p>

        <h1 className="!mb-1 text-3xl font-bold text-white">
          Configuración
        </h1>

        <p className="text-sm text-slate-400">
          Administra tu saldo inicial y protege tus datos.
        </p>
      </header>

      {/* APARIENCIA */}
      <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
        <h2 className="!mb-1 text-lg font-semibold text-white">
          Preferencias de apariencia
        </h2>

        <p className="mb-4 text-sm text-slate-400">
          Personaliza Calc-Gastos. La opción automática sigue
          el tema configurado en tu dispositivo.
        </p>

        <ThemeControl />
      </section>

      {/* RESUMEN DE DATOS */}
      <section className="grid gap-3 sm:grid-cols-2">
        {counts.map(([label, value]) => (
          <article
            key={label}
            className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4"
          >
            <p className="text-xs text-slate-400">
              {label}
            </p>

            <p className="mt-2 text-2xl font-bold text-white">
              {value}
            </p>
          </article>
        ))}
      </section>

      {/* SALDO INICIAL */}
      <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
        <h2 className="!mb-1 text-lg font-semibold text-white">
          Saldo inicial
        </h2>

        <p className="mb-4 text-sm text-slate-400">
          Indica cuánto dinero tenías cuando comenzaste a utilizar
          Calc-Gastos. Los movimientos registrados se sumarán o
          restarán a este valor.
        </p>

        <form
          onSubmit={saveInitial}
          className="grid gap-4 sm:grid-cols-2"
        >
          <label className="space-y-1 text-sm text-slate-300">
            Saldo inicial (COP)

            <input
              type="number"
              min="0"
              step="1"
              required
              value={initialBalance}
              onChange={(event) =>
                setInitialBalance(event.target.value)
              }
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-white"
            />
          </label>

          <label className="space-y-1 text-sm text-slate-300">
            Fecha de inicio

            <input
              type="date"
              required
              value={initialDate}
              onChange={(event) =>
                setInitialDate(event.target.value)
              }
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-white"
            />
          </label>

          <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
            <button
              type="submit"
              className="rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-bold text-slate-950 hover:bg-emerald-400"
            >
              Guardar saldo inicial
            </button>

            <span className="text-sm text-slate-400">
              Saldo actual:{" "}
              <strong className="text-white">
                {formatMoney(getAccountBalance())}
              </strong>
            </span>
          </div>

          {message && (
            <p
              role="status"
              className="text-sm text-emerald-300 sm:col-span-2"
            >
              {message}
            </p>
          )}
        </form>
      </section>

      {/* NUEVO CAMPO: SALARIO BASE */}
      <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
        <h2 className="!mb-1 text-lg font-semibold text-white">
          Salario base mensual
        </h2>

        <p className="mb-4 text-sm text-slate-400">
          Configura tu ingreso habitual. Se utiliza únicamente
          como referencia para comparar tus gastos del mes;
          no se registra como un ingreso ni modifica tu saldo.
        </p>

        <form
          onSubmit={saveSalary}
          className="grid gap-4 sm:grid-cols-2"
        >
          <label className="space-y-1 text-sm text-slate-300">
            Salario base mensual (COP)

            <input
              type="number"
              min="0"
              step="1"
              required
              value={monthlyBaseSalary}
              onChange={(event) =>
                setMonthlyBaseSalary(event.target.value)
              }
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-white"
            />
          </label>

          <div className="flex items-end">
            <button
              type="submit"
              className="rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-bold text-slate-950 hover:bg-emerald-400"
            >
              Guardar salario base
            </button>
          </div>

          {salaryMessage && (
            <p
              role="status"
              className="text-sm text-emerald-300 sm:col-span-2"
            >
              {salaryMessage}
            </p>
          )}
        </form>
      </section>

      {/* RESPALDOS */}
      <RespaldoDatos
        onRestored={() => {
          const restored = storageService.getState();

          setInitialBalance(
            String(
              restored.accounts[0]?.initialBalanceMinor ?? 0
            )
          );

          setInitialDate(
            restored.profile.initialBalanceDate ||
              new Date().toISOString().slice(0, 10)
          );

          setMonthlyBaseSalary(
            String(
              restored.profile.monthlyBaseSalaryMinor ?? 0
            )
          );

          refresh();
        }}
      />

      {/* PROTECCIÓN DE DATOS */}
      <section className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5">
        <h2 className="!mb-2 text-base font-semibold text-amber-200">
          Protege tu información
        </h2>

        <ul className="list-disc space-y-2 pl-5 text-sm text-slate-300">
          <li>
            Los datos se guardan en este navegador y dispositivo.
          </li>

          <li>
            Si limpias los datos del navegador o cambias de
            dispositivo, puedes perder tus registros.
          </li>

          <li>
            Descarga respaldos periódicamente y guárdalos
            en un lugar seguro.
          </li>

          <li>
            Restaurar un respaldo reemplaza los datos locales
            actuales.
          </li>
        </ul>
      </section>

      <p className="text-center text-xs text-slate-600">
        Calc-Gastos funciona localmente. No envía tus movimientos
        a servidores remotos.
      </p>
    </main>
  );
}