/**
 * CONTROL DE APARIENCIA
 * Selector reutilizable de tema. La lógica y persistencia pertenecen a ThemeContext;
 * este componente solamente presenta la preferencia y comunica la selección.
 */
import { useTheme } from "../../hooks/ThemeContext.jsx";

export default function ThemeControl({ compact = false }) {
  const { preference, setPreference } = useTheme();

  return (
    <label className={`flex ${compact ? "items-center gap-3" : "flex-col gap-2"} text-sm`}>
      <span className="font-medium text-slate-300">Apariencia</span>
      <select
        aria-label="Seleccionar apariencia"
        value={preference}
        onChange={(event) => setPreference(event.target.value)}
        className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none transition focus:border-emerald-500"
      >
        <option value="system">Automática (según dispositivo)</option>
        <option value="light">Clara</option>
        <option value="dark">Oscura</option>
      </select>
    </label>
  );
}
