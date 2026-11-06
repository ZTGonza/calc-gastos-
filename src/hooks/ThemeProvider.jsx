/**
 * PROVEEDOR DE APARIENCIA
 * Sincroniza la preferencia guardada, el tema del sistema operativo y el atributo HTML.
 * Se mantiene separado del hook para respetar las reglas de Fast Refresh de Vite.
 */
import { useEffect, useMemo, useState } from "react";
import { ThemeContext } from "./ThemeContext.jsx";

const STORAGE_KEY = "calc-gastos-theme";
const VALID_PREFERENCES = ["system", "light", "dark"];

/** Lee una preferencia válida sin confiar ciegamente en el contenido de localStorage. */
function readStoredPreference() {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return VALID_PREFERENCES.includes(stored) ? stored : "system";
  } catch {
    // Si el navegador bloquea el almacenamiento, la aplicación sigue usando el tema del sistema.
    return "system";
  }
}

/** Resuelve la preferencia elegida a un tema concreto que el navegador puede representar. */
function resolveTheme(preference) {
  if (preference !== "system") return preference;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/** Proveedor global: sincroniza estado React, atributo HTML, preferencia del SO y persistencia. */
export function ThemeProvider({ children }) {
  const [preference, setPreference] = useState(readStoredPreference);
  const [systemTheme, setSystemTheme] = useState(() => resolveTheme("system"));
  const resolvedTheme = preference === "system" ? systemTheme : preference;

  useEffect(() => {
    const media = window.matchMedia?.("(prefers-color-scheme: dark)");
    if (!media) return undefined;
    const handleChange = (event) => setSystemTheme(event.matches ? "dark" : "light");
    media.addEventListener?.("change", handleChange);
    return () => media.removeEventListener?.("change", handleChange);
  }, []);

  useEffect(() => {
    // Este atributo activa las variables del tema en todos los módulos simultáneamente.
    document.documentElement.dataset.theme = resolvedTheme;
    document.documentElement.dataset.themePreference = preference;
    document.documentElement.style.colorScheme = resolvedTheme;
    // Actualiza el color de la barra del navegador en dispositivos compatibles.
    const themeColor = document.querySelector('meta[name="theme-color"]');
    if (themeColor) themeColor.content = resolvedTheme === "dark" ? "#15191e" : "#f5f7f6";
    try {
      window.localStorage.setItem(STORAGE_KEY, preference);
    } catch {
      // La apariencia continúa funcionando durante la sesión aunque no se pueda persistir.
    }
  }, [preference, resolvedTheme]);

  const value = useMemo(() => ({ preference, resolvedTheme, setPreference }), [preference, resolvedTheme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
