/**
 * HOOK DE FECHA LOCAL
 * Mantiene la fecha de Colombia/local del navegador sincronizada mientras la app
 * permanece abierta. Es importante para cambiar de mes sin recargar la aplicación.
 */
import { useEffect, useState } from "react";

/** Obtiene AAAA-MM-DD según la zona local, evitando desfases por UTC al cambiar de día. */
export function getLocalDateString() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

/**
 * Mantiene la fecha local actualizada incluso si la aplicación permanece abierta
 * cuando cambia el día o el mes. También refresca al volver a la pestaña.
 */
/** Hook reactivo: actualiza la fecha cada minuto y al recuperar foco/visibilidad. */
export function useCurrentDate() {
  const [currentDate, setCurrentDate] = useState(getLocalDateString);

  useEffect(() => {
    const refreshDate = () => {
      const nextDate = getLocalDateString();
      setCurrentDate((previous) => previous === nextDate ? previous : nextDate);
    };

    const intervalId = window.setInterval(refreshDate, 60_000);
    window.addEventListener("focus", refreshDate);
    document.addEventListener("visibilitychange", refreshDate);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", refreshDate);
      document.removeEventListener("visibilitychange", refreshDate);
    };
  }, []);

  return currentDate;
}
