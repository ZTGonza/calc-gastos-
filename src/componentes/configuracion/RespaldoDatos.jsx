/**
 * INTERFAZ DE RESPALDO Y RESTAURACIÓN
 * Solicita confirmación antes de reemplazar datos locales y comunica el resultado
 * al usuario. La serialización/importación real está en backupService.
 */
import { useRef, useState } from "react";
import { downloadBackup, restoreBackup } from "../../services/backupService.js";

export default function RespaldoDatos({ onRestored }) {
  const inputRef = useRef(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  /** FUNCIÓN DE SEGURIDAD: exige confirmación antes de sustituir el estado local por un respaldo. */
  const handleRestore = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setMessage("");
    setError("");
    try {
      const confirmed = window.confirm("Restaurar este respaldo reemplazará los datos locales actuales. ¿Deseas continuar?");
      if (!confirmed) return;
      await restoreBackup(file);
      setMessage("Respaldo restaurado correctamente.");
      onRestored?.();
    } catch (restoreError) {
      setError(restoreError.message || "No se pudo restaurar el respaldo.");
    } finally {
      event.target.value = "";
    }
  };

  return (
    <section className="rounded-xl border border-slate-700 bg-slate-900 p-5 space-y-3">
      <div>
        <h2 className="text-lg font-bold text-white">Respaldo de información</h2>
        <p className="text-sm text-slate-400">Exporta tus datos o restaura una copia de seguridad JSON.</p>
      </div>
      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={downloadBackup} className="rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white hover:bg-emerald-700">
          Descargar respaldo
        </button>
        <button type="button" onClick={() => inputRef.current?.click()} className="rounded-lg border border-slate-600 px-4 py-2 font-semibold text-slate-200 hover:bg-slate-800">
          Restaurar respaldo
        </button>
        <input ref={inputRef} type="file" accept="application/json,.json" className="hidden" onChange={handleRestore} />
      </div>
      {message && <p role="status" className="text-sm text-emerald-400">{message}</p>}
      {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
    </section>
  );
}
