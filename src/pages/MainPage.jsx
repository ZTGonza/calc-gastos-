/**
 * CONTENEDOR PRINCIPAL Y NAVEGACIÓN
 *
 * Mantiene el módulo seleccionado y decide qué página
 * se debe renderizar.
 *
 * También ejecuta el procesamiento de gastos recurrentes
 * al iniciar la aplicación y cuando cambia la fecha local.
 */

import {
  useEffect,
  useState,
  useSyncExternalStore,
} from "react";

import Footer from "../componentes/common/Footer.jsx";

import Header from "../componentes/common/Header.jsx";

import DashboardPage from "../modules/dashboard/DashboardPage.jsx";

import MovimientosPage from "../modules/transactions/MovimientosPage.jsx";

import CategoriasPage from "../modules/categories/CategoriasPage.jsx";

import ReportesPage from "../modules/reports/ReportesPage.jsx";

import DatosPage from "../modules/settings/DatosPage.jsx";

import {
  getRecurrenceRevision,
  processDueRecurringExpenses,
  subscribeToRecurringExpenses,
} from "../services/transactionService.js";

import {
  useCurrentDate,
} from "../hooks/useCurrentDate.js";

/**
 * Opciones de navegación.
 */
const NAV_ITEMS = [
  ["dashboard", "Inicio"],
  ["movimientos", "Movimientos"],
  ["categorias", "Categorías"],
  ["estadisticas", "Estadísticas"],
  ["configuracion", "Configuración"],
];

/**
 * Componente principal.
 */
export default function MainPage() {
  const [activeModule, setActiveModule] =
    useState("dashboard");

  const recurrenceRevision = useSyncExternalStore(
    subscribeToRecurringExpenses,
    getRecurrenceRevision
  );

  const currentDate = useCurrentDate();

  /**
   * FUNCIÓN FUNDAMENTAL DE AUTOMATIZACIÓN:
   *
   * Procesa las recurrencias cuando:
   * - Se inicia la aplicación.
   * - Cambia el día local.
   *
   * Si la aplicación estuvo cerrada, genera los
   * movimientos pendientes hasta la fecha actual.
   */
  useEffect(() => {
    processDueRecurringExpenses(currentDate);
  }, [currentDate]);

  /**
   * Cambia el módulo activo.
   */
  const navigate = (module) => {
    setActiveModule(module);
  };

  /**
   * Renderiza el módulo correspondiente.
   */
  const renderModule = () => {
    switch (activeModule) {
      case "movimientos":
        return <MovimientosPage />;

      case "categorias":
        return <CategoriasPage />;

      case "estadisticas":
        return <ReportesPage />;

      case "configuracion":
        return <DatosPage />;

      default:
        return (
          <DashboardPage
            onNavigate={navigate}
          />
        );
    }
  };

  return (
    <div className="
      mx-auto min-h-screen
      w-full max-w-[1600px]
      space-y-6
      p-4 sm:p-6 lg:p-8
    ">
      <Header />

      {/* NAVEGACIÓN PRINCIPAL */}
      <nav
        aria-label="Navegación principal"
        className="
          flex flex-wrap gap-2
          border-b border-slate-800
          pb-4
        "
      >
        {NAV_ITEMS.map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => navigate(key)}
            aria-current={
              activeModule === key
                ? "page"
                : undefined
            }
            className={`
              rounded-lg
              px-3 py-2
              text-sm font-semibold
              transition sm:px-4
              ${
                activeModule === key
                  ? "bg-emerald-500 text-slate-950"
                  : "border border-slate-700 text-slate-300 hover:bg-slate-800"
              }
            `}
          >
            {label}
          </button>
        ))}
      </nav>

      {/* 
        La clave cambia cuando se generan movimientos
        recurrentes. Esto actualiza el módulo visible
        con los datos recién guardados.
      */}
      <div
        key={`${activeModule}-${recurrenceRevision}`}
      >
        {renderModule()}
      </div>

      <Footer />
    </div>
  );
}